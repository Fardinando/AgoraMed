/* Oficina educacional. Conteúdo e gabaritos locais; nenhum dado de paciente é real. */
(() => {
  'use strict';
  const COURSE = 'https://www.andersongleryston.med.br/abertura.html?id=fa3c5d8d-94c4-4321-be7a-1cc45741a983';
  const KEY = 'agoraprescreva-hipercalemia-v1';
  const UKKA = 'https://guidelines.ukkidney.org/hyperkalaemia/';
  const UKKA_HOSP = 'https://guidelines.ukkidney.org/hyperkalaemia/6-summary-of-clinical-practice-guideline-for-hyperkalaemia/6-2-section-ii-hospital/';
  const UPTODATE = 'https://www.uptodate.com/contents/treatment-and-prevention-of-hyperkalemia-in-adults';
  const CASES = [
    {
      title:'Gluconato de cálcio', subtitle:'Estabilização cardíaca diante de alteração no ECG',
      patient:'Rafael M., 64 anos · emergência · acesso venoso periférico calibroso e pérvio',
      scenario:'Potássio confirmado em 7,1 mEq/L, ondas T apiculadas e alargamento do QRS. Está consciente e não está em parada cardiorrespiratória.', tags:['ECG alterado','K⁺ 7,1 mEq/L','Sem parada'],
      objective:'Transformar a dose de gluconato de cálcio em uma ordem completa, conferindo concentração, número de ampolas, via, tempo e monitorização.',
      question:'Como você prescreveria o cálcio para estabilizar a membrana cardíaca?',
      fields:[
        field('Medicamento','gluconato',[['gluconato','Gluconato de cálcio'],['cloreto','Cloreto de cálcio'],['nenhum','Não administrar cálcio apesar da alteração no ECG']], 'A UKKA recomenda gluconato de cálcio para sinais eletrocardiográficos em pacientes fora de parada. O cloreto é preferido em parada ou peri-parada; os sais não são intercambiáveis por volume.'),
        field('Apresentação / concentração','10',[['10','Solução injetável 10% · 100 mg/mL'],['20','Solução injetável 20% · 200 mg/mL'],['oral','Comprimido de cálcio']], 'A referência didática é gluconato de cálcio a 10%, equivalente a 100 mg/mL.'),
        field('Dose e cálculo','30',[['30','30 mL = 3 ampolas de 10 mL'],['10','10 mL = 1 ampola'],['60','60 mL = 6 ampolas']], 'A dose UKKA é 30 mL. Com ampolas de 10 mL: 30 ÷ 10 = 3 ampolas.'),
        field('Via','iv',[['iv','Intravenosa'],['im','Intramuscular'],['sc','Subcutânea']], 'A administração é intravenosa. As vias IM e SC podem causar lesão tecidual.'),
        field('Preparo e tempo','sem-diluicao',[['sem-diluicao','Administrar sem diluição, lentamente, em 10 minutos'],['bolo','Fazer bolus IV rápido em menos de 1 minuto'],['bicarbonato','Misturar na mesma seringa com bicarbonato']], 'Para este esquema, a UKKA orienta gluconato 10% sem diluição, IV em 10 minutos. Não misture com bicarbonato ou fosfato; confirme acesso pérvio.'),
        field('Monitorização e reavaliação','ecg',[['ecg','ECG contínuo e pressão durante a dose; observar acesso e repetir ECG após'],['sem-monitor','Sem monitorização se o paciente estiver consciente'],['potassio-apenas','Repetir apenas o potássio no dia seguinte']], 'Monitore ECG e estado clínico durante a administração, inspecione o acesso e reavalie o ECG após a dose. O cálcio protege o coração temporariamente; não reduz o potássio sérico.')
      ],
      order:'Gluconato de cálcio 10% (100 mg/mL), 30 mL (3 ampolas de 10 mL), IV, sem diluição, em 10 minutos. Monitorizar ECG e pressão arterial durante a administração, observar o acesso venoso e repetir o ECG após a dose.',
      rationale:['A concentração de referência da estação é 10% = 100 mg/mL.','30 mL correspondem a três ampolas de 10 mL.','O cálcio antagoniza temporariamente a toxicidade elétrica; outras intervenções redistribuem ou removem K⁺.','Não administrar rapidamente; confirmar acesso venoso e compatibilidade.'], source:UKKA_HOSP
    },
    {
      title:'Insulina regular', subtitle:'Redistribuição intracelular do potássio',
      patient:'Lúcia P., 58 anos · emergência · doença renal crônica e potássio de 6,8 mEq/L',
      scenario:'Hipercalemia grave confirmada. Glicemia antes do tratamento: 142 mg/dL (7,9 mmol/L). ECG monitorizado; sem parada cardiorrespiratória.', tags:['K⁺ 6,8 mEq/L','Glicemia 142 mg/dL','Insulina IV'],
      objective:'Escrever a ordem de insulina regular com glicose, converter unidades em volume da apresentação e programar vigilância de hipoglicemia e rebote do potássio.',
      question:'Como você prescreveria a insulina regular com glicose para redistribuir o potássio?',
      fields:[
        field('Medicamento','regular',[['regular','Insulina regular/solúvel'],['nph','Insulina NPH'],['glargina','Insulina glargina']], 'A recomendação UKKA é insulina solúvel/regular IV associada à glicose; insulinas basal e intermediária não substituem esse esquema.'),
        field('Apresentação','u100',[['u100','Solução injetável 100 unidades/mL'],['u40','Solução injetável 40 unidades/mL'],['caneta','Caneta de insulina basal']], 'Para o exercício, a apresentação é 100 unidades/mL. Conferir a concentração no rótulo e usar seringa de insulina.'),
        field('Dose e cálculo','10u',[['10u','10 unidades = 0,1 mL da solução 100 unidades/mL'],['5u','5 unidades = 0,05 mL'],['100u','100 unidades = 1 mL']], 'A dose UKKA é 10 unidades. Na apresentação 100 unidades/mL, 10 ÷ 100 = 0,1 mL. A dose é em unidades, nunca em mL isoladamente.'),
        field('Glicose associada','25g',[['25g','25 g de glicose IV junto ao esquema'],['sem-glicose','Não usar glicose porque a paciente tem diabetes'],['5g','5 g de glicose']], 'A UKKA recomenda 25 g de glicose com 10 unidades. Diabetes não elimina risco de hipoglicemia; avaliar glicemia antes da dose.'),
        field('Apresentação da glicose','g50-50',[['g50-50','Glicose 50%: 50 mL fornecem 25 g (conferir concentração e volume da ampola)'],['g50-10','Glicose 50%: 10 mL fornecem 25 g'],['g5-50','SG 5%: 50 mL fornecem 25 g']], 'Glicose 50% contém 0,5 g/mL; portanto, 25 g correspondem a 50 mL. O volume de ampolas depende da apresentação disponível. Para manutenção, o caso seguinte converte glicose 10% em SG 5%.'),
        field('Tempo e administração','15-30',[['15-30','Infusão IV ao longo de 15–30 min, conforme protocolo local'],['sc','Aplicar 10 unidades por via subcutânea'],['iv-rapida','Injetar a insulina IV rapidamente sem conferir a solução de glicose']], 'A insulina regular é administrada IV com glicose; este exercício usa infusão em 15–30 minutos. Conferir preparo e protocolo institucional; não confundir unidades com mililitros.'),
        field('Monitorização','glicemia-potassio',[['glicemia-potassio','Glicemia antes e em 30, 60, 90, 120, 180, 240, 300 e 360 min; K⁺ em 1, 2, 4, 6 e 24 h'],['sem-repetir','Não repetir glicemia se a primeira estiver normal'],['so-24','Reavaliar glicemia e potássio somente em 24 h']], 'Hipoglicemia pode ocorrer nas primeiras horas, especialmente na DRC. A UKKA recomenda glicemia seriada até 6 h e potássio em 1, 2, 4, 6 e 24 h, ajustando ao protocolo local.')
      ],
      order:'Insulina regular 10 unidades (0,1 mL da solução 100 unidades/mL) IV, associada a 25 g de glicose IV, conforme protocolo institucional de preparo/infusão. Checar glicemia antes e seriada até 6 h; monitorar K⁺ em 1, 2, 4, 6 e 24 h e tratar hipoglicemia prontamente.',
      rationale:['A insulina desloca K⁺ para o meio intracelular; ela não remove potássio do organismo.','Dez unidades equivalem a 0,1 mL quando a solução contém 100 unidades/mL.','A glicose reduz o risco de hipoglicemia, mas não o elimina, sobretudo na insuficiência renal.','Acompanhe glicemia por até 6 horas e K⁺ para detectar resposta insuficiente ou rebote.'], source:UKKA_HOSP
    },
    {
      title:'Glicose', subtitle:'Prevenção de hipoglicemia após insulina',
      patient:'Lúcia P., 58 anos · após receber insulina regular IV para hipercalemia grave',
      scenario:'Glicemia pré-tratamento de 108 mg/dL (6,0 mmol/L), abaixo de 126 mg/dL. A paciente tem DRC e permanece sob monitorização.', tags:['Glicemia <126 mg/dL','Pós-insulina','Prevenir hipoglicemia'],
      objective:'Prescrever glicose de manutenção prevista no esquema UKKA e converter a infusão de glicose 10% para soro glicosado 5% disponível localmente.',
      question:'Como você prescreveria a glicose de manutenção após a insulina?',
      fields:[
        field('Indicação','sim',[['sim','Sim: glicemia pré-tratamento <126 mg/dL (<7 mmol/L)'],['nao','Não: a paciente não usa insulina crônica'],['so-diabetes','Somente se a paciente tiver diabetes']], 'A UKKA indica iniciar glicose 10% quando a glicemia pré-tratamento é <7 mmol/L (aproximadamente 126 mg/dL), junto à vigilância seriada.'),
        field('Meta de glicose','25g',[['25g','25 g ao longo de 5 horas'],['5g','5 g em dose única'],['50g','50 g em bolus rápido']], 'A manutenção UKKA corresponde a 25 g adicionais em 5 horas, titulando conforme glicemia e contexto clínico.'),
        field('Equivalência com SG 5%','sg5',[['sg5','SG 5% a 100 mL/h por 5 h = 500 mL = 25 g'],['sg5-50','SG 5% a 50 mL/h por 5 h = 250 mL = 12,5 g'],['sg50','SG 50% a 50 mL/h por 5 h = 25 g']], 'Glicose 5% contém 5 g em 100 mL. Para fornecer 5 g/h, são 100 mL/h; em 5 h, 500 mL fornecem 25 g. Equivale à glicose 10% a 50 mL/h, com dobro do volume.'),
        field('Via e duração','iv-5h',[['iv-5h','Infusão IV por 5 horas, com reavaliação e ajuste'],['oral','Via oral independentemente do estado clínico'],['iv-bolus','Bolus IV rápido de 500 mL']], 'A manutenção é infusão IV controlada, não um bolus. Avalie risco de sobrecarga e ajuste à condição clínica/protocolo.'),
        field('Monitorização','serie',[['serie','Glicemia seriada até 6 h; ajustar a infusão e tratar hipoglicemia'],['uma','Uma glicemia ao término é suficiente'],['sem-controle','Sem controles se houver glicose em infusão']], 'A infusão reduz o risco, mas não substitui os controles seriados. UKKA recomenda glicemia em 0, 30, 60, 90, 120, 180, 240, 300 e 360 minutos.')
      ],
      order:'Se glicemia pré-tratamento <126 mg/dL: glicose 10% a 50 mL/h por 5 h (250 mL; 25 g). Alternativa equivalente para o exercício, se compatível com o balanço hídrico: SG 5% a 100 mL/h por 5 h (500 mL; 25 g). Monitorar glicemia seriada e ajustar conforme protocolo.',
      rationale:['O limiar UKKA para manutenção é glicemia pré-tratamento <7 mmol/L, aproximadamente 126 mg/dL.','A glicose 10% a 50 mL/h entrega 5 g/h; em 5 h, totaliza 25 g.','Para a mesma quantidade de glicose, SG 5% exige o dobro do volume: 100 mL/h e 500 mL em 5 h.','Avalie balanço hídrico, particularmente na DRC ou insuficiência cardíaca.'], source:UKKA_HOSP
    },
    {
      title:'Salbutamol', subtitle:'Terapia adjuvante por nebulização',
      patient:'Rogério S., 49 anos · pronto atendimento · K⁺ 6,3 mEq/L confirmado, sem broncoespasmo',
      scenario:'Hipercalemia moderada, ECG sem sinais de toxicidade e paciente estável. A equipe escolheu salbutamol como adjuvante a outras medidas.', tags:['K⁺ 6,3 mEq/L','Adjuvante','Sem broncoespasmo'],
      objective:'Escrever dose e via nebulizada para hipercalemia e reconhecer por que a bombinha de 100 microgramas/jato não deve ser convertida em centenas de jatos.',
      question:'Como você prescreveria salbutamol como adjuvante para reduzir temporariamente o potássio?',
      fields:[
        field('Medicamento','salbutamol',[['salbutamol','Salbutamol'],['formoterol','Formoterol'],['ipratropio','Ipratrópio isolado']], 'Salbutamol nebulizado é o beta-agonista adjuvante recomendado pela UKKA para hipercalemia; não deve ser usado sozinho em casos graves.'),
        field('Dose para o caso','10mg',[['10mg','10 mg por nebulização; faixa UKKA 10–20 mg'],['100mcg','100 microgramas uma vez'],['2mg','2 mg por via oral']], 'A UKKA sugere 10–20 mg nebulizados para hipercalemia grave e considera a mesma faixa como adjuvante em casos moderados. A estação fixa 10 mg.'),
        field('Forma e via','nebulizada',[['nebulizada','Solução para nebulização, via inalatória por nebulizador'],['bombinha','Bombinha de 100 mcg/jato como substituição direta da nebulização'],['iv','Via intravenosa de rotina']], 'O esquema de hipercalemia é nebulizado. A bombinha de 100 mcg/jato não é conversão prática direta: 10 mg corresponderiam matematicamente a 100 jatos, uma forma insegura e não recomendada de executar o protocolo.'),
        field('Apresentação e cálculo','5mgml',[['5mgml','Se disponível solução 5 mg/mL: 10 mg = 2 mL; conferir rótulo e volume da unidade'],['100mcg','100 mcg/jato: administrar 100 jatos'],['concentrado','Usar qualquer concentração sem calcular volume']], 'A apresentação para nebulização varia. Se o produto local for 5 mg/mL, 10 mg correspondem a 2 mL; confira concentração, volume da unidade e instruções do nebulizador antes de prescrever.'),
        field('Papel terapêutico','adjunto',[['adjunto','Associar às medidas indicadas; não usar como monoterapia da hipercalemia grave'],['mono','Usar sozinho mesmo com K⁺ ≥6,5 mEq/L'],['retira','Considerar que elimina K⁺ do organismo']], 'Salbutamol promove redistribuição temporária, não remoção corporal. Em hipercalemia grave, a UKKA recomenda que não seja monoterapia.'),
        field('Monitorização','fc',[['fc','Monitorar frequência cardíaca, tremor, resposta clínica e K⁺; considerar menor resposta com beta-bloqueador'],['sem','Sem monitorização, pois é inalatório'],['so-saturacao','Monitorar apenas saturação de oxigênio']], 'Observe taquicardia, tremor e resposta; reveja contraindicações e uso de beta-bloqueadores. Reavalie K⁺ no cronograma da hipercalemia.')
      ],
      order:'Salbutamol solução para nebulização, 10 mg por via inalatória em nebulizador, como adjuvante às medidas indicadas. Conferir concentração e volume da apresentação local; não substituir automaticamente por centenas de jatos da bombinha de 100 mcg. Monitorar frequência cardíaca e resposta clínica.',
      rationale:['A dose UKKA é 10–20 mg nebulizados como adjuvante em hipercalemia grave; pode ser considerada na moderada.','A “bombinha” de 100 mcg/jato é uma apresentação para uso inalatório habitual, não um meio prático de fornecer dose aguda de 10 mg.','A resposta pode ser menor em pessoas que usam beta-bloqueadores ou agonistas beta com frequência.','O salbutamol desloca K⁺ temporariamente e não substitui tratamento definitivo.'], source:'https://guidelines.ukkidney.org/hyperkalaemia/15-appendices/15-6-appendix-4c-drug-administration-and-safety-salbutamol/'
    },
    {
      title:'Furosemida', subtitle:'Remoção de potássio quando há diurese e congestão',
      patient:'Marta C., 72 anos · enfermaria · insuficiência cardíaca descompensada e edema pulmonar leve',
      scenario:'K⁺ 5,9 mEq/L, congestão clínica, pressão 146/82 mmHg, creatinina 1,8 mg/dL e diurese presente. Não usa diurético de alça cronicamente.', tags:['Congestão','Diurese preservada','Sem hipotensão'],
      objective:'Converter uma dose IV de furosemida em volume da ampola e prescrever acompanhamento da diurese, pressão, função renal e eletrólitos.',
      question:'Como você prescreveria furosemida para tratar a congestão e favorecer a excreção urinária de potássio?',
      fields:[
        field('Indicação no cenário','indicada',[['indicada','Congestão com diurese presente e pressão adequada: considerar como adjuvante'],['hipovolemia','Usar mesmo com hipovolemia e oligúria'],['monoterapia','Usar como única medida para hipercalemia grave com ECG alterado']], 'Diurético de alça pode ajudar em pacientes não oligúricos e normo/hipervolêmicos, especialmente se houver outra indicação como congestão. Evite em hipovolemia ou oligúria.'),
        field('Medicamento','furosemida',[['furosemida','Furosemida'],['espironolactona','Espironolactona'],['hidroclorotiazida','Hidroclorotiazida']], 'Furosemida é o diurético de alça usado neste cenário. Espironolactona pode aumentar o potássio.'),
        field('Apresentação do exercício','20-2',[['20-2','Solução injetável 20 mg/2 mL (10 mg/mL)'],['40-1','Solução injetável 40 mg/1 mL'],['comprimido','Comprimido 40 mg por via oral apesar do edema agudo']], 'A oficina adota ampola de 20 mg em 2 mL; apresentações podem variar, então a concentração real deve ser conferida no rótulo.'),
        field('Dose e cálculo','40-4',[['40-4','40 mg = 4 mL = 2 ampolas de 20 mg/2 mL'],['20-2','20 mg = 2 mL = 1 ampola'],['80-8','80 mg = 8 mL = 4 ampolas']], 'Para a pessoa sem uso crônico de diurético, o caso didático propõe 40 mg IV. Com 10 mg/mL, 40 mg ÷ 10 mg/mL = 4 mL (duas ampolas de 2 mL). A dose real depende de exposição prévia e resposta.'),
        field('Tempo, via e administração','iv-2min',[['iv-2min','40 mg IV lentamente, em pelo menos 2 min, se compatível com bula e protocolo local'],['im','Intramuscular'],['iv-rapida','Bolus IV rápido sem observar pressão']], 'Para 40 mg, a estação propõe administração IV lenta em pelo menos 2 minutos, condicionada à bula/protocolo do produto disponível. A velocidade máxima varia com dose, função renal e apresentação.'),
        field('Reavaliação','diurese',[['diurese','Registrar diurese e balanço; reavaliar PA, creatinina, Na⁺, K⁺ e congestão antes de repetir'],['repetir-automatico','Repetir a mesma dose em horário fixo sem reavaliação'],['so-potassio','Acompanhar só o potássio']], 'Responda à congestão e à diurese observada. Reavalie pressão, função renal e eletrólitos; não existe garantia de que furosemida isolada normalize o K⁺.')
      ],
      order:'Furosemida 40 mg (4 mL da solução 10 mg/mL; 2 ampolas de 20 mg/2 mL), IV lentamente conforme bula/protocolo local. Registrar diurese e balanço; reavaliar pressão arterial, congestão, creatinina, sódio e potássio antes de nova dose.',
      rationale:['A furosemida é escolhida pela congestão, pela pressão adequada e pela diurese presente.','A dose de 40 mg IV é um exemplo inicial do cenário, não uma dose universal; uso crônico pode exigir ajuste.','A remoção de K⁺ depende da entrega distal e do fluxo urinário. Hipovolemia ou oligúria pode tornar a estratégia ineficaz ou prejudicial.','Avalie resposta clínica, função renal, eletrólitos e balanço antes de repetir.'], source:'https://guidelines.ukkidney.org/hyperkalaemia/10-1-i-hyperkalaemia-in-the-community-guidelines-1-1-12-1/10-1-7-i-hyperkalaemia-in-the-community-guideline-7-1/'
    },
    {
      title:'Bicarbonato de sódio', subtitle:'Acidemia grave: indicar, individualizar e monitorar',
      patient:'Paulo R., 61 anos · terapia intensiva · lesão renal aguda, hipercalemia e acidemia persistente',
      scenario:'pH 7,12, bicarbonato 9 mEq/L, K⁺ 6,7 mEq/L e congestão. A equipe discute bicarbonato IV como tratamento da acidemia, não como rotina para qualquer hipercalemia.', tags:['pH 7,12','HCO₃⁻ 9 mEq/L','Risco de sobrecarga'],
      objective:'Reconhecer que a apresentação 8,4% é concentrada, calcular o conteúdo por mL e não transformar uma concentração conhecida em dose universal sem alvo clínico.',
      question:'Como você registraria uma decisão segura sobre bicarbonato IV neste caso?',
      fields:[
        field('Papel na hipercalemia','nao-rotina',[['nao-rotina','Não usar rotineiramente para hipercalemia; considerar apenas por indicação individual de acidemia'],['rotina','Administrar a todo paciente com K⁺ ≥6,5'],['substitui-calcio','Substituir cálcio IV se houver alteração no ECG']], 'A UKKA sugere não usar bicarbonato IV rotineiramente para tratamento agudo da hipercalemia. Uma acidemia importante pode exigir discussão específica, sem presumir benefício automático sobre o K⁺.'),
        field('Apresentação','84',[['84','Solução injetável 8,4% = 1 mEq/mL'],['4','Solução injetável 4,2% = 0,5 mEq/mL'],['84-0','8,4% = 8,4 mEq/mL']], 'Na apresentação 8,4%, cada mL contém aproximadamente 1 mEq de bicarbonato e de sódio. O rótulo da apresentação local deve ser conferido.'),
        field('Dose e cálculo','individualizar',[['individualizar','Não há dose universal para hipercalemia: definir indicação, alvo gasométrico, quantidade e velocidade com equipe responsável'],['50ml','Prescrever automaticamente 50 mL para todo adulto'],['100ml','Prescrever 100 mL em bolus rápido para normalizar K⁺']], 'A UKKA não recomenda bicarbonato de rotina para hipercalemia e não fornece uma dose universal para este cenário. Com 8,4% conhecido, o volume equivale numericamente a mEq (1 mL ≈ 1 mEq), mas dose/velocidade precisam de alvo individual.'),
        field('Via e administração','iv-protocolo',[['iv-protocolo','IV somente com plano individual e monitorização; evitar misturar com cálcio na mesma linha'],['oral','Via oral para corrigir acidemia grave rapidamente'],['mesma-seringa','Misturar na mesma seringa com gluconato de cálcio']], 'Bicarbonato concentrado é IV sob prescrição definida. Soluções alcalinas podem precipitar com cálcio; usar acesso/linha compatível e lavagem conforme protocolo.'),
        field('Riscos e reavaliação','gasometria',[['gasometria','Repetir gasometria e acompanhar Na⁺, volume, ventilação/CO₂, Ca²⁺ e K⁺; suspender/ajustar por resposta'],['so-potassio','Monitorar apenas K⁺'],['sem-reavaliar','Não repetir gasometria após início']], 'Bicarbonato traz carga de sódio e pode piorar volume/congestão; também altera pH, CO₂ e cálcio ionizado. Reavaliar parâmetros clínicos e laboratoriais após intervenção.')
      ],
      order:'Não emitir dose automática de bicarbonato para “baixar o potássio”. Para acidemia grave, registrar indicação, alvo de pH/bicarbonato, dose e velocidade individualizadas pela equipe responsável; 8,4% contém aproximadamente 1 mEq/mL. Monitorar gasometria, Na⁺, volume, CO₂/ventilação, Ca²⁺ e K⁺.',
      rationale:['O bicarbonato não é tratamento agudo de rotina para toda hipercalemia.','A apresentação 8,4% contém cerca de 1 mEq/mL, o que facilita o cálculo depois que a dose foi definida; isso não define a dose por si só.','A carga de sódio e volume merece atenção, sobretudo em congestão e disfunção renal.','Para esta estação, a prescrição correta é documentar a indicação e individualizar dose/alvo, não decorar um bolus universal.'], source:'https://guidelines.ukkidney.org/hyperkalaemia/11-1-ii-hyperkalaemia-in-hospital/11-1-4-ii-hyperkalaemia-in-hospital-16-1-16-6/'
    },
    {
      title:'Ciclossilicato de zircônio sódico', subtitle:'Quelante oral no manejo agudo, sem atrasar medidas imediatas',
      patient:'Ana V., 67 anos · emergência · DRC avançada · K⁺ 6,8 mEq/L',
      scenario:'Hipercalemia grave confirmada. A equipe já iniciou estabilização e redistribuição. Há prescrição institucional e o produto está disponível no serviço.', tags:['K⁺ ≥6,5 mEq/L','Via oral','Tratamento concomitante'],
      objective:'Prescrever dose de correção oral, quantidade de sachês, preparo da suspensão e intervalo de outros medicamentos.',
      question:'Como você prescreveria o ciclossilicato de zircônio sódico para a fase de correção?',
      fields:[
        field('Medicamento','szc',[['szc','Ciclossilicato de zircônio sódico'],['patiromer','Patiromer'],['resina','Resina de troca como primeira medida imediata']], 'A recomendação UKKA para hipercalemia aguda grave inclui ciclossilicato de zircônio sódico. Ele não substitui cálcio quando indicado nem as medidas de redistribuição.'),
        field('Apresentação','5g-sache',[['5g-sache','Pó para suspensão oral em sachê de 5 g'],['10mg-ml','Solução injetável 10 mg/mL'],['comprimido','Comprimido de 10 g']], 'A apresentação é pó oral em sachês de 5 g e 10 g. A estação adota o sachê de 5 g para treinar o número de unidades.'),
        field('Dose de correção','10g-tds',[['10g-tds','10 g por via oral, 3 vezes ao dia; 2 sachês de 5 g por dose'],['5g-dia','5 g uma vez ao dia como correção da hipercalemia grave'],['30g-bolus','30 g em dose única']], 'A UKKA recomenda 10 g três vezes ao dia na fase de correção até normocalemia. Com sachês de 5 g, são 2 sachês por tomada.'),
        field('Duração e posição no plano','ate72',[['ate72','Fase de correção até K⁺ normal; reavaliar diariamente e não ultrapassar 72 h sem plano de continuidade'],['indefinida','Manter 10 g três vezes ao dia indefinidamente'],['esperar','Aguardar o quelante agir antes de tratar alterações no ECG']], 'A fase de correção costuma ser limitada a até 72 h; monitorar K⁺ e definir continuidade. Nunca atrase intervenções imediatas por esperar o quelante oral.'),
        field('Preparo e espaçamento','agua-45',[['agua-45','Dispersar em cerca de 45 mL de água, mexer e ingerir a suspensão turva; separar 2 h de fármacos orais relevantes'],['misturar-seco','Engolir o pó seco junto com toda a medicação oral'],['suco','Misturar em qualquer bebida sem revisar interação']], 'O pó é suspenso, não dissolvido: misture em aproximadamente 45 mL de água e beba ainda turvo. Separe pelo menos 2 horas de medicamentos orais com absorção dependente do pH gástrico, conforme orientação UKKA/bula.'),
        field('Monitorização','k-sodio-edema',[['k-sodio-edema','K⁺ seriado, Na⁺/edema e outros tratamentos concomitantes; reavaliar necessidade de continuar'],['so-glicemia','Monitorar só glicemia'],['sem-monitor','Não repetir eletrólitos após quelante']], 'Reavalie potássio e resposta do plano; acompanhe sódio/edema, especialmente em insuficiência cardíaca e renal.')
      ],
      order:'Ciclossilicato de zircônio sódico 10 g por via oral, três vezes ao dia (2 sachês de 5 g por dose), fase de correção até normalização do K⁺, geralmente por até 72 h; reavaliar diariamente. Suspender cada dose em aproximadamente 45 mL de água, mexer e ingerir turvo. Separar 2 h de medicamentos orais relevantes.',
      rationale:['O ciclossilicato é um quelante oral para remoção de potássio; não protege imediatamente o miocárdio.','Na fase de correção, 10 g por dose equivalem a dois sachês de 5 g.','O esquema agudo é três vezes ao dia, com reavaliação e limite de tempo; não confundir com dose de manutenção.','O produto traz sódio e pode afetar edema; acompanhe resposta, volume e demais medicamentos.'], source:'https://guidelines.ukkidney.org/hyperkalaemia/15-appendices/15-8-appendix-4e-drug-administration-and-safety-sodium-zirconium-cyclosilicate/'
    },
    {
      title:'Ciclossilicato · continuidade', subtitle:'Manutenção após a fase de correção',
      patient:'Sérgio F., 70 anos · ambulatório de nefrologia · DRC avançada e hipercalemia persistente',
      scenario:'Após fase aguda tratada, K⁺ estável em 5,6 mEq/L, paciente sem sintomas e sem alteração no ECG. A equipe planeja manejo crônico e seguimento.', tags:['K⁺ 5,6 mEq/L','Sem urgência clínica','Plano ambulatorial'],
      objective:'Diferenciar dose de manutenção da dose aguda, prescrever início e titulação, e definir monitorização e revisão de causas reversíveis.',
      question:'Como você escreveria a prescrição de manutenção e o seguimento?',
      fields:[
        field('Momento terapêutico','manutencao',[['manutencao','Manutenção após estabilização, não fase de correção aguda'],['agudo','Manter 10 g três vezes ao dia por meses'],['sem-tratar','Interromper seguimento porque K⁺ é menor que 6,0']], 'Este cenário é ambulatorial estável. Não prolongue a dose de correção 10 g três vezes ao dia como manutenção.'),
        field('Dose inicial','5g-dia',[['5g-dia','5 g por via oral uma vez ao dia'],['10g-tds','10 g três vezes ao dia'],['15g-bolus','15 g em dose única semanal']], 'UKKA descreve início de manutenção com 5 g uma vez ao dia, ajustando segundo potássio e contexto.'),
        field('Apresentação e preparo','5g-sache',[['5g-sache','Sachê de 5 g em suspensão oral com água'],['iv','Ampola IV de 5 g'],['comprimido','Comprimido de 5 g']], 'É pó para suspensão oral; misture em água, agite e ingira a suspensão. Conferir apresentação aprovada/local.'),
        field('Titulação','max10',[['max10','Titular pela resposta laboratorial; UKKA sugere até 10 g/dia ou 5 g em dias alternados conforme necessidade'],['fixo15','Aumentar automaticamente a 15 g/dia'],['sem-ajuste','Manter dose sem verificar K⁺']], 'No esquema UKKA comunitário de manutenção, iniciar 5 g/dia, titular até 10 g/dia ou reduzir para 5 g em dias alternados. A atualização 2026 prioriza contexto clínico e critérios vigentes.'),
        field('Monitorização','k-edema',[['k-edema','Programar K⁺ e função renal após início/ajustes; monitorar edema/Na⁺ e revisar dieta, medicamentos e adesão'],['mensal-fixo','Aguardar um ano para repetir K⁺'],['so-sodio','Monitorar apenas sódio']], 'Defina prazo de controle laboratorial após iniciar ou ajustar e reveja causas reversíveis. Avalie edema/sódio e necessidade de manter o fármaco.'),
        field('Separação de medicamentos','2h',[['2h','Separar pelo menos 2 h de outros medicamentos orais relevantes'],['junto','Administrar junto de todos os fármacos orais'],['8h','Separar sempre 8 h']], 'A UKKA recomenda intervalo de 2 horas para medicamentos orais com absorção dependente do pH gástrico. Verifique também a bula local e a lista do paciente.')
      ],
      order:'Ciclossilicato de zircônio sódico 5 g por via oral uma vez ao dia. Titular conforme potássio e protocolo especializado; a UKKA descreve ajuste até 10 g/dia ou redução para 5 g em dias alternados. Programar controle de K⁺/função renal e avaliar edema, sódio, dieta, medicamentos concomitantes e adesão.',
      rationale:['A fase de manutenção usa dose menor que a correção aguda.','Ajuste deve seguir potássio seriado, função renal e objetivo clínico, sem aumentar automaticamente.','Reveja fatores contribuintes e preserve terapias cardiorrenais importantes quando clinicamente possível.','A disponibilidade no SUS e no hospital pode variar; incorporação e oferta efetiva não são a mesma coisa.'], source:'https://guidelines.ukkidney.org/hyperkalaemia/10-1-i-hyperkalaemia-in-the-community-guidelines-1-1-12-1/10-1-10-i-hyperkalaemia-in-the-community-guidelines-10-1-10-3/'
    },
    {
      title:'Patiromer', subtitle:'Quando a prescrição segura é não emitir uma ordem local',
      patient:'Cláudia N., 63 anos · ambulatório · hipercalemia persistente e discussão de quelante oral',
      scenario:'A oficina parte da informação regulatória e de disponibilidade definida para este curso: patiromer não está disponível para uma prescrição local de rotina no Brasil. A situação deve ser confirmada na consulta oficial antes da prática clínica.', tags:['Acesso não confirmado','Brasil','Segurança da prescrição'],
      objective:'Reconhecer limites regulatórios e logísticos, evitar inventar apresentação ou receita local e escolher uma alternativa acessível após avaliação clínica.',
      question:'O que você deve fazer antes de tentar prescrever patiromer no Brasil?',
      fields:[
        field('Decisão de prescrever','nao-emitir',[['nao-emitir','Não emitir prescrição local de patiromer sem confirmação de registro, apresentação e acesso'],['emitir','Prescrever como se houvesse apresentação brasileira regular'],['copiar','Copiar a dose de outra jurisdição sem verificar disponibilidade']], 'Conforme a premissa definida para esta oficina, patiromer não está disponível para implementação local. Sem confirmar registro e acesso, não se deve gerar ordem que pareça executável no Brasil.'),
        field('Apresentação e dose','nao-inventar',[['nao-inventar','Não inventar concentração, sachê ou dose brasileira; marcar como não aplicável à prescrição local'],['8-4','Assumir sachê local de 8,4 g'],['ampola','Assumir ampola intravenosa']], 'A UKKA apresenta patiromer em pó oral e recomenda dose em sua jurisdição, mas isso não cria apresentação ou disponibilidade brasileira. Não preencher campos como se fossem produto local.'),
        field('Conduta alternativa','reavaliar',[['reavaliar','Reavaliar urgência, tratar conforme recursos registrados/disponíveis e consultar nefrologia/farmácia clínica'],['importar-automatico','Orientar importação sem avaliação regulatória'],['aguardar','Aguardar o patiromer mesmo com hipercalemia grave']], 'Escolha uma estratégia apropriada, acessível e validada no serviço. A urgência clínica não pode aguardar um fármaco sem acesso estabelecido.'),
        field('Registro e comunicação','documentar',[['documentar','Documentar indisponibilidade, alternativa escolhida, responsável e plano de monitorização'],['omitir','Omitir que o medicamento não está disponível'],['marca','Usar marca comercial sem verificar registro']], 'Registre claramente por que não prescreveu, qual alternativa foi escolhida e quem acompanha o potássio. Consulte a base oficial da Anvisa para situação regulatória atualizada.'),
        field('Monitorização do caso','k',[['k','Confirmar K⁺, ECG conforme gravidade, função renal e reavaliar resposta no prazo clínico'],['rotina-longa','Agendar controle distante sem considerar gravidade'],['sem','Dispensar acompanhamento após a decisão']], 'O plano depende da gravidade, ECG, função renal e tratamento escolhido; registre prazo e critérios de escalonamento.')
      ],
      order:'Não emitir prescrição local de patiromer enquanto registro, apresentação e acesso no Brasil não estiverem confirmados. Documentar a limitação, avaliar a gravidade e escolher alternativa registrada/disponível com apoio da equipe responsável. Definir controle de K⁺, ECG conforme gravidade e critérios de escalonamento.',
      rationale:['Diretrizes internacionais não substituem registro sanitário, apresentação disponível ou protocolo institucional brasileiro.','A UKKA inclui patiromer como uma opção, mas sua dose internacional não deve ser transposta para uma prescrição local inexistente.','A consulta de registro da Anvisa é a fonte oficial para confirmar a situação atual; disponibilidade comercial também precisa ser verificada separadamente.','A escolha segura aqui é interromper a cadeia de prescrição e oferecer plano alternativo monitorado.'], source:'https://www.gov.br/anvisa/pt-br/sistemas/consulta-a-registro-de-medicamentos/'
    },
    {
      title:'Oficina integrada', subtitle:'Revisão da prescrição completa e sequência de segurança',
      patient:'Eduardo L., 66 anos · emergência · DRC, K⁺ 7,0 mEq/L, alterações no ECG e glicemia de 104 mg/dL',
      scenario:'Há acesso venoso pérvio, paciente consciente e sem parada. Estão disponíveis gluconato de cálcio, insulina regular, glicose 50%, SG 5%, salbutamol nebulizado e ciclossilicato de zircônio sódico.', tags:['K⁺ 7,0 mEq/L','ECG alterado','Glicemia 104 mg/dL'],
      objective:'Montar uma sequência coerente que proteja o coração, redistribua K⁺, reduza risco de hipoglicemia, inicie remoção e determine reavaliação.',
      question:'Como você organizaria a prescrição e as reavaliações nas primeiras horas?',
      fields:[
        field('1 · Proteção cardíaca','calcio',[['calcio','Gluconato de cálcio 10%, 30 mL IV em 10 min; ECG contínuo e repetir após dose'],['esperar','Aguardar o quelante antes do cálcio apesar do ECG'],['cloreto','Usar volume igual de cloreto de cálcio por veia periférica']], 'Com alteração eletrocardiográfica sem parada, iniciar gluconato de cálcio IV. Cloreto não é equivalente por volume e a escolha depende do contexto.'),
        field('2 · Redistribuição','insulina',[['insulina','Insulina regular 10 unidades IV com 25 g de glicose'],['insulina-sem','10 unidades de insulina sem glicose apesar da glicemia baixa'],['nph','Insulina NPH subcutânea']], 'A UKKA recomenda 10 unidades de insulina solúvel com 25 g de glicose. Glicemia basal baixa aumenta risco e justifica a manutenção prevista.'),
        field('3 · Manutenção de glicose','sg5',[['sg5','Como glicemia <126 mg/dL: SG 5% 100 mL/h por 5 h (25 g), com controles'],['sem','Dispensar glicose porque já recebeu dose inicial'],['sg10-500','SG 10% a 500 mL/h']], 'Glicemia de 104 mg/dL é <126 mg/dL; após a glicose inicial de 25 g, UKKA recomenda glicose 10% a 50 mL/h por 5 h. SG 5% a 100 mL/h é equivalência de mesma quantidade, considerando volume.'),
        field('4 · Adjuvante','salbutamol',[['salbutamol','Salbutamol nebulizado 10–20 mg como adjuvante, não monoterapia'],['bombinha','Converter automaticamente para 100 jatos de bombinha'],['dispensar','Considerar salbutamol tratamento definitivo']], 'Salbutamol nebulizado é adjuvante. Não substitui cálcio, insulina/glicose ou remoção definitiva; não converter para número impraticável de jatos.'),
        field('5 · Remoção','szc',[['szc','Ciclossilicato de zircônio sódico 10 g VO 3 vezes/dia, sem atrasar medidas imediatas'],['so-szc','Usar apenas o quelante e observar sem repetir K⁺'],['patiromer','Prescrever patiromer como se disponível localmente']], 'O ciclossilicato pode integrar remoção, mas não age no coração nem deve atrasar terapia imediata. Patiromer não é prescrição local deste curso.'),
        field('6 · Monitorização','pacote',[['pacote','Glicemia até 6 h; K⁺ em 1, 2, 4, 6 e 24 h; ECG/estado clínico; escalar se resposta insuficiente'],['amanha','Repetir K⁺ somente no dia seguinte'],['sem-ecg','Suspender monitorização após cálcio']], 'O esquema requer vigilância de hipoglicemia, queda/rebote do K⁺ e resposta elétrica. Escale para equipe sênior/nefrologia/terapia intensiva conforme evolução.')
      ],
      order:'1) Gluconato de cálcio 10%, 30 mL IV em 10 min; monitorização ECG e reavaliação. 2) Insulina regular 10 unidades IV + glicose 25 g IV conforme protocolo. Como glicemia inicial <126 mg/dL, iniciar glicose 10% 50 mL/h por 5 h (ou SG 5% 100 mL/h se apropriado ao volume). 3) Salbutamol nebulizado 10–20 mg como adjuvante. 4) Ciclossilicato de zircônio sódico 10 g VO 3 vezes/dia na fase de correção, se disponível/indicado. Glicemia até 6 h; K⁺ em 1, 2, 4, 6 e 24 h; reavaliar ECG e escalar se necessário.',
      rationale:['O cálcio estabiliza o miocárdio, mas não reduz a concentração sérica de K⁺.','Insulina redistribui K⁺; glicose associada e manutenção para glicemia <126 mg/dL reduzem risco de hipoglicemia.','Salbutamol pode somar efeito, mas é apenas adjuvante.','O quelante compõe remoção e continuidade, enquanto a monitorização identifica resposta insuficiente e rebote.'], source:UKKA_HOSP
    }
  ];

  function field(label, correct, options, summary){
    return {label,correct,summary,options:options.map(([value,text])=>({value,text,explanation:value===correct?summary:wrongExplanation(label,value,summary)}))};
  }
  function wrongExplanation(label,value,summary){
    const prefix={
      'Medicamento':'Reveja o fármaco e a função que ele cumpre nesta etapa. ',
      'Apresentação':'A apresentação precisa corresponder ao princípio ativo e à concentração conferida no rótulo. ',
      'Apresentação / concentração':'A apresentação precisa corresponder ao princípio ativo e à concentração conferida no rótulo. ',
      'Dose e cálculo':'Refaça o cálculo com unidades: dose prescrita ÷ concentração = volume a aspirar. ',
      'Dose para o caso':'Refaça dose, unidade, apresentação e via. ',
      'Dose de correção':'Não confunda dose de correção, manutenção e frequência. ',
      'Via':'A via faz parte da prescrição e não pode ser inferida apenas pelo nome do medicamento. ',
      'Preparo e tempo':'O preparo, a velocidade e as compatibilidades são barreiras de segurança. ',
      'Monitorização':'A ordem precisa prever como detectar benefício e dano após a administração. ',
      'Monitorização e reavaliação':'A ordem precisa prever como detectar benefício e dano após a administração. ',
      'Glicose associada':'Reavalie a dose de glicose, o risco de hipoglicemia e o esquema de insulina. ',
      'Indicação no cenário':'Confira volume, diurese, pressão e objetivo clínico antes de escolher o diurético. ',
      'Papel na hipercalemia':'Não atribua ao fármaco um efeito ou uma indicação que ele não tem. ',
      'Dose e cálculo':'A concentração define a conversão em volume, mas não define por si só a dose adequada. ',
      'Momento terapêutico':'Separe corretamente a fase aguda da fase de manutenção. ',
      'Decisão de prescrever':'Uma recomendação estrangeira não confirma registro ou acesso local. ',
      'Apresentação e dose':'Não complete um campo com uma suposição sobre produto disponível. ',
      'Conduta alternativa':'Não deixe uma urgência sem plano enquanto aguarda uma opção inacessível. ',
      'Registro e comunicação':'Registre a limitação e a alternativa para que a decisão seja auditável. ',
      '1 · Proteção cardíaca':'Priorize proteção miocárdica quando há alteração eletrocardiográfica. ',
      '2 · Redistribuição':'O esquema UKKA combina insulina solúvel e glicose. ',
      '3 · Manutenção de glicose':'Calcule gramas e volume a partir da concentração, e considere balanço hídrico. ',
      '4 · Adjuvante':'Separe adjuvância de tratamento definitivo e não converta dispositivos sem validação. ',
      '5 · Remoção':'O plano precisa incluir remoção sem atrasar medidas urgentes. ',
      '6 · Monitorização':'Defina prazos de reavaliação para detectar hipoglicemia, resposta e rebote.'
    };
    return (prefix[label]||'Reavalie a escolha à luz do cenário, da apresentação e do objetivo terapêutico. ')+summary;
  }
  const $ = (s, root=document) => root.querySelector(s);
  const esc = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const catalog=$('#catalog'),station=$('#station'),grid=$('#caseGrid');
  let state=loadState(), current=0;
  function loadState(){try{return JSON.parse(localStorage.getItem(KEY))||{done:{},drafts:{}}}catch{return {done:{},drafts:{}}}}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
  function renderCards(){
    grid.innerHTML=CASES.map((c,i)=>`<button class="case-card" type="button" data-case="${i}"><span class="case-num">${String(i+1).padStart(2,'0')}</span><span class="case-card-body"><span class="eyebrow">${esc(c.tags.slice(0,2).join(' · '))}</span><span class="case-title">${esc(c.title)}</span><span class="case-desc">${esc(c.subtitle)}</span></span><span class="case-status ${state.done[i]?'done':''}">${state.done[i]?'Concluído':'Abrir oficina'}</span><span class="case-arrow" aria-hidden="true">→</span></button>`).join('');
    $('#progressText').textContent=`${Object.keys(state.done).length} de ${CASES.length} concluídas`;
    grid.querySelectorAll('[data-case]').forEach(b=>b.addEventListener('click',()=>openCase(Number(b.dataset.case))));
  }
  function optionsHtml(f,i){const saved=state.drafts[current]?.answers?.[i]||'';return `<div class="field"><label for="field-${i}">${esc(f.label)}</label><select id="field-${i}" data-field="${i}"><option value="">Escolha uma opção</option>${f.options.map(o=>`<option value="${esc(o.value)}" ${saved===o.value?'selected':''}>${esc(o.text)}</option>`).join('')}</select><p class="feedback" data-feedback="${i}" aria-live="polite"></p></div>`}
  function openCase(index){
    current=Math.max(0,Math.min(index,CASES.length-1));const c=CASES[current];catalog.hidden=true;station.hidden=false;
    const monitor='';
    station.innerHTML=`<div class="station-heading"><div><p class="eyebrow">AGORAPRESCREVA · CASO ${String(current+1).padStart(2,'0')} DE ${CASES.length}</p><h1 id="stationTitle" class="station-title">${esc(c.title)}<em>${esc(c.subtitle)}</em></h1></div><div class="station-count">${String(current+1).padStart(2,'0')}<small>de 10</small></div></div>
      <div class="summary-grid"><article class="panel"><p class="eyebrow">CENÁRIO FICTÍCIO</p><h3>Leia o contexto antes de montar a ordem</h3><p class="patient-line">${esc(c.patient)}</p><p>${esc(c.scenario)}</p><div class="scenario-tags">${c.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></article><article class="panel learning-panel"><p class="eyebrow">OBJETIVO DE APRENDIZAGEM</p><h3>Transformar a decisão em prescrição</h3><p>${esc(c.objective)}</p></article></div>
      <div class="work-grid"><form id="rxForm" class="panel form-panel"><p class="eyebrow">MONTE A PRESCRIÇÃO</p><h3>${esc(c.question)}</h3><p class="form-intro">Escolha os dados em cada campo e escreva a ordem completa como se fosse registrá-la na prescrição. Depois confira os feedbacks e compare seu texto com o modelo de referência.</p><div class="prescription-fields">${c.fields.map(optionsHtml).join('')}</div><div class="written-order"><label for="prescriptionText">Escreva a prescrição completa</label><p id="prescriptionHint">Inclua medicamento, apresentação, dose e cálculo, via, preparo, tempo ou frequência e plano de monitorização quando aplicáveis.</p><textarea id="prescriptionText" name="prescriptionText" rows="7" required aria-describedby="prescriptionHint" placeholder="Redija aqui a ordem completa para este caso…">${esc(state.drafts[current]?.prescription||'')}</textarea></div><div class="form-actions"><button type="submit" class="button primary">Conferir escolhas e comparar prescrição →</button></div></form>
        <aside class="panel reference-panel"><p class="eyebrow">RACIONAL DA ORDEM</p><h3>O que cada dado muda?</h3><ul class="reference-list">${c.rationale.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="reference-note">Confira protocolo institucional, bula e apresentação realmente disponível antes de qualquer uso clínico. Esta oficina não emite prescrição para paciente real.</p><div class="reference-links"><a href="${esc(c.source)}" target="_blank" rel="noopener">UKKA · diretriz / fonte de referência ↗</a><a href="${esc(UKKA)}" target="_blank" rel="noopener">UKKA · diretriz completa, atualização julho de 2026 ↗</a><a href="${esc(UPTODATE)}" target="_blank" rel="noopener">UpToDate · tratamento e prevenção em adultos ↗</a>${current===8?'<a href="https://www.gov.br/anvisa/pt-br/sistemas/consulta-a-registro-de-medicamentos/" target="_blank" rel="noopener">Anvisa · consulta oficial de registro ↗</a>':''}</div></aside>
      </div><section id="result" class="panel result-panel" hidden aria-live="polite"></section>
      <div class="station-actions"><button type="button" class="button" id="backCases">← Voltar aos 10 casos</button><span class="save-status" id="saveStatus" role="status"></span><div class="right-actions"><button type="button" class="button" id="saveCase">Salvar progresso</button><button type="button" class="button primary" id="nextCase">${current===9?'Concluir oficina':'Salvar e ir para o próximo caso'} →</button></div></div>`;
    $('#backCases').addEventListener('click',backToCatalog);$('#saveCase').addEventListener('click',()=>saveDraft(true));$('#nextCase').addEventListener('click',nextCase);
    $('#rxForm').addEventListener('change',()=>saveDraft(false));$('#rxForm').addEventListener('input',()=>saveDraft(false));$('#rxForm').addEventListener('submit',checkAnswers);
    $('#stationTitle').focus({preventScroll:true});
    history.replaceState(null,'',`?caso=${current+1}`);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function saveDraft(show){const answers=[...station.querySelectorAll('[data-field]')].map(x=>x.value);const prescription=$('[name="prescriptionText"]',station)?.value||'';state.drafts[current]={...state.drafts[current],answers,prescription,savedAt:new Date().toISOString()};persist();if(show)$('#saveStatus').textContent='Progresso salvo neste dispositivo.';}
  function checkAnswers(event){event.preventDefault();saveDraft(false);const c=CASES[current];let correct=0;const entries=[];
    c.fields.forEach((f,i)=>{const select=$(`[data-field="${i}"]`,station),feedback=$(`[data-feedback="${i}"]`,station),choice=f.options.find(o=>o.value===select.value);const ok=!!choice&&select.value===f.correct;if(ok)correct++;feedback.textContent=choice?choice.explanation:'Escolha uma opção. A ordem completa depende deste campo.';feedback.className=`feedback ${!choice?'neutral':ok?'ok':'bad'}`;entries.push(`<li><strong>${esc(f.label)}:</strong> ${esc(choice?choice.explanation:'Campo não respondido; reveja o racional antes de emitir uma ordem.')}</li>`)});
    state.done[current]={score:correct,total:c.fields.length,at:new Date().toISOString()};persist();renderCards();const result=$('#result');result.hidden=false;result.innerHTML=`<p class="eyebrow">DEVOLUTIVA · ${correct}/${c.fields.length} CAMPOS ALINHADOS</p><h3>${correct===c.fields.length?'Ordem completa conferida.':'Revise os campos indicados e compare com a referência.'}</h3><p>O objetivo é entender o motivo de cada campo, não apenas acertar a combinação.</p><div class="written-review"><article><p class="eyebrow">SUA PRESCRIÇÃO</p><div class="rx-final student-rx">${esc(state.drafts[current]?.prescription||'')}</div></article><article><p class="eyebrow">MODELO DE REFERÊNCIA</p><div class="rx-final">${esc(c.order)}</div></article></div><p class="writing-tip">Compare seu texto com o modelo. Confira se registrou: ${c.fields.map(f=>esc(f.label.toLowerCase())).join(', ')}.</p><h3 style="margin-top:22px">Feedback por campo</h3><ol class="feedback-list">${entries.join('')}</ol><p class="reference-note">Respostas e progresso são salvos apenas neste navegador. Não há envio de informação clínica.</p>`;result.scrollIntoView({behavior:'smooth',block:'center'});$('#saveStatus').textContent='Devolutiva registrada neste dispositivo.';
  }
  function nextCase(){saveDraft(false);if(current<CASES.length-1){openCase(current+1);return}state.finishedAt=new Date().toISOString();persist();backToCatalog();$('#progressText').textContent='10 de 10 concluídas · oficina finalizada';$('#page-title').focus?.({preventScroll:true});}
  function backToCatalog(){saveDraft(false);station.hidden=true;catalog.hidden=false;history.replaceState(null,'',location.pathname);renderCards();window.scrollTo({top:0,behavior:'smooth'});}
  renderCards();const requested=Number(new URLSearchParams(location.search).get('caso'));if(requested>=1&&requested<=CASES.length)openCase(requested-1);
})();
