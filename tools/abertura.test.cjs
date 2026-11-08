const {test}=require('node:test');const assert=require('node:assert/strict');const {readFileSync,readdirSync}=require('node:fs');const {join}=require('node:path');
const {normalizarAbertura,preparar}=require('../lib/curso-edicao');const {cursoParaEd}=require('../lib/api');const {criarBanco,editor,rpc,snapshot,ids}=require('./helpers/banco-curso.cjs');
test('abertura valida apenas ID de vídeo e permite vídeo pendente',()=>{
 assert.deepEqual(normalizarAbertura({youtubeId:'',duracao:''}),{youtube_id:'',duracao:''});
 assert.deepEqual(normalizarAbertura({youtubeId:'aBc123XyZ_4',duracao:'05:30'}),{youtube_id:'aBc123XyZ_4',duracao:'05:30'});
 for(const youtubeId of ['https://youtu.be/aBc123XyZ_4','<script>x</script>','abcdefghijk?'])assert.throws(()=>normalizarAbertura({youtubeId}));
 assert.throws(()=>normalizarAbertura([]));assert.throws(()=>normalizarAbertura({duracao:'x'.repeat(31)}));
});
test('abertura não cria módulos, aulas ou progresso artificial',()=>{
 const ed=cursoParaEd({id:ids.curso,titulo:'Curso',modulos:[],abertura:{youtube_id:'',duracao:''}});
 assert.deepEqual(ed.abertura,{youtubeId:'',duracao:''});assert.deepEqual(ed.modulos,[]);
});
test('vídeo da abertura persiste com concorrência, preservando aulas, matrícula e materiais',async t=>{
 const db=await criarBanco();try{
  await db.exec(readFileSync(join(__dirname,'../supabase/migrations/20261108111730_configurar_venda_mercado_pago.sql'),'utf8'));
  const file=readdirSync(join(__dirname,'../supabase/migrations')).find(x=>x.endsWith('_abertura_curso.sql'));
  await db.exec(readFileSync(join(__dirname,'../supabase/migrations',file),'utf8'));
  await db.exec('begin');
  const antes=await snapshot(db),ed=await editor(db);ed.abertura={youtubeId:'aBc123XyZ_4',duracao:'05:30'};
  await rpc(db,ed);const salvo=await editor(db);assert.equal(salvo.abertura.youtubeId,'aBc123XyZ_4');
  const depois=await snapshot(db);for(const table of ['modulos','aulas','materiais','matriculas','progresso','comentarios'])assert.deepEqual(depois[table],antes[table]);
  await assert.rejects(rpc(db,ed,{operacao:ids.outroCurso}),/outra sessão/);
  const raw=(await db.query('select * from public.cursos where id=$1',[ids.curso])).rows[0];const velho={...salvo};delete velho.abertura;
  const preservado=preparar(velho,{...raw,modulos:velho.modulos.map(m=>({aulas:m.aulas.map(a=>({materiais:a.pdfs}))}))},ids.outroCurso,{baseUrl:'https://example.invalid',dataUrlParaBytes:()=>null}).curso;
  assert.equal(preservado.abertura.youtube_id,'aBc123XyZ_4');
  await db.exec('savepoint invalido');await assert.rejects(db.query('update public.cursos set abertura=$1 where id=$2',[JSON.stringify({youtube_id:'javascript:alert(1)',duracao:''}),ids.curso]));await db.exec('rollback to savepoint invalido');
  await db.exec('rollback');
 }finally{await db.close();}
});
