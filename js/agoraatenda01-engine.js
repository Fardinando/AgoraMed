(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  root.AgoraAtendaEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ACTIONS = [
    ['abcde','Avaliação inicial ABCDE','recognition'],['monitor','Monitorização contínua','monitoring'],
    ['ecg','ECG de 12 derivações','recognition'],['access','Acesso venoso e coleta','recognition'],
    ['labs','Revisão dos exames e confirmação do potássio','recognition'],['history','Reconciliação de medicamentos e causas','etiology'],
    ['calcium','Proteção cardíaca com cálcio IV','protection'],['insulin','Insulina com glicose para shift temporário','shift'],
    ['salbutamol','Salbutamol como adjuvante','shift'],['removal','Estratégia de remoção de potássio','removal'],
    ['nephrology','Acionamento de nefrologia / equipe crítica','removal'],['reassessment','Reavaliação seriada: ECG e potássio','monitoring'],
    ['glucose-series','Controles seriados de glicemia','monitoring'],
    ['complications','Busca de complicações e resposta','monitoring'],['disposition','Definição de destino e plano de continuidade','disposition'],
    ['report','Registro e passagem estruturada do caso','report']
  ].map(([id,label,domain])=>({id,label,domain}));

  const INITIAL = Object.freeze({
    patient:{name:'José Carlos M.',age:67,weightKg:78,setting:'Emergência',conditions:['DRC com lesão renal aguda','Diabetes tipo 2','Hipertensão arterial','Insuficiência cardíaca com fração de ejeção reduzida'],symptoms:['fraqueza','diarreia','baixa ingestão oral','oligúria'],medications:['losartana','espironolactona','insulina basal'],hiddenHistory:['uso recente de ibuprofeno'],vitals:{hr:42,bp:'88/54',spo2:96,rr:22,gcs:15},labs:{potassium:7.4,creatinine:4.3,baselineCreatinine:2.1,urea:126,sodium:134,glucose:108,ph:7.27,bicarbonate:17,lactate:1.4},ecg:['ondas T apiculadas','ondas P atenuadas','QRS alargado (~160 ms)']},
    actions:[],orders:[],administered:[],flags:{},events:[],clockMinutes:0,phase:'assessment',arrest:false
  });

  function createState(){ return JSON.parse(JSON.stringify(INITIAL)); }
  function addAction(state,id,detail){
    const spec=ACTIONS.find(a=>a.id===id); if(!spec) throw new Error('Ação desconhecida: '+id);
    if(!state.actions.some(a=>a.id===id)) state.actions.push({id,label:spec.label,detail:detail||'',atMinute:state.clockMinutes});
    state.flags[id]=true;
    if(id==='history') state.flags.reviewedMedicationCauses=true;
    if(id==='reassessment') state.flags.scheduledPotassium=true;
    if(id==='glucose-series') state.flags.scheduledGlucose=true;
    if(id==='removal') state.flags.removalPlanned=true;
    if(id==='disposition') state.phase='disposition';
    if(id==='report') state.phase='completed';
    state.events.push({type:'action',id,atMinute:state.clockMinutes});
    return state;
  }
  function prescribe(state,drug,details={}){
    const id='ord-'+String(state.orders.length+1).padStart(3,'0');
    const order={id,drug,details:{...details},status:'draft',createdAtMinute:state.clockMinutes,administeredAtMinute:null};
    let accepted=true, reason='';
    if(drug==='calcium-chloride'&&Number(details.volumeMl)!==10){accepted=false;reason='Revise o volume do cloreto de cálcio 10% conforme o protocolo de referência.';}
    if(drug==='calcium-gluconate'&&details.route&&details.route!=='IV'){accepted=false;reason='O gluconato de cálcio desta ordem deve ser prescrito por via IV.';}
    if(drug==='calcium-gluconate'&&details.durationMinutes&&Number(details.durationMinutes)!==10){accepted=false;reason='Revise o tempo de administração do gluconato de cálcio conforme a referência.';}
    if(drug==='insulin'&&!details.glucosePlan){accepted=false;reason='Prescrição suspensa para segurança: inclua glicose e vigilância glicêmica antes de liberar a insulina.';}
    if(drug==='insulin'&&details.dose!=null&&Number(details.dose)!==10){accepted=false;reason='Revise a dose de insulina desta simulação e associe glicose.';}
    if(drug==='insulin'&&details.dextroseGrams!=null&&Number(details.dextroseGrams)!==25){accepted=false;reason='Revise a quantidade de glicose da ordem antes de liberar a insulina.';}
    if(drug==='insulin'&&details.route&&details.route!=='IV'){accepted=false;reason='A ordem de insulina regular para esta medida deve ser IV.';}
    if(drug==='calcium-gluconate'&&Number(details.volumeMl)!==30){accepted=false;reason='Dose fora da opção de referência configurada para esta simulação; revise o volume antes de liberar.';}
    order.status=accepted?'prescribed':'refused-safety';order.reason=reason;
    state.orders.push(order);state.events.push({type:'prescription',drug,status:order.status,atMinute:state.clockMinutes});
    if(accepted){
      if(drug==='calcium-gluconate'||drug==='calcium-chloride') state.flags.calciumPrescribed=true;
      if(drug==='insulin'){state.flags.insulinPrescribed=true;state.flags.glucosePlan=true;}
      if(drug==='salbutamol') state.flags.salbutamolPrescribed=true;
      if(drug==='potassium-removal') state.flags.removalPlanned=true;
    }
    return {accepted,order,reason};
  }
  function setOrderStatus(state,orderId,status){
    const allowed=['preparing','administered','cancelled','suspended','not-administered'];
    if(!allowed.includes(status)) throw new Error('Estado inválido');
    const order=state.orders.find(item=>item.id===orderId);if(!order)throw new Error('Prescrição não encontrada');
    if(order.status==='refused-safety') return {accepted:false,reason:order.reason,order};
    const transitions={prescribed:['preparing','cancelled','suspended','not-administered'],preparing:['administered','cancelled','suspended','not-administered'],suspended:['preparing','cancelled','not-administered']};
    if(!(transitions[order.status]||[]).includes(status))return {accepted:false,reason:status==='administered'?'Registre o início do preparo antes de registrar a administração.':'Esta ordem já está encerrada e não pode mudar de estado.',order};
    order.status=status;
    if(status==='administered'){
      order.administeredAtMinute=state.clockMinutes;state.administered.push(order.id);
      if(order.drug==='calcium-gluconate'||order.drug==='calcium-chloride')state.flags.calciumGiven=true;
      if(order.drug==='insulin')state.flags.insulinGiven=true;
      if(order.drug==='salbutamol')state.flags.salbutamolGiven=true;
      if(order.drug==='potassium-removal')state.flags.definitiveRemoval=true;
    }
    state.events.push({type:'medication-state',drug:order.drug,status,atMinute:state.clockMinutes});
    return {accepted:true,order};
  }
  function advanceTo(state,minutes){
    if(!Number.isFinite(minutes)||minutes<state.clockMinutes)throw new Error('O relógio simulado só avança.');
    state.clockMinutes=minutes;
    state.events.push({type:'timepoint',atMinute:minutes,note:'O tempo não altera sozinho sinais, exames ou estado clínico.'});
    return state;
  }
  function recordReassessment(state,values={}){
    const event={type:'reassessment',atMinute:state.clockMinutes,values:{...values}};
    state.events.push(event);
    if(values.potassium!=null){state.latestPotassium=Number(values.potassium);state.flags.repeatKRecorded=true;}
    if(values.glucose!=null)state.latestGlucose=Number(values.glucose);
    if(values.ecg)state.latestEcg=values.ecg;
    if(values.urineOutput)state.latestUrineOutput=values.urineOutput;
    return event;
  }
  function interpretIntent(text){
    const value=String(text||'').toLocaleLowerCase('pt-BR');
    const intents=[];
    const patterns=[
      ['abcde',/\b(abcde|avaliacao inicial|avaliação inicial|via aerea|via aérea)\b/],['monitor',/\b(monitor|monitorizacao|monitorização|telemetria)\b/],
      ['ecg',/\b(ecg|eletrocardiograma)\b/],['labs',/\b(exames|laboratorio|laboratório|potassio|potássio)\b/],['history',/\b(medicamentos|medicacao|medicação|ibuprofeno|historia|história)\b/],
      ['calcium',/\b(calcio|cálcio)\b/],['insulin',/\b(insulina|glicose)\b/],['salbutamol',/\b(salbutamol|beta.?2)\b/],['removal',/\b(remocao|remoção|hemodialise|hemodiálise|resina|ciclossilicato)\b/],
      ['nephrology',/\b(nefrologia|nefrologista|equipe critica|equipe crítica)\b/],['reassessment',/\b(repetir ecg|novo ecg|ecg de controle|repetir potassio|repetir potássio|controle de potassio|controle de potássio)\b/],
      ['glucose-series',/\b(glicemia seriada|controles glicemicos|controles glicêmicos)\b/],['complications',/\b(complicacoes|complicações|reavaliar)\b/],['disposition',/\b(destino|internacao|internação|uti|unidade intensiva)\b/],['report',/\b(passagem|relatorio|relatório|registrar caso)\b/]
    ];
    for(const [id,re] of patterns)if(re.test(value))intents.push(id);
    return [...new Set(intents)];
  }
  return {ACTIONS,INITIAL,createState,addAction,prescribe,setOrderStatus,advanceTo,recordReassessment,interpretIntent};
});
