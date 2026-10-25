const {PGlite}=require('@electric-sql/pglite');
const {readFileSync,readdirSync}=require('node:fs');
const {join}=require('node:path');
const {cursoParaEd}=require('../../lib/api');
const {preparar}=require('../../lib/curso-edicao');
const raiz=join(__dirname,'../..');
const ids={curso:'36c4246d-1f58-424b-ad07-c494ad7d4bd1',admin:'11111111-1111-4111-8111-111111111111',aluno:'22222222-2222-4222-8222-222222222222',modulo:'33333333-3333-4333-8333-333333333333',aula:'44444444-4444-4444-8444-444444444444',outraAula:'55555555-5555-4555-8555-555555555555',pdf:'66666666-6666-4666-8666-666666666666',outroCurso:'77777777-7777-4777-8777-777777777777'};
async function criarBanco(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'postgres') $$;
 create table storage.buckets(id text primary key,name text,public boolean);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;`);
 await db.exec(readFileSync(join(raiz,'supabase/schema.sql'),'utf8').replace('create extension if not exists pgcrypto;',''));
 await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[ids.admin,'professor@example.invalid',ids.aluno,'aluno@example.invalid']);
 await db.query("update public.perfis set papel='admin',liberado=true where id=$1",[ids.admin]);
 await db.query('update public.perfis set liberado=true where id=$1',[ids.aluno]);
 await db.query('insert into public.cursos(id,titulo) values($1,$2)',[ids.curso,'DETERMINAÇÃO DE MORTE ENCEFÁLICA']);
 await db.query('insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,$3,1)',[ids.modulo,ids.curso,'Módulo original']);
 await db.query('insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,$3,1),($4,$2,$5,2)',[ids.aula,ids.modulo,'Aula original',ids.outraAula,'Outra aula']);
 await db.query('insert into public.materiais(id,aula_id,nome,caminho) values($1,$2,$3,$4)',[ids.pdf,ids.aula,'Original.pdf',`${ids.aula}/original.pdf`]);
 await db.query('insert into public.matriculas(usuario_id,curso_id) values($1,$2)',[ids.aluno,ids.curso]);
 await db.query('insert into public.progresso(usuario_id,aula_id) values($1,$2),($1,$3)',[ids.aluno,ids.aula,ids.outraAula]);
 await db.query('insert into public.comentarios(usuario_id,aula_id,texto) values($1,$2,$3),($1,$4,$5)',[ids.aluno,ids.aula,'Comentário preservado',ids.outraAula,'Outro comentário']);
 await db.exec(readFileSync(join(raiz,'supabase/migrations/20261025225237_cursos_gratuitos_pagos.sql'),'utf8'));
 const nova=readdirSync(join(raiz,'supabase/migrations')).filter(x=>x.endsWith('_salvamento_atomico_cursos.sql'));
 if(nova.length!==1)throw Error('Migração de salvamento não é única.');
 await db.exec(readFileSync(join(raiz,'supabase/migrations',nova[0]),'utf8'));
 await db.exec('grant usage on schema public,auth to service_role;grant all on all tables in schema public to service_role;');
 return db;
}
async function snapshot(db){
 const obj={};for(const t of ['cursos','modulos','aulas','materiais','perfis','matriculas','progresso','comentarios','operacoes_curso','arquivos_curso_pendentes'])obj[t]=(await db.query(`select * from public.${t} t order by to_jsonb(t)::text`)).rows;return obj;
}
async function editor(db){
 const c=(await db.query('select * from public.cursos where id=$1',[ids.curso])).rows[0];
 c.modulos=(await db.query('select * from public.modulos where curso_id=$1 order by ordem',[c.id])).rows;
 for(const m of c.modulos){m.aulas=(await db.query('select * from public.aulas where modulo_id=$1 order by ordem',[m.id])).rows;for(const a of m.aulas)a.materiais=(await db.query('select * from public.materiais where aula_id=$1',[a.id])).rows;}
 return cursoParaEd(c);
}
function normalizar(ed){
 const anterior={modulos:ed.modulos.map(m=>({aulas:m.aulas.map(a=>({materiais:a.pdfs}))}))};
 // PDFs do editor usam caminho, assim como a referência consultada pelo servidor.
 return preparar(ed,anterior,'88888888-8888-4888-8888-888888888888',{baseUrl:'https://example.invalid',dataUrlParaBytes:()=>null}).curso;
}
async function rpc(db,ed,{removidos={modulos:[],aulas:[],materiais:[]},operacao='88888888-8888-4888-8888-888888888888',admin=ids.admin,acao='salvar',curso}={}){
 const payload=curso||normalizar(ed);payload.requisicao='requisicao-de-teste';
 await db.exec('savepoint chamada_rpc');
 try{const r=await db.query('select public.salvar_curso_atomico($1::jsonb,$2,$3::jsonb,$4,$5,$6) as resultado',[JSON.stringify(payload),ed.versao,JSON.stringify(removidos),operacao,admin,acao]);await db.exec('release savepoint chamada_rpc');return r.rows[0].resultado;}
 catch(e){await db.exec('rollback to savepoint chamada_rpc');await db.exec('release savepoint chamada_rpc');throw e;}
}
module.exports={ids,criarBanco,snapshot,editor,rpc,normalizar};
