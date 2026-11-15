(function(root,factory){const flow=factory();if(typeof module==='object'&&module.exports)module.exports=flow;root.AgoraAtendaFlow=flow;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const REF='https://guidelines.ukkidney.org/hyperkalaemia/6-summary-of-clinical-practice-guideline-for-hyperkalaemia/6-2-section-ii-hospital/';
  const STEPS=[
    {id:'priority',title:'O que você deve fazer primeiro?',kind:'decision',prompt:'O ECG já mostra sinais de toxicidade e o paciente está bradicárdico e hipotenso. Escolha a primeira prioridade de atendimento.',correct:'protect-heart',reference:'UKKA 2026 · passos 1 e 2'},
    {id:'calcium-order',title:'Prescreva, prepare e administre o cálcio',kind:'calcium',prompt:'A ordem não será administrada automaticamente. Preencha os campos, confirme a prescrição, inicie o preparo e registre a administração.'},
    {id:'calcium-response',title:'Agora, reavalie o ECG e o potássio',kind:'response',prompt:'Após a administração, confira o que mudou. A proteção cardíaca pode melhorar as alterações do ECG, mas não remove potássio.',time:10,response:'calcium'},
    {id:'etiology',title:'Que informações ajudam a encontrar a causa?',kind:'decision',prompt:'O paciente tem LRA, oligúria, diarreia, baixa ingestão e usa medicamentos que podem contribuir. O que revisar agora?',correct:'review-causes',reference:'UKKA 2026 · avaliação clínica e história medicamentosa'},
    {id:'shift',title:'Como reduzir temporariamente o potássio?',kind:'decision',prompt:'O potássio é 7,4 mEq/L. Escolha uma medida de redistribuição para associar à proteção cardíaca.',correct:'insulin-glucose',reference:'UKKA 2026 · passo 3'},
    {id:'insulin-order',title:'Prescreva, prepare e administre insulina com glicose',kind:'insulin',prompt:'Confira dose, via, glicose de proteção e preparo antes de iniciar. A glicemia inicial é 108 mg/dL (aproximadamente 6 mmol/L).'},
    {id:'salbutamol-choice',title:'O salbutamol entra no plano?',kind:'salbutamol-choice',prompt:'Pode ser usado como medida adjuvante. Escolha se vai adicioná-lo; ele não substitui insulina com glicose nem remoção definitiva.',reference:'UKKA 2026 · salbutamol como adjuvante'},
    {id:'salbutamol-order',title:'Prepare e administre o salbutamol',kind:'salbutamol',prompt:'Se optar pelo adjuvante, registre a nebulização e acompanhe a resposta. Esta etapa pode ser pulada sem perder o fluxo principal.'},
    {id:'monitoring',title:'O que você precisa acompanhar?',kind:'decision',prompt:'A melhora do ECG, isoladamente, não confirma que o potássio normalizou. Selecione o plano de reavaliação.',correct:'serial-monitoring',reference:'UKKA 2026 · passo 4'},
    {id:'monitoring-response',title:'Reavalie o paciente em 60 minutos',kind:'response',prompt:'Registre ECG, potássio, glicemia e diurese. Este é um resultado fixo deste cenário, não uma previsão individual.',time:60,response:'shift'},
    {id:'removal',title:'Como remover o potássio do organismo?',kind:'decision',prompt:'A oligúria e a lesão renal aguda persistem. O shift é temporário. Escolha o plano de remoção e escalonamento.',correct:'urgent-removal',reference:'UKKA 2026 · passos 5 e 6'},
    {id:'removal-action',title:'Acione a equipe e prepare a terapia renal substitutiva',kind:'removal-action',prompt:'Acione nefrologia/equipe crítica e registre o início do plano de remoção definitiva. Só depois avance para a nova avaliação.'},
    {id:'removal-response',title:'Confira a resposta após o plano de remoção',kind:'response',prompt:'O resultado depende de a terapia de remoção ter sido iniciada. Em ambos os ramos, mantenha monitorização e controles seriados.',time:240,response:'removal'},
    {id:'disposition',title:'Qual é o destino mais seguro?',kind:'decision',prompt:'Defina o local de cuidado e a continuidade da vigilância até estabilidade clínica e laboratorial.',correct:'high-acuity',reference:'UKKA 2026 · encaminhamento urgente'},
    {id:'finish',title:'Revise e finalize sua tentativa',kind:'finish',prompt:'Confira as decisões registradas e encerre para gerar o relatório formativo.'}
  ];
  const DECISIONS={
    priority:{correct:'protect-heart',reference:'UKKA 2026 · passos 1 e 2',options:[
      {id:'protect-heart',label:'ABCDE, monitorização cardíaca contínua, acesso venoso e cálcio IV imediato',actions:['abcde','monitor','ecg','access','calcium'],feedback:'Boa prioridade. Há alterações de condução no ECG e instabilidade. Organize monitorização e acesso sem atrasar o cálcio IV, que protege o miocárdio. O cálcio não reduz a concentração de potássio.'},
      {id:'insulin-first',label:'Começar pela insulina e deixar o ECG para depois',actions:[],feedback:'Essa sequência deixa sem tratamento imediato a toxicidade cardíaca já visível no ECG. Primeiro proteja o coração com cálcio IV e mantenha monitorização contínua; em seguida, faça o shift com insulina e glicose.'},
      {id:'salbutamol-alone',label:'Fazer apenas salbutamol nebulizado',actions:[],feedback:'Salbutamol pode ajudar como adjuvante, mas não protege imediatamente o miocárdio nem deve ser usado como monoterapia. Priorize cálcio IV e monitorização cardíaca.'},
      {id:'wait',label:'Aguardar outro resultado de potássio antes de agir',actions:[],feedback:'Com K 7,4 mEq/L, bradicardia, hipotensão e alterações no ECG, aguardar sem tratar cria atraso em um cenário de alto risco. A avaliação e o tratamento precisam ocorrer em paralelo.'}
    ]},
    etiology:{correct:'review-causes',reference:'UKKA 2026 · avaliação clínica e história medicamentosa',options:[
      {id:'review-causes',label:'Revisar função renal, perdas, ingestão e medicamentos; confirmar os exames',actions:['labs','history'],feedback:'Correto. LRA, oligúria e medicamentos que interferem na excreção de potássio são relevantes. A reconciliação revela uso recente de ibuprofeno; reavalie também losartana e espironolactona no contexto agudo.'},
      {id:'repeat-calcium',label:'Repetir cálcio sem revisar o ECG ou a ordem anterior',actions:[],feedback:'Antes de repetir, reavalie o ECG e confira a ordem, o momento e a resposta. O cálcio estabiliza a membrana, mas não reduz o potássio. Revise também função renal e medicamentos.'},
      {id:'ignore-drugs',label:'Desconsiderar os medicamentos e focar apenas na dieta',actions:[],feedback:'A causa pode envolver LRA, oligúria, perdas e medicamentos. A história medicamentosa é necessária; neste caso, o uso recente de ibuprofeno é uma informação relevante.'}
    ]},
    shift:{correct:'insulin-glucose',reference:'UKKA 2026 · passo 3',options:[
      {id:'insulin-glucose',label:'Insulina regular IV com glicose e prevenção/monitorização de hipoglicemia',actions:['insulin'],feedback:'Correto. A insulina promove redistribuição temporária. Como a glicemia inicial é inferior a 7 mmol/L, inclua a estratégia de glicose da referência e os controles seriados.'},
      {id:'insulin-alone',label:'Insulina IV sem glicose porque o paciente tem diabetes',actions:[],feedback:'Diabetes não elimina o risco de hipoglicemia, especialmente com DRC/LRA. Prescreva glicose junto e acompanhe glicemia em série; para este valor basal, a referência indica infusão adicional de glicose a 10%.'},
      {id:'salbutamol-only',label:'Salbutamol como única medida de shift',actions:[],feedback:'Salbutamol é adjuvante e não deve substituir insulina com glicose. Também não remove o potássio corporal total.'},
      {id:'bicarbonate',label:'Bicarbonato IV de rotina para todo paciente com hipercalemia',actions:[],feedback:'Bicarbonato IV não é recomendado rotineiramente para hipercalemia pela UKKA. Avalie indicações específicas e protocolo institucional; não atrase as medidas prioritárias.'}
    ]},
    monitoring:{correct:'serial-monitoring',reference:'UKKA 2026 · passo 4',options:[
      {id:'serial-monitoring',label:'Repetir ECG e potássio, monitorar glicemia em série e acompanhar diurese',actions:['reassessment','glucose-series','complications'],feedback:'Correto. A resposta do ECG não comprova normalização do potássio. Acompanhe ECG e K em série, glicemia após insulina e débito urinário; observe rebound quando o efeito do shift diminuir.'},
      {id:'ecg-only',label:'Repetir ECG; se melhorar, considerar o tratamento encerrado',actions:[],feedback:'O ECG pode melhorar sem que o potássio tenha normalizado. Continue controles de K e glicemia e acompanhe diurese, sinais vitais e recorrência.'},
      {id:'no-glucose',label:'Controlar o potássio, sem medir glicemia após insulina',actions:[],feedback:'Hipoglicemia é um risco importante após insulina, particularmente com disfunção renal. Registre controles glicêmicos seriados por até 6 horas, além do potássio.'}
    ]},
    removal:{correct:'urgent-removal',reference:'UKKA 2026 · passos 5 e 6',options:[
      {id:'urgent-removal',label:'Acionar nefrologia/equipe crítica e preparar remoção urgente, considerando diálise',actions:['removal','nephrology'],feedback:'Correto. A oligúria, a LRA e o potássio grave tornam necessário planejar remoção definitiva e escalonar para avaliação especializada urgente. O shift é temporário.'},
      {id:'binder-only',label:'Usar apenas um quelante e dispensar avaliação nefrológica',actions:[],feedback:'Um quelante pode integrar o plano conforme indicação e protocolo, mas não substitui escalonamento urgente neste cenário instável com oligúria e LRA.'},
      {id:'repeat-shift',label:'Repetir insulina indefinidamente e não planejar remoção',actions:[],feedback:'Insulina desloca potássio para dentro das células e seu efeito é temporário. Repetições sem reavaliação aumentam risco de hipoglicemia; planeje remoção definitiva e chame nefrologia/equipe crítica.'},
      {id:'discharge',label:'Dar alta se a frequência cardíaca melhorar',actions:[],feedback:'Melhora da frequência ou do ECG não garante controle do potássio. O caso exige monitorização, controles seriados e plano de remoção/escalonamento.'}
    ]},
    disposition:{correct:'high-acuity',reference:'UKKA 2026 · encaminhamento urgente',options:[
      {id:'high-acuity',label:'Manter em ambiente monitorizado, com avaliação urgente especializada e plano documentado',actions:['disposition','report'],feedback:'Correto. Mantenha monitorização cardíaca e laboratorial, acompanhe glicemia e diurese, trate a causa e documente contingências e destino conforme resposta.'},
      {id:'routine-ward',label:'Transferir sem telemetria após melhora parcial do ECG',actions:[],feedback:'A melhora parcial do ECG não elimina risco de recorrência ou hipercalemia persistente. Mantenha ambiente monitorizado e escalonamento até reavaliação adequada.'},
      {id:'home',label:'Liberar para casa após a primeira dose',actions:[],feedback:'Este paciente continua com potássio elevado, oligúria, LRA e instabilidade. Não há base no cenário para alta após uma dose; mantenha cuidado monitorizado e avaliação especializada.'}
    ]}
  };
  const SALBUTAMOL_OPTIONS=[
    {id:'add',label:'Adicionar salbutamol nebulizado como adjuvante',correct:true,feedback:'Boa opção adjuvante. Não substitui insulina com glicose nem o plano de remoção.'},
    {id:'skip',label:'Não adicionar salbutamol neste momento',correct:true,feedback:'Opção aceitável. A prioridade continua sendo cálcio, insulina com glicose, remoção e monitorização. Salbutamol é adjuvante, não obrigatório.'}
  ];
  const RESPONSES={
    calcium:{title:'Resposta programada · 10 minutos',rows:[['ECG','QRS menos alargado: aproximadamente 130 ms; ondas T menos apiculadas.'],['Potássio','Permanece em 7,4 mEq/L: o cálcio protege o coração, mas não remove potássio.'],['Diurese','Oligúria persiste, cerca de 10 mL/h.'],['Glicemia','108 mg/dL antes da insulina.']]},
    shift:{title:'Resposta programada · 60 minutos',rows:[['ECG','Melhora parcial, sem resolução completa do risco.'],['Potássio','6,6 mEq/L neste ramo do cenário; ainda elevado.'],['Glicemia','92 mg/dL; mantenha controles seriados.'],['Diurese','10 mL/h; oligúria persiste.']]},
    removal:{title:'Resposta programada · 4 horas',rows:[['ECG','Sem nova piora, mas precisa de vigilância contínua.'],['Potássio',null],['Glicemia','Controle conforme série pós-insulina.'],['Diurese','Oligúria persiste; a diálise não implica recuperação imediata da função renal.']]}
  };
  function getStep(id){return STEPS.find(step=>step.id===id)||null;}
  function evaluateChoice(stepId,choiceId){
    if(stepId==='salbutamol-choice'){const option=SALBUTAMOL_OPTIONS.find(item=>item.id===choiceId);return option?{...option,actions:option.id==='add'?['salbutamol']:[]}:null;}
    const decision=DECISIONS[stepId],option=decision?.options.find(item=>item.id===choiceId);if(!option)return null;
    const correct=option.id===decision.correct;
    return {id:option.id,label:option.label,correct,actions:option.actions||[],feedback:option.feedback,expected:decision.options.find(item=>item.id===decision.correct).label,reference:decision.reference};
  }
  function getResponse(id,state){const item=RESPONSES[id];if(!item)return null;return {...item,rows:item.rows.map(([label,value])=>[label,id==='removal'&&label==='Potássio'?(state.flags?.definitiveRemoval?'5,8 mEq/L após início da terapia de remoção':'7,0 mEq/L, com rebound no ramo sem remoção'):value])};}
  return {STEPS,DECISIONS,SALBUTAMOL_OPTIONS,getStep,evaluateChoice,getResponse};
});
