'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');

test('salva o Caso 03 apenas para aluno autorizado e calcula a avaliação no servidor',async()=>{
  const apiPath=require.resolve('../lib/api');
  const routePath=require.resolve('../lib/rotas/agoraprescreva');
  const originalApi=require.cache[apiPath];
  const originalRoute=require.cache[routePath];
  const writes=[];
  let profile={id:'student-1'};
  let enrollment=true;
  require.cache[apiPath]={id:apiPath,filename:apiPath,loaded:true,exports:{
    json(res,status,body){res.statusCode=status;res.body=body;return body;},
    envFaltando:()=>[],sessaoPerfil:async()=>profile,
    podeAcessarCurso:async()=>enrollment,
    postgrest:async(_path,options)=>{writes.push(options);return{ok:true,dados:[{id:'attempt-03'}]};}
  }};
  delete require.cache[routePath];
  try {
    const route=require('../lib/rotas/agoraprescreva');
    const req={method:'POST',body:{caseId:'03',operationId:'123e4567-e89b-42d3-a456-426614174000',state:{startedAt:'2026-11-15T10:00:00.000Z',items:[
      {id:'calcium-gluconate',name:'Gluconato de cálcio 10%',concentration:'10%',dose:'30',unit:'mL',route:'IV',duration:'10'},
      {id:'regular-insulin',name:'Insulina humana regular',dose:'10',unit:'UI',route:'IV'},
      {id:'glucose-50',concentration:'50%',dose:'50',unit:'mL',route:'IV'},
      {id:'glucose-10-infusion',concentration:'10%',dose:'50',unit:'mL/h',route:'IV',duration:'5'},
      {id:'salbutamol',concentration:'5 mg/mL',dose:'10',unit:'mg',route:'Nebulização',volume:'2 mL'},
      {id:'nephrology'},{id:'urgent-dialysis'},{id:'cardiac-monitor'},{id:'serial-ecg'},{id:'serial-potassium'},{id:'serial-glucose'}
    ]},result:{score:0}}};
    let res={setHeader(){}};
    await route(req,res);
    assert.equal(res.statusCode,200);
    assert.deepEqual(res.body,{ok:true,attemptId:'attempt-03'});
    assert.equal(writes.length,1);
    assert.equal(writes[0].corpo.usuario_id,'student-1');
    assert.equal(writes[0].corpo.estado.caseId,'03');
    assert.equal(writes[0].corpo.resultado.score,100);
    assert.equal(writes[0].corpo.resultado.safe,true);
    assert.equal(writes[0].corpo.resultado.caseId,'03');

    profile=null;
    res={setHeader(){}};
    await route(req,res);
    assert.equal(res.statusCode,401);
    assert.equal(writes.length,1);

    profile={id:'student-1'};enrollment=false;
    res={setHeader(){}};
    await route(req,res);
    assert.equal(res.statusCode,403);
    assert.equal(writes.length,1);

    enrollment=true;
    req.body.state.items=[{id:'unknown-id',dose:'999'}];
    res={setHeader(){}};
    await route(req,res);
    assert.equal(res.statusCode,400);
    assert.equal(writes.length,1);
  } finally {
    delete require.cache[routePath];
    if(originalRoute)require.cache[routePath]=originalRoute;
    if(originalApi)require.cache[apiPath]=originalApi;else delete require.cache[apiPath];
  }
});
