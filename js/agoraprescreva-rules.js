/* Regras determinísticas desta prévia. Critérios de dose/preparo não validados ficam pendentes. */
(function(root){
  function gradePrescription(state){
    const pending=[], critical=[], positive=[];
    const domains=[
      {name:'Estabilização cardíaca',max:25,score:0},
      {name:'Redistribuição intracelular',max:25,score:0},
      {name:'Remoção do potássio',max:20,score:0},
      {name:'Monitorização e segurança',max:20,score:0},
      {name:'Organização da prescrição',max:10,score:0}
    ];
    const meds=state.meds||[], selected=state.actions||[];
    const contains=id=>selected.includes(id);
    const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    // IDs antigos podem variar entre versões; classificar também pelo nome visível evita
    // que uma ordem salva seja ignorada pela correção automática.
    const medicationKind=m=>{
      const key=normalize(`${m?.id||''} ${m?.name||''}`).replace(/[^a-z0-9]+/g,' ');
      if(key.includes('calcium gluconate')||key.includes('gluconato de calcio'))return 'calcium-gluconate';
      if(key.includes('calcium chloride')||key.includes('cloreto de calcio'))return 'calcium-chloride';
      if(key.includes('regular insulin')||key.includes('insulina regular'))return 'regular-insulin';
      if(key.includes('glucose 50')||key.includes('glicose 50'))return 'glucose-50';
      if(key.includes('glucose 10')||key.includes('glicose 10'))return 'glucose-10';
      if(key.includes('salbutamol'))return 'salbutamol';
      return '';
    };
    const has=id=>meds.find(m=>m.id===id||medicationKind(m)===id);
    const dose=m=>parseFloat(String(m?.dose||'').replace(',','.'));
    const missingFieldTip=(m,key)=>{
      const kind=medicationKind(m);
      if(key==='presentation')return kind==='salbutamol'
        ?'Como corrigir: registre a apresentação/concentração da solução para permitir conferir o volume a nebulizar.'
        :'Como corrigir: registre a apresentação ou concentração do produto que será administrado.';
      if(key==='dose'){
        if(kind==='salbutamol')return 'Como corrigir: registre a dose em mg. Para hipercalemia grave em adultos, a diretriz UKKA 2026 cita salbutamol nebulizado 10–20 mg como adjuvante; confirme o protocolo do serviço e a apresentação disponível.';
        if(kind==='regular-insulin')return 'Como corrigir: informe o valor e a unidade (UI) e compare com o esquema de referência deste caso; se usar outro esquema, deixe-o para validação clínica.';
        if(kind==='glucose-50')return 'Como corrigir: registre a quantidade de glicose e confira se dose, concentração e volume correspondem entre si; a referência deste caso usa 25 g (50 mL de glicose 50%).';
        if(kind==='calcium-gluconate')return 'Como corrigir: informe a dose e compare com o item de referência do caso (1 g ou 1.000 mg de gluconato de cálcio).';
        return 'Como corrigir: informe o valor da dose e confira-o com a referência clínica selecionada para o caso.';
      }
      if(key==='unit'){
        if(kind==='salbutamol')return 'Como corrigir: use mg para expressar a dose nebulizada. Para hipercalemia grave em adultos, a UKKA 2026 cita 10–20 mg como adjuvante; confirme o protocolo do serviço e registre a concentração para conferir o volume.';
        if(kind==='regular-insulin')return 'Como corrigir: selecione UI para a dose de insulina regular.';
        if(kind==='glucose-50'||kind==='glucose-10')return 'Como corrigir: registre a quantidade em g ou mL e confira a correspondência com a concentração da solução.';
        if(kind==='calcium-gluconate')return 'Como corrigir: registre a dose em g ou mg, mantendo a equivalência (1 g = 1.000 mg).';
        return 'Como corrigir: selecione a unidade compatível com a dose e a apresentação.';
      }
      if(key==='route'&&kind==='salbutamol')return 'Como corrigir: selecione via inalatória/nebulização e confira a dose em mg e o volume com a apresentação escolhida.';
      return 'Como corrigir: selecione a via prevista no esquema de referência e confira se ela corresponde ao medicamento e ao preparo registrados.';
    };
    meds.forEach(m=>{
      [['presentation','apresentação'],['dose','dose'],['unit','unidade'],['route','via']].forEach(([key,label])=>{
        if(key==='dose'&&['calcium-gluconate','regular-insulin','glucose-50'].includes(medicationKind(m)))return;
        if(!String(m[key]||'').trim())pending.push(`${m.name}: falta preencher ${label}. ${missingFieldTip(m,key)}`);
      });
    });
    const scoredMeds=new Set(['calcium-gluconate','calcium-chloride','regular-insulin','glucose-50','glucose-10','salbutamol']);
    meds.filter(m=>!scoredMeds.has(medicationKind(m))).forEach(m=>pending.push(`${m.name}: esta prévia ainda não consegue avaliar automaticamente este item. Como corrigir/conferir: complete apresentação, dose e unidade, via, preparo, volume, tempo/frequência e instruções; depois compare cada campo com a referência clínica e o protocolo do serviço. A atividade não presume dose nem considera o item validado sem essa conferência.`));

    const calcium=has('calcium-gluconate')||has('calcium-chloride');
    if(calcium){
      domains[0].score+=18;
      if(normalize(calcium.route)==='iv')domains[0].score+=4;
      else if(calcium.route){critical.push('Via registrada para o cálcio não corresponde à via IV esperada no cenário. Como corrigir: revise a ordem e selecione a via IV prevista na referência do caso.');pending.push('Revise a via do cálcio: a referência deste cenário espera administração IV. Como corrigir: abra o campo “Via”, selecione IV e confira novamente apresentação, dose e tempo antes de finalizar.');}
      if(!calcium.rate)pending.push('Cálcio: falta registrar o tempo/velocidade de administração. Como corrigir: preencha esse campo conforme a apresentação e a referência clínica adotada no serviço.');
      const calciumKind=medicationKind(calcium);
      if(calciumKind==='calcium-gluconate'){
        positive.push('Gluconato de cálcio reconhecido como estabilização da membrana cardíaca.');
        const exact=(dose(calcium)===1000&&normalize(calcium.unit)==='mg')||(dose(calcium)===1&&normalize(calcium.unit)==='g');
        if(exact)domains[0].score+=3;
        else if(Number.isFinite(dose(calcium))&&dose(calcium)>0){critical.push('Dose/unidade do gluconato de cálcio não corresponde ao item de referência (1.000 mg ou 1 g). Como corrigir: revise o valor e registre a equivalência correta antes de finalizar.');pending.push('Gluconato de cálcio: confira dose e unidade; neste caso, a referência é 1 g (1.000 mg). Ajuste os campos para que representem a mesma quantidade.');}
        else pending.push('Gluconato de cálcio: dose e unidade precisam ser preenchidas. Como corrigir: registre a dose de referência do caso, 1 g (1.000 mg), em uma unidade compatível.');
      }else if(calciumKind==='calcium-chloride')pending.push('Cloreto de cálcio selecionado. Como corrigir: consulte a referência clínica do serviço para dose, concentração, via e acesso antes de completar a ordem; esta alternativa não é pontuada automaticamente.');
    }else {critical.push('Não foi prescrita estabilização cardíaca apesar do QRS alargado no caso. Como corrigir: inclua o sal de cálcio indicado na referência do cenário e registre dose, unidade, via e tempo de administração.');pending.push('Estabilização cardíaca ausente: inclua o cálcio indicado para este cenário e complete apresentação, dose, unidade, via e tempo conforme a referência do curso.');}

    const insulin=has('regular-insulin'), glucose=has('glucose-50')||has('glucose-10');
    if(insulin){
      positive.push('Insulina regular reconhecida como medida de redistribuição intracelular do potássio (shift).');
      domains[1].score+=10;
      if(!Number.isFinite(dose(insulin))||dose(insulin)<=0)pending.push('Insulina regular: falta informar a dose. Como corrigir: registre o esquema de referência deste caso (10 UI) e selecione UI no campo “Unidade”; depois confira a via prevista.');
      else if(normalize(insulin.unit)!=='ui')pending.push(`Insulina regular: a dose foi registrada como ${insulin.dose} ${insulin.unit||'(sem unidade)'}, mas a referência do caso é 10 UI. Como corrigir: informe a dose em UI; se a escolha for intencionalmente diferente, documente o esquema adotado para validação clínica.`);
      else if(dose(insulin)===10)domains[1].score+=4;
      else pending.push(`Insulina regular: a dose registrada (${insulin.dose} UI) difere da referência de 10 UI deste caso. Como corrigir: confira o valor; se a escolha for intencional, documente o esquema adotado e encaminhe para validação clínica.`);
      if(normalize(insulin.route)==='iv')domains[1].score+=2;
      else if(insulin.route){critical.push('Via da insulina registrada não corresponde à via IV esperada no item de referência. Como corrigir: revise a via e selecione IV conforme o esquema deste caso.');pending.push('Insulina regular: revise a via; a referência deste caso espera IV. Corrija o campo “Via” e confira a associação com glicose e monitorização glicêmica.');}
      if(!glucose){critical.push('Insulina registrada sem prescrição associada de glicose para prevenção de hipoglicemia. Como corrigir: acrescente a glicose prevista no esquema e registre o plano de monitorização glicêmica.');pending.push('Insulina sem glicose associada: acrescente a glicose prevista no esquema para reduzir o risco de hipoglicemia e registre o controle glicêmico seriado.');}
      else if(medicationKind(glucose)==='glucose-50'){
        positive.push('Glicose reconhecida como medida de prevenção de hipoglicemia associada à insulina.');
        const exact=(dose(glucose)===25&&normalize(glucose.unit)==='g')||(dose(glucose)===50&&normalize(glucose.unit)==='ml');
        if(exact)domains[1].score+=5;
        else pending.push('Glicose 50%: a quantidade registrada não corresponde claramente à referência (25 g = 50 mL). Como corrigir: confira concentração, dose e volume e registre valores equivalentes; mantenha o controle glicêmico após insulina.');
      }else {positive.push('Glicose reconhecida como medida de prevenção de hipoglicemia associada à insulina.');pending.push('Glicose 10% selecionada. Como corrigir: registre o volume, a velocidade e a duração conforme o protocolo validado para este paciente; mantenha a monitorização glicêmica após insulina.');}
    }
    if(has('salbutamol')){
      positive.push('Salbutamol reconhecido como beta-2 agonista adjuvante para redistribuição intracelular do potássio (shift).');
      domains[1].score+=4;
      const salbutamol=has('salbutamol');
      if(salbutamol.unit&&normalize(salbutamol.unit)!=='mg')pending.push('Salbutamol: a unidade registrada não está em mg. Como corrigir: no campo “Unidade”, selecione mg para a dose nebulizada; em seguida, use a concentração da apresentação para calcular e registrar separadamente o volume a nebulizar.');
      if(salbutamol.route&&!['inalatoria','inalatoria nebulizacao','nebulizacao'].includes(normalize(salbutamol.route))) {critical.push('Via do salbutamol não corresponde à nebulização prevista neste cenário. Como corrigir: ajuste para via inalatória/nebulização conforme protocolo do serviço.');pending.push('Salbutamol: a via registrada não corresponde à nebulização prevista. Corrija “Via” para inalatória/nebulização e confira a apresentação.');}
      if(Number.isFinite(dose(salbutamol))&&dose(salbutamol)>0&&(dose(salbutamol)<10||dose(salbutamol)>20))pending.push('Salbutamol: a dose difere da faixa de referência UKKA 2026 para hipercalemia grave em adultos (10–20 mg nebulizados como adjuvante). Como corrigir: confira o valor em mg com o protocolo do serviço; se mantiver uma dose diferente, registre a justificativa para revisão clínica.');
      if(!String(salbutamol.volume||'').trim())pending.push('Salbutamol: falta informar o volume a nebulizar. Como corrigir: use a apresentação/concentração registrada para converter a dose em mg no volume adequado ao nebulizador, conforme protocolo local.');
      if(!String(salbutamol.frequency||'').trim())pending.push('Salbutamol: falta informar a frequência ou que se trata de uma administração única. Como corrigir: preencha “Frequência” com a administração única ou com o intervalo definido no protocolo do serviço.');
      if(!String(salbutamol.instructions||'').trim())pending.push('Salbutamol: faltam instruções de administração/monitorização. Como corrigir: no campo “Instruções”, registre que será nebulizado como medida adjuvante de redistribuição e inclua as observações de segurança previstas no protocolo local.');
    }
    domains[1].score=Math.min(domains[1].max,domains[1].score);

    if(contains('nephrology')&&contains('hemodialysis'))domains[2].score=20;
    else if(contains('nephrology')||contains('hemodialysis'))domains[2].score=10;
    else {critical.push('Não foi registrada estratégia de remoção do potássio para DRC avançada com oligúria. Como corrigir: registre avaliação urgente e uma estratégia de remoção definitiva conforme cenário e protocolo clínico.');pending.push('Remoção definitiva não registrada: inclua a avaliação urgente e a estratégia de remoção adequada à DRC avançada e à oligúria, segundo o protocolo do serviço.');}

    const monitorIds=['continuous-ecg','control-ecg','glucose-monitor','urine-output','repeat-potassium'];
    domains[3].score=Math.round(20*monitorIds.filter(contains).length/monitorIds.length);
    if(insulin&&!contains('glucose-monitor')){critical.push('Insulina registrada sem plano de controle glicêmico seriado. Como corrigir: selecione controle glicêmico seriado e registre frequência/tempo conforme protocolo local.');pending.push('Monitorização glicêmica ausente: após insulina, selecione controle glicêmico seriado e registre a frequência/tempo definidos pelo protocolo do serviço.');}

    const filled=meds.filter(m=>m.dose||m.route||m.frequency).length;
    domains[4].score=meds.length?Math.min(10,Math.round(10*filled/meds.length)):0;
    const total=domains.reduce((sum,d)=>sum+d.score,0);
    return {domains,total,critical,pending,positive,meetsPreviewThreshold:total>=80&&!critical.length&&!pending.length};
  }
  root.AgoraMedPrescriptionRules={gradePrescription};
  if(typeof module!=='undefined'&&module.exports)module.exports={gradePrescription};
})(typeof window!=='undefined'?window:globalThis);
