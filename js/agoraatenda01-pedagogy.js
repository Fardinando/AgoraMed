(function(root,factory){const engine=factory();if(typeof module==='object'&&module.exports)module.exports=engine;root.AgoraAtendaPedagogy=engine;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DOMAINS=[['recognition','Reconhecimento e avaliação',20],['protection','Proteção cardíaca',25],['shift','Redistribuição temporária',20],['removal','Remoção do potássio',15],['monitoring','Monitorização e segurança',15],['etiology','Etiologia e medicamentos',5]];
  function evaluate(state){
    const f=state.flags||{};
    const points={recognition:(f.abcde?5:0)+(f.ecg?5:0)+(f.access?3:0)+(f.labs?7:0),protection:(f.monitor?10:0)+(f.calciumGiven?15:0),shift:(f.insulinGiven&&f.glucosePlan?14:0)+(f.salbutamolGiven?6:0),removal:(f.definitiveRemoval?10:(f.removalPlanned?5:0))+(f.nephrology?5:0),monitoring:(f.reassessment?7:0)+(f['glucose-series']&&f.insulinGiven?5:0)+(f.complications?2:0)+(f.disposition?1:0),etiology:f.history?5:0};
    const domains=DOMAINS.map(([id,label,max])=>({id,label,max,score:Math.min(max,points[id]||0)}));
    const score=domains.reduce((n,d)=>n+d.score,0);
    const critical=[];
    if(!f.calciumGiven)critical.push('Proteção cardíaca não administrada diante de alterações importantes no ECG.');
    if(!f.insulinGiven)critical.push('Não foi registrada medida de redistribuição temporária do potássio.');
    if(!f.definitiveRemoval)critical.push('Não foi iniciado plano de remoção definitiva ou escalonamento urgente.');
    if(f.insulinGiven&&!f['glucose-series'])critical.push('Insulina administrada sem controles seriados de glicemia documentados.');
    return {score,domains,critical,passed:score>=80&&critical.length===0,summary:critical.length?'Há prioridades de segurança que precisam ser revistas.':score>=80?'Plano consistente com os critérios desta simulação.':'A simulação aponta oportunidades de completar o plano.'};
  }
  return {DOMAINS,evaluate};
});
