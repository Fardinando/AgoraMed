const {test}=require('node:test');const assert=require('node:assert/strict');
const {ids,criarBanco,snapshot,editor,rpc,normalizar}=require('./helpers/banco-curso.cjs');
test('salvamento transacional, remoções explícitas e proteção contra versões antigas',async t=>{
 const db=await criarBanco();
 try{
  async function caso(nome,fn){await t.test(nome,async()=>{await db.exec('begin');try{await fn();}finally{await db.exec('rollback');}});}
  await caso('editar descrição preserva IDs, matrículas, comentários e progresso',async()=>{
   const antes=await snapshot(db);const ed=await editor(db);ed.descricao='Nova descrição';const r=await rpc(db,ed);assert.equal(r.ok,true);assert.equal(r.curso.descricao,'Nova descrição');assert.ok(r.curso.versao>ed.versao);
   const depois=await snapshot(db);for(const tab of ['modulos','aulas','materiais','perfis','matriculas','progresso','comentarios'])assert.deepEqual(depois[tab],antes[tab],tab);
  });
  await caso('metadados não regravam as linhas de módulos e aulas intactos',async()=>{
   const antes=(await db.query('select id,ctid::text from public.aulas order by id')).rows;
   const ed=await editor(db);ed.descricao='Somente descrição';await rpc(db,ed);
   assert.deepEqual((await db.query('select id,ctid::text from public.aulas order by id')).rows,antes);
  });
  await caso('módulo novo adicionado em outra sessão invalida um editor antigo',async()=>{
   const ed=await editor(db);await db.query('insert into public.modulos(id,curso_id,titulo) values($1,$2,$3)',[ids.outroCurso,ids.curso,'Módulo novo']);
   await assert.rejects(rpc(db,ed),/outra sessão/);assert.equal((await db.query('select * from public.modulos')).rows.length,2);
  });
  await caso('comentário de aluno não cria conflito e é preservado no salvamento',async()=>{
   const ed=await editor(db);await db.query('insert into public.comentarios(usuario_id,aula_id,texto) values($1,$2,$3)',[ids.aluno,ids.aula,'Novo comentário durante edição']);
   await rpc(db,ed);assert.equal((await db.query('select * from public.comentarios')).rows.length,3);
  });
  await caso('remoção explícita de módulo é concluída sem apagar o curso ou a matrícula',async()=>{
   const ed=await editor(db);ed.modulos=[];const r=await rpc(db,ed,{removidos:{modulos:[ids.modulo],aulas:[],materiais:[]}});
   assert.equal(r.curso.modulos.length,0);assert.equal((await db.query('select * from public.matriculas')).rows.length,1);
  });
  await caso('serviço pode salvar apenas em nome de um professor ativo',async()=>{
   const ed=await editor(db);await db.exec('set local role service_role');await rpc(db,ed);await assert.rejects(rpc(db,ed,{admin:ids.aluno,operacao:ids.outroCurso}),/professores ativos/);await db.exec('reset role');
  });
  await caso('criação confirma uma vez e uma tentativa diferente não sobrescreve o curso novo',async()=>{
   const ed=await editor(db);ed.id=ids.outroCurso;ed.versao=0;ed.modulos=[];
   await rpc(db,ed);await assert.rejects(rpc(db,ed,{operacao:ids.outraAula}),/outra sessão/);
   assert.equal((await db.query('select * from public.cursos where id=$1',[ids.outroCurso])).rows.length,1);
  });
  await caso('formulário incompleto não apaga aulas nem salva outros campos',async()=>{
   const antes=await snapshot(db);const ed=await editor(db);ed.titulo='Não deve persistir';ed.modulos=[];
   await assert.rejects(rpc(db,ed),/ausente sem confirmação/);assert.deepEqual(await snapshot(db),antes);
  });
  await caso('omissão de PDF é rejeitada sem remoção explícita',async()=>{
   const antes=await snapshot(db);const ed=await editor(db);ed.modulos[0].aulas[0].pdfs=[];
   await assert.rejects(rpc(db,ed),/ausente sem confirmação/);assert.deepEqual(await snapshot(db),antes);
  });
  await caso('duas edições da mesma versão não sobrescrevem uma à outra',async()=>{
   const a=await editor(db),b=await editor(db);a.titulo='Primeiro professor';await rpc(db,a);
   b.titulo='Segundo professor';await assert.rejects(rpc(db,b,{operacao:ids.outroCurso}),/outra sessão/);
   assert.equal((await editor(db)).titulo,'Primeiro professor');
  });
  await caso('falha no meio do salvamento desfaz inclusive metadados e novas aulas',async()=>{
   const antes=await snapshot(db);await db.exec("create function public.falha_teste() returns trigger language plpgsql as $$ begin if new.titulo='FORCAR_FALHA' then raise exception 'falha simulada'; end if; return new; end $$;create trigger falha_teste before insert or update on public.aulas for each row execute function public.falha_teste();");
   const ed=await editor(db);ed.titulo='Não deve salvar';ed.modulos[0].aulas[1].titulo='FORCAR_FALHA';ed.modulos[0].aulas[0].pdfs=[];
   await assert.rejects(rpc(db,ed,{removidos:{modulos:[],aulas:[],materiais:[ids.pdf]}}),/falha simulada/);assert.deepEqual(await snapshot(db),antes);
  });
  await caso('remover uma aula explicitamente preserva o restante do curso',async()=>{
   const ed=await editor(db);ed.modulos[0].aulas.splice(0,1);
   const r=await rpc(db,ed,{removidos:{modulos:[],aulas:[ids.aula],materiais:[]}});
   assert.equal(r.curso.modulos[0].aulas.length,1);assert.equal((await db.query('select aula_id from public.progresso')).rows[0].aula_id,ids.outraAula);
   assert.equal((await db.query('select aula_id from public.comentarios')).rows[0].aula_id,ids.outraAula);
   assert.equal((await db.query('select caminho from public.arquivos_curso_pendentes')).rows[0].caminho,`${ids.aula}/original.pdf`);
  });
  await caso('repetir requisição já confirmada não duplica nem sobrescreve edição posterior',async()=>{
   const ed=await editor(db);ed.descricao='Primeira';const primeiro=await rpc(db,ed);
   const novo=await editor(db);novo.descricao='Posterior';await rpc(db,novo,{operacao:ids.outroCurso});
   const repetido=await rpc(db,ed);assert.deepEqual(repetido,primeiro);assert.equal((await editor(db)).descricao,'Posterior');assert.equal((await db.query('select * from public.operacoes_curso')).rows.length,2);
  });
  await caso('reutilizar a mesma tentativa com dados diferentes é rejeitado',async()=>{
   const ed=await editor(db);await rpc(db,ed);ed.titulo='Pedido diferente';await assert.rejects(rpc(db,ed),/outras alterações/);
  });
  await caso('mudança direta de aula também invalida a edição aberta',async()=>{
   const ed=await editor(db);await db.query('update public.aulas set titulo=$1 where id=$2',['Título externo',ids.aula]);await assert.rejects(rpc(db,ed),/outra sessão/);
  });
  await caso('um módulo de outro curso nunca pode ser reaproveitado pelo salvamento',async()=>{
   await db.query('insert into public.cursos(id,titulo) values($1,$2)',[ids.outroCurso,'Outro curso']);const ed=await editor(db);ed.id=ids.outroCurso;ed.versao=1;
   await assert.rejects(rpc(db,ed),/outro curso/);
  });
  await caso('IDs repetidos são rejeitados antes de mudanças',async()=>{
   const antes=await snapshot(db),ed=await editor(db);ed.modulos[0].aulas.push(ed.modulos[0].aulas[0]);await assert.rejects(rpc(db,ed),/repetida/);assert.deepEqual(await snapshot(db),antes);
  });
  await caso('aluno não pode chamar a RPC, mesmo que tente indicar um professor',async()=>{
   const ed=await editor(db);await db.exec('set local role authenticated');await assert.rejects(rpc(db,ed),/permission denied/);await db.exec('reset role');
  });
  await caso('professor bloqueado não pode salvar via serviço',async()=>{
   await db.query('update public.perfis set liberado=false where id=$1',[ids.admin]);await assert.rejects(rpc(db,await editor(db)),/professores ativos/);
  });
  await caso('exclusão inteira também usa versão e confirmação idempotente',async()=>{
   const ed=await editor(db);const r=await rpc(db,ed,{acao:'excluir',curso:{id:ed.id}});assert.equal(r.excluido,true);assert.equal((await db.query('select * from public.cursos')).rows.length,0);assert.deepEqual(await rpc(db,ed,{acao:'excluir',curso:{id:ed.id}}),r);
  });
 }finally{await db.close();}
});
