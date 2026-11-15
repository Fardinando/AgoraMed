(function (root, factory) {
  const rules = factory();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  if (root) root.Caso03Rules = rules;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  const catalog = [
    {id:'calcium-gluconate',name:'Gluconato de cálcio 10%',aliases:['gluconato de calcio','calcium gluconate'],type:'drug'},
    {id:'calcium-chloride',name:'Cloreto de cálcio 10%',aliases:['cloreto de calcio','calcium chloride'],type:'drug'},
    {id:'regular-insulin',name:'Insulina regular',aliases:['insulina humana regular','regular insulin'],type:'drug'},
    {id:'glucose-50',name:'Glicose 50%',aliases:['glicose hipertônica 50%','dextrose 50%'],type:'drug'},
    {id:'glucose-20',name:'Glicose 20%',aliases:['dextrose 20%'],type:'drug'},
    {id:'glucose-10-bolus',name:'Glicose 10% (dose inicial)',aliases:['dextrose 10% inicial'],type:'drug'},
    {id:'glucose-10-infusion',name:'Glicose 10% (prevenção de hipoglicemia)',aliases:['dextrose 10% infusão'],type:'drug'},
    {id:'salbutamol',name:'Salbutamol para nebulização',aliases:['albuterol','salbutamol nebulizado'],type:'drug'},
    {id:'zirconium',name:'Ciclosilicato de zircônio sódico',aliases:['ciclosilicato de zirconio','sodium zirconium cyclosilicate'],type:'drug'},
    {id:'bicarbonate',name:'Bicarbonato de sódio',aliases:['bicarbonato de sodio'],type:'drug'},
    {id:'furosemide',name:'Furosemida',aliases:['furosemida iv'],type:'drug'},
    {id:'potassium',name:'Cloreto de potássio',aliases:['kcl','cloreto de potassio'],type:'drug'},
    {id:'calcium-resin',name:'Resina de troca iônica tradicional',aliases:['calcium resonium','poliestirenossulfonato'],type:'drug'},
    {id:'cardiac-monitor',name:'Monitorização cardíaca contínua',aliases:[],type:'conduct'},
    {id:'serial-ecg',name:'ECG seriado após cálcio e conforme evolução',aliases:[],type:'conduct'},
    {id:'serial-potassium',name:'Controle seriado de potássio',aliases:[],type:'conduct'},
    {id:'serial-glucose',name:'Monitorização seriada de glicemia',aliases:[],type:'conduct'},
    {id:'nephrology',name:'Acionar nefrologia com urgência',aliases:[],type:'conduct'},
    {id:'urgent-dialysis',name:'Organizar hemodiálise urgente',aliases:['terapia renal substitutiva urgente'],type:'conduct'}
  ];

  const groups = [
    {id:'cardiac-protection',title:'Proteção miocárdica',points:25,items:['calcium-gluconate']},
    {id:'shift',title:'Insulina e glicose inicial',points:20,items:['regular-insulin','glucose-50','glucose-20','glucose-10-bolus']},
    {id:'hypoglycemia',title:'Prevenção de hipoglicemia',points:15,items:['glucose-10-infusion']},
    {id:'adjunct',title:'Salbutamol adjuvante',points:10,items:['salbutamol']},
    {id:'removal',title:'Remoção e hemodiálise',points:20,items:['zirconium','nephrology','urgent-dialysis']},
    {id:'monitoring',title:'Monitorização',points:10,items:['cardiac-monitor','serial-ecg','serial-potassium','serial-glucose']}
  ];

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  function glucoseGrams(item) {
    if (item.id === 'glucose-50') return Number(item.dose) * (item.unit === 'mL' ? .5 : 1);
    if (item.id === 'glucose-20') return Number(item.dose) * (item.unit === 'mL' ? .2 : 1);
    if (item.id === 'glucose-10-bolus') return Number(item.dose) * (item.unit === 'mL' ? .1 : 1);
    return 0;
  }
  function concentrationAmount(item) {
    const match=String(item.concentration||'').match(/(\d+(?:[.,]\d+)?)\s*(mg|g)\s*\/\s*mL/i);
    if(!match)return null;
    const amount=Number(match[1].replace(',','.'))*(match[2].toLowerCase()==='g'?1000:1);
    const volume=Number(String(item.volume||'').match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.'));
    return Number.isFinite(volume)?amount*volume:null;
  }
  function isCorrect(item) {
    const dose = Number(item.dose);
    if (item.id === 'calcium-gluconate') return item.concentration === '10%' && item.unit === 'mL' && dose >= 27 && dose <= 33 && item.route === 'IV' && Number(item.duration) >= 8 && Number(item.duration) <= 12;
    if (item.id === 'calcium-chloride') return item.concentration === '10%' && item.unit === 'mL' && dose >= 9 && dose <= 11 && item.route === 'IV' && Number(item.duration) >= 4 && Number(item.duration) <= 6;
    if (item.id === 'regular-insulin') return normalize(item.name).includes('regular') && item.unit === 'UI' && dose >= 9 && dose <= 11 && item.route === 'IV';
    if (['glucose-50','glucose-20','glucose-10-bolus'].includes(item.id)) return item.route === 'IV' && Math.abs(glucoseGrams(item) - 25) <= 1;
    if (item.id === 'glucose-10-infusion') return item.concentration === '10%' && item.unit === 'mL/h' && dose >= 45 && dose <= 55 && item.route === 'IV' && Number(item.duration) >= 4.5 && Number(item.duration) <= 5.5;
    if (item.id === 'salbutamol') {const amount=concentrationAmount(item);return item.route === 'Nebulização' && item.unit === 'mg' && dose >= 10 && dose <= 20 && amount !== null && Math.abs(amount-dose)<=.5;}
    if (item.id === 'zirconium') return item.unit === 'g' && dose >= 9 && dose <= 11 && item.route === 'Oral' && Number(item.frequency) === 3 && Number(item.duration) <= 72;
    if (item.type === 'conduct') return true;
    return false;
  }
  function evaluate(state) {
    const items = Array.isArray(state.items) ? state.items : [];
    const byId = new Map(items.map(item => [item.id,item]));
    const reviewed = [];
    let critical = false;
    const selectedKeys = new Set(items.map(item => item.id));
    const duplicates=new Set(items.map(item=>item.id).filter((id,index,array)=>array.indexOf(id)!==index));
    for(const id of duplicates){
      const entry=catalog.find(item=>item.id===id);
      const severity=['regular-insulin','potassium','calcium-gluconate','calcium-chloride'].includes(id)?'critical':'moderate';
      if(severity==='critical')critical=true;
      reviewed.push({ruleId:'duplicate-'+id,title:entry?.name||id,status:'Duplicidade',severity,points:0,why:'O mesmo item foi prescrito mais de uma vez. Confira se a repetição foi intencional e some as doses totais. Duplicidade de insulina ou de eletrólito pode causar dano grave.'});
    }
    const potassium = byId.get('potassium');
    if (potassium) {
      critical = true;
      reviewed.push({ruleId:'danger-potassium',title:'Cloreto de potássio',status:'Potencialmente perigoso',severity:'critical',points:0,prescribed:potassium,expected:'Não administrar potássio neste cenário.',why:'O potássio sérico já está em 7,4 mEq/L e o paciente é praticamente anúrico. Uma carga adicional pode agravar rapidamente a hipercalemia e precipitar arritmia fatal.'});
    }
    for (const item of items.filter(entry => entry.id !== 'potassium')) {
      const correct = isCorrect(item);
      let why = correct ? 'A ordem é compatível com a referência estruturada desta prévia. Confira a apresentação disponível e mantenha a monitorização indicada.' : 'A ordem precisa de revisão. Compare o fármaco, a concentração, a quantidade, a via e o tempo com a referência e com a apresentação disponível.';
      let expected = '';
      let status = correct ? 'Correto' : 'Parcialmente correto';
      let severity = correct ? 'normal' : 'moderate';
      if (item.id === 'calcium-gluconate') { expected = 'Gluconato de cálcio 10%, 30 mL IV em 10 minutos, com ECG contínuo e reavaliação do traçado.'; why = correct ? 'O cálcio estabiliza temporariamente a excitabilidade miocárdica diante do QRS de 160 ms. Ele não remove potássio, então insulina-glicose e hemodiálise continuam necessárias.' : 'QRS alargado e ondas T apiculadas mostram toxicidade elétrica. A dose de referência é 30 mL de gluconato a 10% IV em 10 minutos. Cálcio reduz a excitabilidade miocárdica, mas não reduz o potássio sérico.'; }
      if (item.id === 'calcium-chloride') { expected = 'Preferir gluconato de cálcio 10%, 30 mL IV em 10 minutos fora de parada ou peri-parada. Alternativa UKKA: cloreto de cálcio 10%, 10 mL IV em 5 minutos, conforme contexto.'; why = 'Cloreto e gluconato têm concentrações molares diferentes e não são equivalentes em volume. A UKKA reserva preferência pelo cloreto para ressuscitação ou peri-parada. Este paciente está bradicárdico, mas sem choque ou parada.'; status = 'Correto com ressalvas'; severity = 'moderate'; }
      if (item.id === 'regular-insulin') { expected = 'Insulina regular 10 UI IV associada a 25 g de glicose IV.'; if (!['glucose-50','glucose-20','glucose-10-bolus'].some(id => byId.has(id))) { status='Potencialmente perigoso';severity='critical';critical=true;why='A insulina desloca potássio para dentro das células, mas também reduz a glicemia. Com glicemia inicial de 102 mg/dL e DRC G5D, administrar insulina sem glicose aumenta o risco de hipoglicemia. Associe 25 g de glicose e monitore glicemia por pelo menos 6 horas conforme protocolo.';} else {why=correct?'Você usou insulina regular IV na faixa de 10 UI. A associação com 25 g de glicose trata temporariamente a hipercalemia enquanto se organiza sua remoção definitiva.':'Confira o tipo de insulina, a dose em unidades e a via IV. A referência é 10 UI de insulina solúvel/regular IV com 25 g de glicose.';} }
      if (item.id === 'regular-insulin' && Number(item.dose) > 12) {status='Potencialmente perigoso';severity='critical';critical=true;why='A dose prescrita excede claramente a dose-padrão de 10 UI IV. Doses maiores elevam o risco de hipoglicemia prolongada, particularmente na insuficiência renal terminal. A referência didática UKKA é 10 UI com 25 g de glicose e monitorização glicêmica seriada.';}
      if (['glucose-50','glucose-20','glucose-10-bolus'].includes(item.id)) { expected='Administrar 25 g de glicose IV junto da insulina. Equivalentes usuais: 50 mL a 50%, 125 mL a 20% ou 250 mL a 10%.';why=correct?'A quantidade calculada corresponde a 25 g de glicose, a carga inicial prevista para acompanhar a insulina.':'A concentração e o volume determinam a quantidade real de glicose. Calcule gramas = concentração (g/mL) × volume. A meta inicial é 25 g junto da insulina.'; }
      if (item.id === 'glucose-10-infusion') { expected='Após a dose inicial de insulina-glicose, glicose 10% IV a 50 mL/h por 5 horas (25 g adicionais), pois a glicemia inicial de 102 mg/dL é <7 mmol/L.';why=correct?'A infusão adicional é distinta dos 25 g administrados junto da insulina. A glicemia inicial abaixo de 7 mmol/L aumenta o risco de hipoglicemia tardia, especialmente na DRC avançada.' : 'Não confunda essa infusão com os 25 g iniciais. A UKKA recomenda glicose 10% a 50 mL/h por 5 horas após insulina-glicose se a glicemia pré-tratamento for <7 mmol/L. Aqui ela é 102 mg/dL.'; }
      if (item.id === 'salbutamol') { expected='Salbutamol 10–20 mg por nebulização como adjuvante, especificando apresentação, concentração e volume final.';why=correct?'O agonismo beta-2 desloca potássio para o meio intracelular. É adjuvante, tem resposta variável e não substitui cálcio, insulina-glicose ou hemodiálise. Vigie taquicardia e tremor.' : 'Dose broncodilatadora habitual não é a dose usada para hipercalemia. A faixa UKKA é 10–20 mg nebulizados como adjuvante. Especifique concentração e volume e observe taquicardia/tremor.'; }
      if (item.id === 'zirconium') { expected='Ciclosilicato de zircônio sódico 10 g VO três vezes ao dia na fase inicial, por até 72 h, reavaliando potássio.';why=correct?'O quelante favorece remoção gastrointestinal de potássio, mas seu início não é substituto da estabilização miocárdica, redistribuição temporária nem hemodiálise urgente neste paciente dialítico.' : 'Revise a dose, a via oral, a frequência e o período. O protocolo de referência do caso é 10 g VO três vezes ao dia por até 72 h, com reavaliação. É adjuvante e não deve atrasar a diálise urgente.'; }
      if (item.id === 'furosemide') { expected='Não usar furosemida como estratégia de remoção de potássio neste caso.';why='A diurese residual é inferior a 100 mL/dia. Sem fluxo urinário significativo, não se pode contar com diurético de alça para remover potássio, e a dose não substitui a hemodiálise.';status='Incorreto neste contexto';severity='moderate'; }
      if (item.id === 'bicarbonate') { expected='Não prescrever rotineiramente apenas para baixar potássio; reavaliar indicação acidobásica de forma independente.';why='O pH 7,31 e bicarbonato 19 mEq/L não definem, sozinhos, indicação obrigatória de bicarbonato IV para hipercalemia. A UKKA não recomenda seu uso IV rotineiro como tratamento agudo do potássio.';status='Correto com ressalvas';severity='moderate'; }
      if (item.id === 'calcium-resin') { expected='Não usar resina tradicional como substituta das medidas urgentes ou da diálise.';why='O efeito é menos previsível e não protege o miocárdio nem desloca potássio rapidamente. A prioridade deste caso é estabilização, redistribuição e remoção definitiva por hemodiálise.';status='Incorreto como prioridade';severity='moderate'; }
      reviewed.push({ruleId:'order-'+item.id,title:item.name,status,severity,points:correct?1:0,prescribed:item,expected,why});
    }
    const required = ['calcium-gluconate','regular-insulin','glucose-10-infusion','salbutamol','nephrology','urgent-dialysis','cardiac-monitor','serial-ecg','serial-potassium','serial-glucose'];
    for (const id of required) if (!selectedKeys.has(id)) {
      const entry = catalog.find(item => item.id === id);
      const severity = ['calcium-gluconate','urgent-dialysis'].includes(id) ? 'critical' : 'moderate';
      if (severity === 'critical') critical = true;
      const descriptions = {
        'calcium-gluconate':['Omissão crítica','Gluconato de cálcio 10%, 30 mL IV em 10 minutos.','O QRS de 160 ms e as ondas T apiculadas indicam toxicidade elétrica. O cálcio reduz o risco cardíaco imediato, embora não reduza o potássio.'],
        'regular-insulin':['Omissão','Insulina regular 10 UI IV com 25 g de glicose.','A insulina desloca temporariamente o potássio para dentro das células. Sem essa medida, a hipercalemia grave permanece sem redistribuição enquanto a diálise é organizada.'],
        'glucose-10-infusion':['Omissão','Glicose 10% a 50 mL/h por 5 horas após a insulina.','Com glicemia basal de 102 mg/dL e DRC avançada, glicose adicional reduz o risco de hipoglicemia tardia.'],
        'salbutamol':['Omissão','Salbutamol nebulizado 10–20 mg como adjuvante.','Pode promover redistribuição intracelular adicional, mas não substitui a insulina-glicose nem a diálise.'],
        'nephrology':['Omissão','Acionar nefrologia imediatamente.','O paciente tem DRC G5D, quase anúria e hipercalemia com ECG alterado. A equipe de nefrologia deve ser acionada em paralelo às medidas temporizadoras.'],
        'urgent-dialysis':['Omissão crítica','Organizar hemodiálise urgente.','A diálise remove potássio do organismo. Redistribuição é temporária e a diurese residual mínima inviabiliza depender de excreção renal.'],
        'cardiac-monitor':['Omissão','Monitorização cardíaca contínua.','Hipercalemia grave com bradicardia e QRS alargado pode progredir para arritmias fatais.'],
        'serial-ecg':['Omissão','Repetir ECG após cálcio e acompanhar evolução.','Reavaliar o traçado mostra se a toxicidade elétrica persiste e se a proteção miocárdica precisa ser repetida conforme protocolo.'],
        'serial-potassium':['Omissão','Dosar potássio de forma seriada e após intervenções.','A redistribuição pode ser seguida de rebote. Acompanhar potássio documenta resposta e ajuda a orientar o tratamento definitivo.'],
        'serial-glucose':['Omissão','Monitorar glicemia antes e em série por até 6 horas após insulina.','Hipoglicemia tardia é uma complicação conhecida da insulina-glicose e merece vigilância reforçada na insuficiência renal avançada.']
      }[id];
      reviewed.push({ruleId:'missing-'+id,title:entry.name,status:descriptions[0],severity,points:0,expected:descriptions[1],why:descriptions[2]});
    }
    const counts = {correct:reviewed.filter(item=>item.status==='Correto').length, errors:reviewed.filter(item=>['Incorreto neste contexto','Incorreto como prioridade','Potencialmente perigoso'].includes(item.status)).length, omissions:reviewed.filter(item=>item.status.startsWith('Omissão')).length, critical:reviewed.filter(item=>item.severity==='critical').length};
    const glucose = ['glucose-50','glucose-20','glucose-10-bolus'].map(id=>byId.get(id)).find(Boolean);
    const insulinGlucose = Boolean(byId.get('regular-insulin') && glucose && Math.abs(glucoseGrams(glucose)-25)<=1 && isCorrect(byId.get('regular-insulin')) && isCorrect(glucose));
    const monitoringIds=['cardiac-monitor','serial-ecg','serial-potassium','serial-glucose'];
    const groupScores = {
      cardiacProtection: byId.has('calcium-gluconate') && isCorrect(byId.get('calcium-gluconate')) ? 25 : 0,
      insulinGlucose: insulinGlucose ? 20 : 0,
      hypoglycemiaPrevention: byId.has('glucose-10-infusion') && isCorrect(byId.get('glucose-10-infusion')) ? 15 : 0,
      salbutamol: byId.has('salbutamol') && isCorrect(byId.get('salbutamol')) ? 10 : 0,
      removalAndDialysis: 10 * ['nephrology','urgent-dialysis'].filter(id=>byId.has(id)).length,
      monitoring: 2.5 * monitoringIds.filter(id=>byId.has(id)).length
    };
    const score=Math.round(Object.values(groupScores).reduce((sum,value)=>sum+value,0));
    return {score,safe:!critical,critical,counts,groupScores,items:reviewed};
  }
  return {catalog,groups,normalize,glucoseGrams,evaluate};
});
