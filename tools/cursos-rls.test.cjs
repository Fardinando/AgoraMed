const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const cursoGratis = '36c4246d-1f58-424b-ad07-c494ad7d4bd1';
const uid = '11111111-1111-4111-8111-111111111111';
const novoUid = '22222222-2222-4222-8222-222222222222';
const pagoId = '33333333-3333-4333-8333-333333333333';
const modId = '44444444-4444-4444-8444-444444444444';
const aulaId = '55555555-5555-4555-8555-555555555555';
const pagoMod = '66666666-6666-4666-8666-666666666666';
const pagoAula = '77777777-7777-4777-8777-777777777777';
const raiz = join(__dirname, '..');

test('migração conserva dados e RLS distingue gratuito, matrícula e bloqueio', async t => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'postgres') $$;
      create table storage.buckets (id text primary key,name text,public boolean);
      create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
    `);
    const schema = readFileSync(join(raiz,'supabase/schema.sql'),'utf8').replace('create extension if not exists pgcrypto;','');
    await db.exec(schema);
    await db.exec("create function public.excluir_usuario_completo(uuid) returns jsonb language sql security definer as $$ select '{}'::jsonb $$;");
    await db.query('insert into auth.users(id,email) values ($1,$2)',[uid,'antigo@example.invalid']);
    await db.query('update public.perfis set liberado=true where id=$1',[uid]);
    await db.query('insert into public.cursos(id,titulo) values ($1,$2)',[cursoGratis,'DETERMINAÇÃO DE MORTE ENCEFÁLICA']);
    await db.query('insert into public.modulos(id,curso_id,titulo) values ($1,$2,$3)',[modId,cursoGratis,'Módulo preservado']);
    await db.query('insert into public.aulas(id,modulo_id,titulo,youtube_id) values ($1,$2,$3,$4)',[aulaId,modId,'Aula preservada','video-original']);
    await db.query('insert into public.matriculas(usuario_id,curso_id) values ($1,$2)',[uid,cursoGratis]);
    await db.query('insert into public.progresso(usuario_id,aula_id) values ($1,$2)',[uid,aulaId]);
    const tabelas=['perfis','cursos','modulos','aulas','matriculas','progresso','materiais','comentarios'];
    const antes={};for(const tabela of tabelas) antes[tabela]=(await db.query(`select * from public.${tabela}`)).rows;
    await db.exec('begin');
    await db.exec(readFileSync(join(raiz,'supabase/migrations/20261025225237_cursos_gratuitos_pagos.sql'),'utf8'));
    await db.exec('commit');
    await t.test('RPC antiga de exclusão não pode ser executada por visitantes ou alunos',async()=>{
      const p=(await db.query("select has_function_privilege('anon','public.excluir_usuario_completo(uuid)','EXECUTE') as anon,has_function_privilege('authenticated','public.excluir_usuario_completo(uuid)','EXECUTE') as aluno")).rows[0];
      assert.equal(p.anon,false);assert.equal(p.aluno,false);
    });
    await t.test('IDs, conteúdo, matrículas e progresso são preservados',async()=>{
      for(const tabela of tabelas){
        let linhas=(await db.query(`select * from public.${tabela}`)).rows;
        if(tabela==='cursos') linhas=linhas.map(({tipo_acesso,url_vendas,...original})=>original);
        assert.deepEqual(linhas,antes[tabela],tabela);
      }
      assert.equal((await db.query('select tipo_acesso from public.cursos where id=$1',[cursoGratis])).rows[0].tipo_acesso,'gratis');
    });
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)',[novoUid,'novo@example.invalid',JSON.stringify({papel:'admin'})]);
    await db.query('insert into public.cursos(id,titulo,url_vendas) values ($1,$2,$3)',[pagoId,'Curso pago de teste','https://vendas.example/curso']);
    await db.query('insert into public.modulos(id,curso_id,titulo) values ($1,$2,$3)',[pagoMod,pagoId,'Módulo pago']);
    await db.query('insert into public.aulas(id,modulo_id,titulo) values ($1,$2,$3)',[pagoAula,pagoMod,'Aula paga']);
    await db.exec('grant usage on schema public, auth to authenticated, anon; grant all on all tables in schema public to authenticated; grant select on all tables in schema public to anon;');
    const como=async(id,role='authenticated')=>{
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[id,role]);
      await db.exec('set role '+role);
    };
    await t.test('novo perfil entra ativo, como aluno, sem matrícula automática artificial',async()=>{
      const p=(await db.query('select * from public.perfis where id=$1',[novoUid])).rows[0];
      assert.equal(p.liberado,true); assert.equal(p.papel,'aluno');
      assert.equal((await db.query('select * from public.matriculas where usuario_id=$1',[novoUid])).rows.length,0);
    });
    await t.test('novo aluno acessa gratuito e aulas, mas não o pago',async()=>{
      await como(novoUid);
      assert.deepEqual((await db.query('select id from public.cursos')).rows.map(x=>x.id),[cursoGratis]);
      assert.deepEqual((await db.query('select id from public.aulas')).rows.map(x=>x.id),[aulaId]);
      await db.query('insert into public.progresso(usuario_id,aula_id) values ($1,$2)',[novoUid,aulaId]);
      await assert.rejects(db.query('insert into public.progresso(usuario_id,aula_id) values ($1,$2)',[novoUid,pagoAula]),/row-level security/);
      await assert.rejects(db.query('insert into public.matriculas(usuario_id,curso_id) values ($1,$2)',[novoUid,pagoId]),/row-level security/);
    });
    await t.test('concessão e revogação manual de curso pago continuam funcionando',async()=>{
      await db.exec('reset role');
      await db.query('insert into public.matriculas(usuario_id,curso_id) values ($1,$2)',[novoUid,pagoId]);
      await como(novoUid);
      assert.equal((await db.query('select * from public.aulas where id=$1',[pagoAula])).rows.length,1);
      await db.exec('reset role');
      await db.query('delete from public.matriculas where usuario_id=$1 and curso_id=$2',[novoUid,pagoId]);
      await como(novoUid);
      assert.equal((await db.query('select * from public.aulas where id=$1',[pagoAula])).rows.length,0);
    });
    await t.test('bloqueio prevalece sobre gratuidade e não pode ser desfeito pelo aluno',async()=>{
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.role','service_role',false)");
      await db.query('update public.perfis set liberado=false where id=$1',[novoUid]);
      await como(novoUid);
      assert.equal((await db.query('select * from public.cursos')).rows.length,0);
      assert.equal((await db.query('select * from public.aulas')).rows.length,0);
      await assert.rejects(db.query('update public.perfis set liberado=true where id=$1',[novoUid]),/Somente o professor/);
    });
    await t.test('gratuito continua exigindo autenticação',async()=>{
      await como('', 'anon');
      assert.equal((await db.query('select * from public.cursos')).rows.length,0);
      await assert.rejects(db.query('select agoramed_privado.pode_acessar_curso($1)',[cursoGratis]),/permission denied/);
    });
  } finally { await db.close(); }
});
