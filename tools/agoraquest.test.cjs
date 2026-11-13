const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const Q = require('../lib/agoraquest');
const N = Q.N;
const { criarBanco, ids } = require('./helpers/banco-curso.cjs');

const MIGRACAO_AULA_01 = '20261111233000_agoraquest_hipercalemia_aula_01.sql';
const MIGRACAO_AULA_02 = '20261112120000_agoraquest_aula_02_e_caderno_erros.sql';
const MIGRACAO_AULA_03 = '20261112150000_agoraquest_aula_03.sql';
const MIGRACAO_AULA_04 = '20261112170000_agoraquest_aula_04.sql';
const MIGRACAO_AULA_05 = '20261112190000_agoraquest_aula_05.sql';
const MIGRACAO_AULA_06 = '20261113000000_agoraquest_aula_06.sql';
const MIGRACAO_AULA_07 = '20261113120000_agoraquest_aula_07.sql';
const MIGRACAO_AULA_08 = '20261113180000_agoraquest_aula_08.sql';
const MIGRACAO_AULA_09 = '20261114000000_agoraquest_aula_09.sql';
const AULA = ids.aula;
const CURSO_HIPER = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983';
const AULA_01 = Q.porSlug('hipercalemia-aula-01-v1');
const AULA_02 = Q.porSlug('hipercalemia-aula-02-v1');
const AULA_03 = Q.porSlug('hipercalemia-aula-03-v1');
const AULA_04 = Q.porSlug('hipercalemia-aula-04-v1');
const AULA_05 = Q.porSlug('hipercalemia-aula-05-v1');
const AULA_06 = Q.porSlug('hipercalemia-aula-06-v1');
const AULA_07 = Q.porSlug('hipercalemia-aula-07-v1');
const AULA_08 = Q.porSlug('hipercalemia-aula-08-v1');
const AULA_09 = Q.porSlug('hipercalemia-aula-09-v1');
const SLUG_01 = 'hipercalemia-aula-01-v1';
const SLUG_02 = 'hipercalemia-aula-02-v1';
const SLUG_03 = 'hipercalemia-aula-03-v1';
const SLUG_04 = 'hipercalemia-aula-04-v1';
const SLUG_05 = 'hipercalemia-aula-05-v1';
const SLUG_06 = 'hipercalemia-aula-06-v1';
const SLUG_07 = 'hipercalemia-aula-07-v1';
const SLUG_08 = 'hipercalemia-aula-08-v1';
const SLUG_09 = 'hipercalemia-aula-09-v1';

const migracao = (nome) => fs.readFileSync(path.join(__dirname, '../supabase/migrations', nome), 'utf8');

/* Conteúdo aprovado da Aula 01: não pode ser reescrito sem nova revisão. */
const aprovado01 = [
  {
    title: 'O valor isolado já exige ação?',
    stem: 'Um homem de 62 anos procura a emergência por mal-estar inespecífico. Está consciente, hemodinamicamente estável e sem alterações eletrocardiográficas evidentes. O laboratório informa potássio sérico de 6,9 mEq/L.\n\n**Qual é a conduta mais adequada?**',
    choices: {
      A: 'Como o ECG está normal, repetir o potássio em 24 horas.',
      B: 'Considerar uma emergência hipercalêmica, iniciar monitorização e tratamento imediato, avaliando simultaneamente a possibilidade de pseudohipercalemia.',
      C: 'Aguardar o aparecimento de ondas T apiculadas antes de iniciar o tratamento.',
      D: 'Liberar o paciente após orientação alimentar, pois não apresenta sintomas cardíacos.'
    },
    pearl: 'ECG normal não é salvo-conduto: potássio ≥ 6,5 mEq/L ou elevação rápida já exige monitorização e tratamento.'
  },
  {
    title: 'O ECG muda a prioridade?',
    stem: 'Uma mulher de 70 anos, com doença renal crônica, apresenta potássio de 6,1 mEq/L. O ECG mostra ondas T apiculadas, achatamento das ondas P e alargamento do QRS, alterações novas em relação ao traçado anterior.\n\n**Qual é a melhor interpretação?**',
    choices: {
      A: 'O potássio está abaixo de 6,5 mEq/L, portanto não há indicação de tratamento imediato.',
      B: 'As alterações só têm importância se o potássio ultrapassar 7,0 mEq/L.',
      C: 'O quadro representa uma emergência hipercalêmica com comprometimento elétrico, exigindo estabilização cardíaca e tratamento imediato.',
      D: 'É necessário repetir o ECG após seis horas antes de definir a conduta.'
    },
    pearl: 'Quem manda é o ECG: alteração elétrica nova é emergência, mesmo com potássio abaixo de 6,5 mEq/L.'
  },
  {
    title: 'Bradicardia com potássio elevado',
    stem: 'Um homem de 76 anos, em uso de carvedilol e com piora recente da função renal, apresenta potássio de 5,9 mEq/L, frequência cardíaca de 35 bpm e pressão arterial de 85/50 mmHg.\n\n**Qual é a melhor decisão inicial?**',
    choices: {
      A: 'Desconsiderar a hipercalemia como fator relevante, pois o potássio está abaixo de 6,5 mEq/L.',
      B: 'Reconhecer uma possível emergência associada à hipercalemia, iniciar monitorização, suporte hemodinâmico e tratamento imediato, considerando a possibilidade de síndrome BRASH.',
      C: 'Aguardar o potássio ultrapassar 6,5 mEq/L para iniciar medidas específicas.',
      D: 'Tratar apenas a bradicardia, sem investigar a função renal ou o potássio.'
    },
    pearl: 'Bradicardia + hipotensão + disfunção renal + bloqueador AV + hipercalemia: pense em BRASH e trate o conjunto, não só o número.'
  },
  {
    title: 'A velocidade de elevação importa?',
    stem: 'Um homem de 45 anos, internado após esmagamento muscular, apresenta lesão renal aguda oligúrica. O potássio passou de 4,4 para 5,8 mEq/L em três horas. O ECG ainda não apresenta alterações características.\n\n**Qual é a melhor conduta?**',
    choices: {
      A: 'Aguardar o potássio ultrapassar 6,5 mEq/L, pois o ECG está normal.',
      B: 'Considerar a elevação pouco relevante porque o paciente não apresenta alterações eletrocardiográficas.',
      C: 'Solicitar uma nova dosagem apenas no dia seguinte, evitando intervenções desnecessárias.',
      D: 'Reconhecer o alto risco de progressão rápida, iniciar monitorização e tratamento urgente, com reavaliações seriadas e planejamento da remoção do potássio.'
    },
    pearl: 'A curva do potássio importa: elevação rápida com oligúria e rabdomiólise é emergência mesmo com ECG ainda normal.'
  },
  {
    title: 'Quem precisa de tratamento imediato?',
    stem: 'Durante o plantão, você recebe os resultados de quatro pacientes. Qual deles apresenta a situação de menor urgência para redução imediata do potássio, considerando as informações disponíveis?',
    choices: {
      A: 'Paciente com potássio de 6,8 mEq/L, assintomático e ECG sem alterações.',
      B: 'Paciente com potássio de 5,8 mEq/L, bradicardia importante e QRS alargado de início recente.',
      C: 'Paciente com potássio de 5,3 mEq/L, doença renal crônica estável, ECG sem alterações, diurese preservada e valores semelhantes nos últimos meses.',
      D: 'Paciente com potássio de 6,0 mEq/L, lesão renal aguda oligúrica e rabdomiólise em evolução.'
    },
    pearl: 'Urgência não é só o número: sintomas, ECG, velocidade de elevação, função renal e tendência definem o risco.'
  }
];

/* Conteúdo aprovado da Aula 02, transcrito do enunciado entregue. */
const aprovado02 = [
  {
    title: 'Potássio extracelular e condução cardíaca',
    stem: 'Um paciente de 68 anos, com lesão renal aguda, apresenta potássio sérico de 6,7 mEq/L. O ECG mostra redução da amplitude da onda P e alargamento do QRS, alterações novas em relação ao traçado anterior. Qual mecanismo fisiológico explica melhor o comprometimento da condução cardíaca?',
    choices: {
      A: 'A elevação do potássio extracelular torna o potencial de repouso mais negativo, impedindo a ativação dos canais de cálcio.',
      B: 'A elevação do potássio extracelular despolariza parcialmente a membrana, reduz a disponibilidade dos canais rápidos de sódio e prejudica a condução elétrica.',
      C: 'O excesso de potássio extracelular aumenta diretamente a velocidade de abertura dos canais rápidos de sódio, acelerando a condução.',
      D: 'A hipercalemia bloqueia diretamente a bomba de sódio e potássio, interrompendo imediatamente toda atividade elétrica cardíaca.'
    },
    pearl: 'Na hipercalemia, uma membrana parcialmente despolarizada pode conduzir pior, não melhor. O problema não é apenas gerar o impulso, mas conseguir propagá-lo.',
    reference: 'UpToDate — Clinical manifestations of hyperkalemia in adults; Causes and evaluation of hyperkalemia in adults.'
  },
  {
    title: 'Insulina e redistribuição do potássio',
    stem: 'Um paciente com hipercalemia grave recebe insulina intravenosa associada à glicose. Uma hora depois, o potássio sérico apresenta redução significativa. Qual mecanismo explica melhor essa resposta?',
    choices: {
      A: 'A insulina aumenta diretamente a excreção renal de potássio, mesmo em pacientes anúricos.',
      B: 'A insulina neutraliza eletricamente o potássio extracelular, reduzindo sua atividade biológica sem alterar sua distribuição.',
      C: 'A insulina estimula a Na⁺/K⁺-ATPase, principalmente no músculo esquelético, favorecendo a entrada de potássio nas células.',
      D: 'A insulina promove a ligação irreversível do potássio às proteínas plasmáticas, impedindo sua circulação.'
    },
    pearl: 'Insulina reduz o potássio que aparece no exame, mas não remove potássio do corpo. Uma boa resposta inicial não dispensa o plano de eliminação.',
    reference: 'UpToDate — Treatment and prevention of hyperkalemia in adults; Causes and evaluation of hyperkalemia in adults.'
  },
  {
    title: 'Excreção renal do potássio',
    stem: 'Um paciente de 72 anos, com lesão renal aguda oligúrica, apresenta hipercalemia persistente. Além da redução da função renal, qual conjunto de fatores influencia diretamente a secreção distal de potássio?',
    choices: {
      A: 'Concentração de albumina, pressão oncótica plasmática e produção hepática de ureia.',
      B: 'Secreção de aldosterona, entrega distal de sódio e fluxo tubular distal.',
      C: 'Concentração sérica de cálcio, absorção intestinal de ferro e secreção pancreática de glucagon.',
      D: 'Pressão arterial sistólica, concentração de hemoglobina e frequência respiratória, independentemente da função tubular.'
    },
    pearl: 'Para eliminar potássio, não basta ter rins: é necessário que os mecanismos de secreção distal estejam funcionando.',
    reference: 'UpToDate — Causes and evaluation of hyperkalemia in adults.'
  },
  {
    title: 'Proteger, redistribuir e remover',
    stem: 'Um paciente apresenta potássio de 7,2 mEq/L e alargamento do QRS. A equipe inicia tratamento da emergência hipercalêmica. Qual alternativa relaciona corretamente a intervenção ao seu principal objetivo fisiológico?',
    choices: {
      A: 'Cálcio intravenoso remove potássio; insulina estabiliza diretamente a membrana; hemodiálise redistribui potássio para as células.',
      B: 'Cálcio intravenoso reduz a concentração sérica de potássio; salbutamol aumenta a excreção urinária; hemodiálise protege o coração sem remover potássio.',
      C: 'Cálcio intravenoso e insulina eliminam potássio do organismo, enquanto a hemodiálise atua exclusivamente sobre a condução cardíaca.',
      D: 'Cálcio intravenoso antagoniza os efeitos cardíacos da hipercalemia; insulina promove redistribuição celular; hemodiálise remove potássio do organismo.'
    },
    pearl: 'Cálcio protege. Insulina redistribui. Hemodiálise remove. Saber o que cada intervenção não faz é tão importante quanto saber o que ela faz.',
    reference: 'UpToDate — Treatment and prevention of hyperkalemia in adults.'
  },
  {
    title: 'Rebote após o tratamento',
    stem: 'Um paciente de 67 anos, com lesão renal aguda e oligúria importante, chega com potássio de 7,0 mEq/L e QRS alargado. Após cálcio intravenoso e insulina com glicose, o potássio cai para 5,8 mEq/L. A diurese permanece muito reduzida. Qual interpretação é mais adequada?',
    choices: {
      A: 'A redução do potássio demonstra que a capacidade renal de excreção foi restaurada.',
      B: 'A melhora laboratorial inicial permite encerrar a monitorização, desde que o QRS tenha diminuído.',
      C: 'O potássio pode voltar a subir quando o efeito redistributivo diminuir, exigindo monitorização e avaliação de estratégias de remoção.',
      D: 'A redução após insulina confirma que a maior parte do excesso de potássio já foi eliminada do organismo.'
    },
    pearl: 'O potássio caiu, mas para onde ele foi? Essa pergunta ajuda a distinguir resposta temporária de resolução do problema.',
    reference: 'UpToDate — Treatment and prevention of hyperkalemia in adults.'
  }
];

/* Conteúdo aprovado da Aula 03, transcrito do enunciado entregue. */
const aprovado03 = [
  {
    title: 'O exame mostra todo o potássio do organismo?',
    stem: 'Um homem de 58 anos apresenta potássio sérico de 6,1 mEq/L. Um interno afirma que esse resultado comprova que o paciente possui excesso de potássio corporal total. Qual interpretação está correta?',
    choices: {
      A: 'O potássio sérico representa diretamente o estoque corporal, porque a maior parte do potássio circula no sangue.',
      B: 'O potássio sérico informa a concentração no compartimento extracelular e, isoladamente, não permite determinar o estoque corporal total.',
      C: 'A concentração sérica depende exclusivamente da quantidade de potássio ingerida nas últimas 24 horas.',
      D: 'Um potássio sérico elevado sempre indica que houve retenção renal de potássio.'
    },
    pearl: 'Potássio sérico é concentração, não inventário. O mesmo resultado pode esconder estoques corporais muito diferentes.',
    reference: 'UpToDate — Causes and evaluation of hyperkalemia in adults.'
  },
  {
    title: 'Por que o potássio sobe na cetoacidose?',
    stem: 'Uma mulher de 26 anos, com diabetes tipo 1, apresenta glicemia de 520 mg/dL, pH de 7,10, bicarbonato de 8 mEq/L e potássio sérico de 6,0 mEq/L. Está desidratada, com poliúria e vômitos. Qual explicação fisiopatológica é mais adequada?',
    choices: {
      A: 'O potássio elevado comprova que não ocorreram perdas urinárias de potássio.',
      B: 'A acidemia é a única responsável pela hipercalemia, independentemente da insulina e da osmolaridade.',
      C: 'A hiperglicemia aumenta obrigatoriamente a quantidade corporal total de potássio.',
      D: 'A deficiência de insulina e a hiperosmolalidade favorecem a elevação sérica, enquanto a diurese osmótica pode produzir déficit corporal de potássio.'
    },
    pearl: 'Na cetoacidose, o potássio que aparece alto no exame pode estar escondendo um organismo que já perdeu muito potássio.',
    reference: 'UpToDate — Causes and evaluation of hyperkalemia in adults; Treatment and prevention of hyperkalemia in adults.'
  },
  {
    title: 'O que acontece quando iniciamos insulina?',
    stem: 'Um paciente com cetoacidose diabética chega com potássio de 5,7 mEq/L. Após iniciar tratamento com reposição volêmica e insulina, o potássio sérico diminui progressivamente. Qual é a principal preocupação relacionada a essa evolução?',
    choices: {
      A: 'A queda comprova que o déficit corporal de potássio foi corrigido.',
      B: 'A insulina elimina potássio diretamente pelos rins, mesmo que não exista produção de urina.',
      C: 'A insulina promove entrada celular de potássio e pode revelar ou agravar hipocalemia em um paciente com déficit corporal preexistente.',
      D: 'A redução do potássio significa que não são mais necessárias dosagens seriadas.'
    },
    pearl: 'Na cetoacidose, a insulina pode transformar uma hipercalemia inicial em hipocalemia. Antecipar essa mudança faz parte do tratamento seguro.',
    reference: 'UpToDate — Treatment and prevention of hyperkalemia in adults; princípios de manejo da cetoacidose diabética em adultos.'
  },
  {
    title: 'Mesmo potássio, mecanismos diferentes',
    stem: 'Dois pacientes apresentam potássio sérico de 6,3 mEq/L. O primeiro tem lesão renal aguda oligúrica. O segundo apresenta rabdomiólise extensa após trauma, com função renal inicialmente preservada. Qual afirmação é a mais adequada?',
    choices: {
      A: 'No primeiro, a redução da excreção pode causar retenção corporal; no segundo, a destruição muscular pode elevar o potássio sérico pela liberação de conteúdo intracelular.',
      B: 'Os dois pacientes necessariamente apresentam a mesma quantidade corporal total de potássio.',
      C: 'A rabdomiólise aumenta o potássio sérico exclusivamente por maior absorção intestinal.',
      D: 'Na lesão renal aguda oligúrica, a hipercalemia só pode ocorrer se houver aumento da ingestão alimentar.'
    },
    pearl: 'Dois pacientes podem ter o mesmo potássio sérico e problemas completamente diferentes. O mecanismo orienta o tratamento e a vigilância.',
    reference: 'UpToDate — Causes and evaluation of hyperkalemia in adults.'
  },
  {
    title: 'O potássio caiu: o problema foi resolvido?',
    stem: 'Um homem de 24 anos, com cetoacidose diabética, apresenta inicialmente potássio de 6,2 mEq/L, glicemia de 480 mg/dL e pH de 7,12. Durante o tratamento, após reposição volêmica e insulinoterapia, o potássio cai para 3,4 mEq/L. Qual é a melhor interpretação?',
    choices: {
      A: 'A queda comprova que o paciente eliminou todo o excesso de potássio e não apresenta risco de hipocalemia.',
      B: 'O potássio inicial elevado exclui a possibilidade de déficit corporal de potássio.',
      C: 'A queda pode refletir redistribuição para as células sobre um déficit corporal preexistente; é necessário reavaliar a insulinoterapia e a reposição de potássio conforme o protocolo.',
      D: 'A redução do potássio demonstra que a insulina bloqueou a absorção intestinal de potássio.'
    },
    pearl: 'O tratamento mudou o número. Agora você precisa descobrir o que esse número significa para o paciente e qual risco vem a seguir.',
    reference: 'UpToDate — Causes and evaluation of hyperkalemia in adults; Treatment and prevention of hyperkalemia in adults; princípios de manejo da cetoacidose diabética em adultos.'
  }
];

/* Conteúdo aprovado da Aula 04, transcrito do enunciado entregue. */
const aprovado04 = [
  {
    title: 'Um potássio de 6,8 que não combina com o paciente',
    stem: 'Um homem de 42 anos, sem doença renal conhecida, apresenta potássio sérico de 6,8 mEq/L em exame de rotina. Está assintomático, hemodinamicamente estável, com creatinina de 0,9 mg/dL e ECG sem alterações sugestivas de hipercalemia. O laboratório informa hemólise significativa da amostra. Qual é a conduta mais adequada?',
    choices: {
      A: 'Desconsiderar o resultado, porque o ECG normal exclui hipercalemia grave.',
      B: 'Avaliar imediatamente o risco clínico e providenciar nova dosagem urgente, com coleta adequada, sem atrasar tratamento caso surjam indicações emergenciais.',
      C: 'Administrar insulina e glicose obrigatoriamente antes de qualquer avaliação da confiabilidade da amostra.',
      D: 'Aguardar até o dia seguinte para repetir o potássio, pois o paciente está assintomático.'
    },
    pearl: 'ECG normal não prova pseudohipercalemia. A suspeita nasce da combinação entre contexto clínico, qualidade da amostra e confirmação adequada.',
    reference: 'UpToDate — Causes and evaluation of hyperkalemia in adults; Clinical manifestations of hyperkalemia in adults.'
  },
  {
    title: 'O que aconteceu durante a coleta?',
    stem: 'Uma mulher de 35 anos apresenta potássio de 5,9 mEq/L em amostra coletada após garroteamento prolongado, enquanto abria e fechava repetidamente a mão. O laboratório não identificou hemólise significativa. Uma nova amostra, coletada sem contrações repetidas e com técnica adequada, mostra potássio de 4,4 mEq/L. Qual é a explicação mais provável?',
    choices: {
      A: 'A contração da mão reduziu a eliminação renal de potássio de maneira transitória.',
      B: 'O garroteamento provocou necessariamente hemólise intensa, mesmo sem evidência laboratorial.',
      C: 'A paciente apresentou destruição muscular sistêmica suficiente para provocar hipercalemia verdadeira.',
      D: 'A contração muscular repetida associada à estase venosa favoreceu elevação local do potássio na amostra, sem exigir hemólise significativa.'
    },
    pearl: 'A ausência de hemólise não garante que a amostra esteja livre de interferências. Perguntar como o sangue foi coletado pode mudar a interpretação do exame.',
    reference: 'UpToDate — Causes and evaluation of hyperkalemia in adults.'
  },
  {
    title: 'Soro elevado, plasma normal: o papel das plaquetas',
    stem: 'Um paciente de 67 anos, em investigação de trombocitose, apresenta 980.000 plaquetas/mm³. O potássio sérico é de 6,1 mEq/L. Ele está clinicamente estável, com função renal preservada. Uma amostra de plasma heparinizado, coletada e processada adequadamente, apresenta potássio de 4,5 mEq/L. Qual mecanismo explica melhor essa diferença?',
    choices: {
      A: 'Durante a coagulação da amostra de soro, a ativação das numerosas plaquetas pode liberar potássio, elevando artificialmente o resultado sérico.',
      B: 'O plasma heparinizado remove o potássio verdadeiro do sangue e, portanto, sempre apresenta resultados falsamente baixos.',
      C: 'A trombocitose provoca obrigatoriamente retenção renal de potássio, independentemente da função renal.',
      D: 'A diferença comprova que o potássio aumentou rapidamente na circulação entre as duas coletas.'
    },
    pearl: 'Na trombocitose importante, potássio sérico elevado com plasma adequadamente processado normal deve levantar suspeita de pseudohipercalemia plaquetária.',
    reference: 'UpToDate — Causes and evaluation of hyperkalemia in adults.'
  },
  {
    title: 'Leucocitose extrema: repetir da mesma maneira resolve?',
    stem: 'Um homem de 71 anos, com leucemia linfocítica crônica e leucócitos de 240.000/mm³, apresenta potássio plasmático de 7,0 mEq/L. Está estável, com função renal preservada e ECG sem alterações sugestivas. A amostra foi transportada por sistema pneumático. Existe suspeita de pseudohipercalemia associada à fragilidade leucocitária. Qual estratégia de confirmação é mais apropriada?',
    choices: {
      A: 'Repetir a coleta e enviá-la novamente pelo mesmo sistema pneumático, sem modificar o processamento.',
      B: 'Considerar o potássio normal apenas porque o paciente não apresenta sintomas ou alterações no ECG.',
      C: 'Discutir com o laboratório uma nova coleta com manipulação mínima e análise rápida, preferencialmente evitando transporte pneumático, podendo utilizar sangue total conforme a disponibilidade e as limitações do método.',
      D: 'Solicitar apenas um novo hemograma, porque a contagem de leucócitos permite calcular o potássio verdadeiro.'
    },
    pearl: 'Na leucocitose extrema, o problema pode estar no transporte da amostra. Repetir o exame sem corrigir a causa da interferência pode repetir o erro.',
    reference: 'UpToDate — Causes and evaluation of hyperkalemia in adults.'
  },
  {
    title: 'Quando confirmar não pode atrasar o tratamento',
    stem: 'Um homem de 69 anos, com doença renal crônica avançada, chega à emergência com fraqueza, frequência cardíaca de 34 bpm e pressão arterial de 85/50 mmHg. O ECG mostra bradicardia e QRS alargado. O laboratório informa potássio de 7,2 mEq/L, mas a amostra apresenta hemólise discreta. Qual é a melhor conduta inicial?',
    choices: {
      A: 'Aguardar uma nova coleta antes de qualquer intervenção, porque a hemólise invalida completamente o resultado.',
      B: 'Descartar hipercalemia como causa da bradicardia, já que a amostra apresenta hemólise.',
      C: 'Administrar apenas solução cristaloide e repetir o ECG após duas horas.',
      D: 'Iniciar imediatamente o tratamento emergencial indicado para provável hipercalemia com toxicidade cardíaca, incluindo cálcio intravenoso, enquanto se providencia confirmação laboratorial em paralelo.'
    },
    pearl: 'Pseudohipercalemia é uma hipótese laboratorial. Instabilidade e alterações elétricas compatíveis com hipercalemia são problemas clínicos que não podem esperar.',
    reference: 'UpToDate — Treatment and prevention of hyperkalemia in adults; Clinical manifestations of hyperkalemia in adults.'
  }
];

/* Conteúdo aprovado da Aula 05, transcrito do enunciado entregue. */
const aprovado05 = [
  {
    title: "O potássio subiu, mas o rim está funcionando",
    competency: "Reconhecer o mecanismo predominante",
    stem: "Um homem de 28 anos, com diabetes mellitus tipo 1, é admitido na emergência com poliúria, polidipsia, vômitos e respiração de Kussmaul. Relata interrupção do uso de insulina há aproximadamente dois dias.\n\nOs exames mostram:",
    table: {"caption":"Exames iniciais","headers":["Parâmetro","Resultado"],"rows":[["Glicemia","584 mg/dL"],["pH arterial","7,12"],["Bicarbonato","9 mEq/L"],["Potássio","6,2 mEq/L"],["Creatinina","1,1 mg/dL"]]},
    stemAfter: "Um interno observa a creatinina próxima da normalidade e questiona como o paciente poderia apresentar hipercalemia sem insuficiência renal evidente.\n\nQual explicação fisiopatológica é mais adequada?",
    choices: {
      A: "A acidemia provoca obrigatoriamente a saída de potássio das células, sendo o principal mecanismo de hipercalemia em qualquer tipo de acidose metabólica.",
      B: "A deficiência de insulina reduz a entrada celular de potássio, enquanto a hiperosmolalidade favorece sua saída para o meio extracelular, mesmo quando existe déficit corporal de potássio.",
      C: "A hiperglicemia aumenta a quantidade total de potássio do organismo por estimular sua absorção intestinal.",
      D: "A creatinina próxima da normalidade demonstra que a hipercalemia é necessariamente causada por aumento da ingestão de potássio."
    },
    pearl: "Na cetoacidose diabética, o potássio elevado pode ser o primeiro número que chama sua atenção, mas a hipocalemia durante o tratamento pode se tornar o próximo problema. Antecipe essa mudança desde a avaliação inicial.",
    reference: "Causes and evaluation of hyperkalemia in adults, seção “Insulin deficiency, hyperglycemia, and hyperosmolality”; Treatment and prevention of hyperkalemia in adults, introdução."
  },
  {
    title: "O potássio caiu. Ele foi eliminado?",
    competency: "Interpretar a resposta à redistribuição",
    stem: "Um homem de 66 anos, com doença renal crônica avançada, apresenta potássio sérico de 6,7 mEq/L. Após avaliação e início do tratamento, recebe insulina intravenosa associada à glicose.\n\nUma hora depois, o potássio é de 5,5 mEq/L. O paciente permanece oligúrico.\n\nUm interno afirma:\n\n“Ótimo. A insulina eliminou o excesso de potássio. Agora não precisamos mais nos preocupar com ele.”\n\nQual é a melhor resposta a essa afirmação?",
    table: undefined,
    stemAfter: undefined,
    choices: {
      A: "A queda do potássio demonstra que a insulina aumentou a eliminação renal, mesmo na presença de oligúria.",
      B: "A insulina transforma o potássio extracelular em uma substância eletricamente inativa, eliminando seu risco cardíaco.",
      C: "A redução da concentração sérica resulta principalmente da entrada de potássio nas células; como a eliminação renal permanece comprometida, existe risco de nova elevação.",
      D: "O risco de rebote só existe quando o paciente apresenta hipercalemia causada por aumento da ingestão alimentar."
    },
    pearl: "Uma queda expressiva do potássio após insulina pode dar uma falsa sensação de segurança. Pergunte sempre: “O potássio saiu do organismo ou apenas mudou de compartimento?”",
    reference: "Treatment and prevention of hyperkalemia in adults, abordagem da redistribuição e remoção de potássio."
  },
  {
    title: "O paciente foi retirado dos escombros. O risco terminou?",
    competency: "Identificar liberação celular contínua e antecipar deterioração",
    stem: "Um homem de 39 anos é resgatado após permanecer seis horas com os membros inferiores comprimidos por escombros.\n\nNa admissão, apresenta dor muscular intensa, edema das coxas e urina escurecida.\n\nOs exames iniciais mostram:",
    table: {"caption":"Exames iniciais","headers":["Parâmetro","Resultado"],"rows":[["Potássio","5,8 mEq/L"],["Creatinina","1,3 mg/dL"],["Creatinoquinase","28.400 U/L"],["pH arterial","7,31"]]},
    stemAfter: "O eletrocardiograma não apresenta alterações sugestivas de hipercalemia.\n\nDuas horas depois, apesar da ausência de administração de potássio, uma nova dosagem mostra 6,4 mEq/L.\n\nQual interpretação melhor explica essa evolução e orienta a vigilância do paciente?",
    choices: {
      A: "A elevação do potássio indica necessariamente que o paciente desenvolveu insuficiência renal grave entre as duas dosagens.",
      B: "A creatinoquinase elevada é responsável por converter sódio em potássio, aumentando sua produção.",
      C: "A ausência de alterações eletrocardiográficas demonstra que a elevação decorre apenas de pseudohipercalemia.",
      D: "A lesão muscular pode continuar liberando potássio intracelular, produzindo elevação progressiva, que pode ser agravada por comprometimento da excreção renal."
    },
    pearl: "Na rabdomiólise, o potássio pode estar subindo enquanto você ainda aguarda uma elevação expressiva da creatinina. Não espere a insuficiência renal se tornar evidente para reconhecer o risco.",
    reference: "Causes and evaluation of hyperkalemia in adults, seção “Increased tissue catabolism”; Treatment and prevention of hyperkalemia in adults, seção “Determining the urgency of therapy”."
  },
  {
    title: "Toda acidose desloca potássio da mesma maneira?",
    competency: "Evitar uma generalização fisiopatológica",
    stem: "Durante uma discussão de casos na emergência, dois pacientes apresentam acidose metabólica.\n\nO primeiro tem diarreia intensa, bicarbonato de 12 mEq/L e acidose metabólica hiperclorêmica.\n\nO segundo apresenta cetoacidose diabética, com glicemia de 530 mg/dL, bicarbonato de 10 mEq/L e deficiência importante de insulina.\n\nUm residente afirma:\n\n“Nos dois casos, o potássio sobe pelo mesmo mecanismo. Quanto mais baixo o pH, maior será obrigatoriamente o potássio sérico.”\n\nQual afirmação corrige melhor esse raciocínio?",
    table: undefined,
    stemAfter: undefined,
    choices: {
      A: "O efeito da acidose sobre a distribuição do potássio depende do tipo de distúrbio; na acidose metabólica mineral, o deslocamento transcelular pode ser mais pronunciado, enquanto na cetoacidose a deficiência de insulina e a hiperosmolalidade têm papel importante.",
      B: "A acidose metabólica não interfere na distribuição do potássio, independentemente de sua causa.",
      C: "Na cetoacidose diabética, o aumento do potássio sérico demonstra que as perdas urinárias foram interrompidas.",
      D: "O pH permite estimar com precisão o potássio sérico, dispensando sua dosagem laboratorial."
    },
    pearl: "Diante de um paciente acidótico com hipercalemia, não encerre o raciocínio dizendo que “o potássio subiu por causa do pH”. Identifique qual acidose está presente e quais outros mecanismos estão atuando.",
    reference: "Causes and evaluation of hyperkalemia in adults, seções “Metabolic acidosis” e “Insulin deficiency, hyperglycemia, and hyperosmolality”."
  },
  {
    title: "Quando dois mecanismos se encontram",
    competency: "Integrar mecanismos e antecipar risco clínico",
    stem: "Um homem de 58 anos, com doença renal crônica, é internado após iniciar quimioterapia para uma neoplasia hematológica de elevada carga tumoral.\n\nNas últimas 12 horas, apresenta redução importante da diurese.\n\nOs exames mostram:",
    table: {"caption":"Exames laboratoriais","headers":["Parâmetro","Resultado"],"rows":[["Potássio inicial","5,1 mEq/L"],["Potássio atual","6,6 mEq/L"],["Creatinina","3,2 mg/dL"],["Fósforo","7,1 mg/dL"],["Ácido úrico","11,8 mg/dL"],["Diurese","180 mL em 12 horas"]]},
    stemAfter: "O quadro levanta forte suspeita de síndrome de lise tumoral.\n\nUm interno pergunta por que o potássio aumentou tão rapidamente, apesar de o paciente não ter recebido reposição desse eletrólito.\n\nQual interpretação melhor explica o caso e orienta a conduta?",
    choices: {
      A: "A hipercalemia é causada exclusivamente pela doença renal crônica, pois a destruição tumoral não interfere na concentração de potássio.",
      B: "A elevação do potássio decorre apenas de redistribuição temporária; portanto, a oligúria não modifica o risco de recorrência.",
      C: "A ausência de reposição de potássio indica que o resultado deve ser considerado pseudohipercalemia até prova em contrário.",
      D: "A lise tumoral libera potássio intracelular, enquanto o comprometimento renal reduz sua eliminação; a combinação favorece hipercalemia rápida e potencialmente persistente, exigindo avaliação e tratamento urgentes."
    },
    pearl: "Quando o potássio está sendo liberado continuamente e o rim perdeu a capacidade de eliminá-lo, o problema pode progredir mesmo após uma resposta inicial ao tratamento. Não acompanhe apenas o valor atual: acompanhe a direção em que ele está caminhando.",
    reference: "Causes and evaluation of hyperkalemia in adults, seções “Increased tissue catabolism” e “Acute and chronic kidney disease”; Treatment and prevention of hyperkalemia in adults, seção “Determining the urgency of therapy”."
  }
];

/* Conteúdo aprovado da Aula 06, transcrito do enunciado entregue. */
const aprovado06 = [
  {
    title: "Ele está urinando. Então por que o potássio está alto?",
    competency: "Diferenciar diurese de excreção efetiva de potássio",
    stem: "Um homem de 71 anos, com doença renal crônica, procura atendimento após receber um resultado de potássio sérico de 5,9 mEq/L.\n\nEstá clinicamente estável, sem alterações eletrocardiográficas sugestivas de hipercalemia. Refere manter uma diurese de aproximadamente 1.500 mL por dia.\n\nOs exames mostram:",
    table: {"caption":"Exames","headers":["Parâmetro","Resultado"],"rows":[["Potássio","5,9 mEq/L"],["Creatinina","2,6 mg/dL"],["Bicarbonato","21 mEq/L"],["Diurese referida","1.500 mL/dia"]]},
    stemAfter: "Um interno comenta:\n\n“Se ele está urinando normalmente, o rim deveria conseguir eliminar o potássio. Talvez o resultado esteja errado.”\n\n**Qual interpretação é mais adequada?**",
    choices: {
      A: "A presença de diurese preservada exclui comprometimento da excreção renal de potássio, tornando a pseudohipercalemia a explicação mais provável.",
      B: "A eliminação renal de potássio depende da secreção tubular distal, que pode estar comprometida mesmo quando o paciente mantém volume urinário aparentemente adequado.",
      C: "A creatinina elevada indica que o potássio está sendo produzido pelos rins, independentemente da secreção tubular.",
      D: "O potássio só se eleva por doença renal quando o paciente apresenta anúria completa."
    },
    pearl: "Não pergunte apenas “quanto o paciente está urinando?”. Pergunte também se seus rins conseguem secretar potássio adequadamente. Diurese preservada não é garantia de equilíbrio do potássio.",
    reference: "Causes and evaluation of hyperkalemia in adults — seções “Reduced urinary potassium excretion” e “Acute and chronic kidney disease”."
  },
  {
    title: "A creatinina está quase normal. O que está faltando?",
    competency: "Reconhecer deficiência funcional de aldosterona",
    stem: "Uma mulher de 63 anos, com diabetes mellitus tipo 2 de longa duração, apresenta hipercalemia persistente em exames ambulatoriais.\n\nOs resultados mostram:",
    table: {"caption":"Exames","headers":["Parâmetro","Resultado"],"rows":[["Potássio","5,8 mEq/L"],["Creatinina","1,2 mg/dL"],["Bicarbonato","18 mEq/L"],["Cloro","110 mEq/L"],["Ânion gap","Normal"]]},
    stemAfter: "Não há evidência de hemólise da amostra. A paciente nega suplementação de potássio.\n\nA investigação identifica atividade de renina plasmática reduzida e concentração de aldosterona inadequadamente baixa para o grau de hipercalemia.\n\n**Qual mecanismo explica melhor os achados?**",
    choices: {
      A: "A deficiência de aldosterona estimula a secreção de potássio, mas aumenta sua absorção intestinal.",
      B: "A hipercalemia decorre necessariamente de liberação muscular de potássio, já que a creatinina não está muito elevada.",
      C: "A redução da atividade da aldosterona compromete a secreção distal de potássio e pode estar associada à acidose tubular renal tipo 4.",
      D: "A presença de acidose metabólica com ânion gap normal exclui mecanismos renais de hipercalemia."
    },
    pearl: "Diabetes, hipercalemia persistente e acidose metabólica hiperclorêmica formam uma combinação que deve fazer você considerar hipoaldosteronismo e acidose tubular renal tipo 4 — mesmo sem creatinina muito elevada.",
    reference: "Causes and evaluation of hyperkalemia in adults — seção “Reduced aldosterone secretion” e discussão da acidose tubular renal tipo 4."
  },
  {
    title: "A aldosterona está presente. Por que o potássio não sai?",
    competency: "Diferenciar deficiência hormonal de resistência tubular",
    stem: "Uma mulher de 59 anos, com doença renal crônica estável, apresenta elevação do potássio após iniciar trimetoprima-sulfametoxazol para tratar uma infecção.\n\nOs exames mostram:",
    table: {"caption":"Exames","headers":["Parâmetro","Resultado"],"rows":[["Potássio anterior","4,6 mEq/L"],["Potássio atual","5,9 mEq/L"],["Creatinina anterior","1,5 mg/dL"],["Creatinina atual","1,6 mg/dL"]]},
    stemAfter: "A amostra foi confirmada sem interferências pré-analíticas relevantes. A investigação não sugere deficiência de aldosterona.\n\nUm interno afirma:\n\n“Se a aldosterona está presente e a creatinina praticamente não mudou, não deveria existir retenção renal de potássio.”\n\n**Qual explicação melhor corrige essa afirmação?**",
    choices: {
      A: "A trimetoprima aumenta diretamente a produção de potássio pelas células musculares, independentemente da função renal.",
      B: "A presença de aldosterona garante a excreção adequada de potássio, tornando a elevação necessariamente laboratorial.",
      C: "A trimetoprima aumenta a reabsorção de sódio pelos canais epiteliais distais, estimulando a eliminação renal de potássio.",
      D: "A trimetoprima pode bloquear canais epiteliais de sódio no néfron distal, reduzindo a secreção de potássio mesmo sem deficiência de aldosterona."
    },
    pearl: "Na hipercalemia, não basta perguntar se existe aldosterona. É preciso perguntar se o néfron consegue responder a ela. Alguns medicamentos comprometem a secreção de potássio diretamente no túbulo distal.",
    reference: "Causes and evaluation of hyperkalemia in adults — seção “Reduced response to aldosterone”, especialmente o mecanismo dos bloqueadores dos canais epiteliais de sódio."
  },
  {
    title: "O rim está recebendo sódio suficiente?",
    competency: "Reconhecer a importância da entrega distal de sódio e água",
    stem: "Um homem de 76 anos, com insuficiência cardíaca avançada, é internado por piora da dispneia, edema de membros inferiores e redução da diurese.\n\nApresenta pressão arterial de 92/58 mmHg, extremidades frias e sinais de congestão sistêmica.\n\nOs exames mostram potássio de 5,8 mEq/L e creatinina de 2,1 mg/dL.\n\nDurante a discussão, um residente comenta:\n\n“Ele está congesto, então certamente existe bastante água chegando aos túbulos renais. Isso deveria facilitar a eliminação de potássio.”\n\n**Qual interpretação fisiopatológica é mais adequada?**",
    table: undefined,
    stemAfter: undefined,
    choices: {
      A: "A congestão sistêmica garante aumento do volume arterial efetivo e, consequentemente, maior entrega distal de sódio.",
      B: "A redução do volume arterial efetivo e da perfusão renal pode diminuir a entrega distal de sódio e água, prejudicando a secreção de potássio mesmo em um paciente com excesso de líquido corporal.",
      C: "A presença de edema demonstra que a aldosterona deixou de participar da regulação do potássio.",
      D: "A hipercalemia na insuficiência cardíaca só pode ocorrer quando existe anúria completa."
    },
    pearl: "Um paciente pode estar cheio de líquido e, ainda assim, apresentar perfusão arterial efetiva insuficiente. Na insuficiência cardíaca, não confunda congestão com entrega distal adequada de sódio e água.",
    reference: "Causes and evaluation of hyperkalemia in adults — seções “Reduced distal sodium and water delivery” e “Multiple factors”."
  },
  {
    title: "O potássio caiu, mas o problema renal continua",
    competency: "Integrar fisiopatologia renal e risco de recorrência",
    stem: "Um homem de 68 anos é internado na UTI com lesão renal aguda oligúrica associada a choque séptico.\n\nNas últimas seis horas, apresentou diurese total de 45 mL.\n\nOs exames iniciais mostram:",
    table: {"caption":"Exames iniciais","headers":["Parâmetro","Resultado"],"rows":[["Potássio","7,0 mEq/L"],["Creatinina","4,3 mg/dL"],["Bicarbonato","16 mEq/L"],["Diurese","45 mL/6 horas"]]},
    stemAfter: "O eletrocardiograma mostra alargamento do QRS.\n\nO paciente recebe tratamento emergencial para hipercalemia, incluindo estabilização cardíaca com cálcio intravenoso e medidas de redistribuição do potássio.\n\nApós uma hora, o potássio diminui para 5,7 mEq/L. Entretanto, a oligúria persiste.\n\nUm interno considera a resposta satisfatória e sugere encerrar a monitorização específica da hipercalemia.\n\n**Qual é a interpretação mais adequada?**",
    choices: {
      A: "A queda do potássio demonstra recuperação da secreção tubular distal, mesmo que a diurese permaneça reduzida.",
      B: "A administração de cálcio intravenoso remove o potássio corporal, tornando desnecessária uma estratégia de eliminação.",
      C: "A resposta inicial confirma que o rim está eliminando potássio adequadamente, dispensando novas dosagens.",
      D: "A redução do potássio pode representar apenas redistribuição temporária; como a excreção renal permanece gravemente comprometida, existe risco de rebote e necessidade de avaliar precocemente medidas efetivas de remoção, incluindo diálise."
    },
    pearl: "Quando o rim não consegue eliminar potássio, a melhora do exame após insulina pode ser apenas uma janela de segurança. Aproveite esse tempo para organizar a remoção do potássio, em vez de interpretar a queda como resolução definitiva.",
    reference: "Treatment and prevention of hyperkalemia in adults — seção “Determining the urgency of therapy” e abordagem da remoção de potássio; Causes and evaluation of hyperkalemia in adults — seção “Acute and chronic kidney disease”."
  }
];
/* Aula 06: cinco questões, gabarito B-C-D-B-D, tabelas nas 01, 02, 03 e 05. */
function conferirConteudo06(conteudo, aprovado) {
  assert.equal(conteudo.questions.length, aprovado.length);
  assert.equal(conteudo.questions.length, 5);
  assert.deepEqual(conteudo.key, ['B', 'C', 'D', 'B', 'D']);
  assert.deepEqual(Q.keyOf(conteudo), ['B', 'C', 'D', 'B', 'D']);
  conteudo.questions.forEach((q, i) => {
    assert.equal(q.number, i + 1);
    assert.equal(q.title, aprovado[i].title);
    assert.equal(q.competency, aprovado[i].competency);
    assert.equal(q.stem, aprovado[i].stem);
    assert.deepEqual(q.table, aprovado[i].table);
    assert.equal(q.stemAfter, aprovado[i].stemAfter);
    assert.deepEqual(q.choices, aprovado[i].choices);
    assert.deepEqual(Object.keys(q.feedback), ['A', 'B', 'C', 'D']);
    for (const letra of 'ABCD') assert.ok(q.feedback[letra].length > 60);
    assert.ok(q.correctExplanation.length > 300);
    assert.match(q.correctExplanation, /\n\s*\n/, 'a explicação deve ter múltiplos parágrafos');
    assert.equal(q.pearl, aprovado[i].pearl);
    assert.equal(q.reference, aprovado[i].reference);
  });
}

/* Aula 05 acrescenta competência, tabela laboratorial e trecho após a tabela. */
function conferirConteudo05(conteudo, aprovado) {
  assert.equal(conteudo.questions.length, aprovado.length);
  assert.equal(conteudo.questions.length, 5);
  assert.deepEqual(conteudo.key, ['B', 'C', 'D', 'A', 'D']);
  assert.deepEqual(Q.keyOf(conteudo), ['B', 'C', 'D', 'A', 'D']);
  conteudo.questions.forEach((q, i) => {
    assert.equal(q.number, i + 1);
    assert.equal(q.title, aprovado[i].title);
    assert.equal(q.competency, aprovado[i].competency);
    assert.equal(q.stem, aprovado[i].stem);
    assert.deepEqual(q.table, aprovado[i].table);
    assert.equal(q.stemAfter, aprovado[i].stemAfter);
    assert.deepEqual(q.choices, aprovado[i].choices);
    assert.deepEqual(Object.keys(q.feedback), ['A', 'B', 'C', 'D']);
    for (const letra of 'ABCD') assert.ok(q.feedback[letra].length > 60);
    assert.ok(q.correctExplanation.length > 300);
    assert.match(q.correctExplanation, /\n\s*\n/, 'a explicação deve ter múltiplos parágrafos');
    assert.equal(q.pearl, aprovado[i].pearl);
    assert.equal(q.reference, aprovado[i].reference);
  });
}

/* Conteúdo aprovado da Aula 07, transcrito do enunciado entregue. */
const aprovado07 = [
  {
    title: "O antibiótico que mudou o potássio",
    competency: "Reconhecer uma interação medicamentosa de risco",
    stem: "Um homem de 72 anos, com diabetes mellitus tipo 2, doença renal crônica e insuficiência cardíaca com fração de ejeção reduzida, procura a emergência por fraqueza e mal-estar.\n\nHá cinco dias, iniciou sulfametoxazol-trimetoprima para tratar uma infecção urinária.\n\nSeus medicamentos habituais incluem losartana e espironolactona.\n\nOs exames mostram:\n\n- Potássio há 2 semanas: 4,7 mEq/L.\n- Potássio atual: 6,3 mEq/L.\n- Creatinina anterior: 1,8 mg/dL.\n- Creatinina atual: 2,0 mg/dL.\n- Bicarbonato: 21 mEq/L.\n\nO ECG não apresenta alterações características de hipercalemia.\n\nUm interno comenta:\n\n“Ele já usava losartana e espironolactona há meses. Como o antibiótico não contém potássio, provavelmente não tem relação com o problema.”\n\n**Qual interpretação é mais adequada?**",
    choices: {
      A: "A trimetoprima pode reduzir a secreção renal de potássio por bloquear canais epiteliais de sódio no néfron distal, somando-se aos efeitos da losartana, da espironolactona e da doença renal crônica.",
      B: "A trimetoprima provoca hipercalemia principalmente porque contém potássio em sua estrutura química, funcionando como uma suplementação intravenosa.",
      C: "A ausência de alterações no ECG demonstra que a associação medicamentosa não produziu hipercalemia clinicamente relevante.",
      D: "A pequena elevação da creatinina exclui interferência dos medicamentos na excreção renal de potássio."
    },
    pearl: "Quando o potássio sobe após a introdução de um medicamento, não pergunte apenas se ele contém potássio. Pergunte se ele reduz a aldosterona, bloqueia sua ação ou interfere diretamente na secreção tubular.",
    reference: "UpToDate — Causes and evaluation of hyperkalemia in adults, seções sobre redução da secreção de aldosterona e da resposta tubular; Treatment and prevention of hyperkalemia in adults, seção “Drug-induced hyperkalemia”."
  },
  {
    title: "O sal que parecia mais saudável",
    competency: "Identificar uma fonte oculta de potássio na alimentação",
    stem: "Uma mulher de 67 anos, com hipertensão arterial, diabetes mellitus tipo 2 e doença renal crônica, apresenta hipercalemia persistente.\n\nUtiliza enalapril há aproximadamente três anos, sem mudanças recentes na dose.\n\nOs exames mostram:\n\n- Potássio há 3 meses: 4,8 mEq/L.\n- Potássio atual: 5,9 mEq/L.\n- Creatinina: 2,1 mg/dL.\n- Bicarbonato: 23 mEq/L.\n\nDurante a anamnese, a paciente afirma:\n\n“Doutor, estou me cuidando muito. Parei de usar sal comum e comprei um sal com menos sódio, que diz ser melhor para a pressão.”\n\nAo examinar a embalagem trazida pela paciente, você identifica que o produto utiliza cloreto de potássio para substituir parte do cloreto de sódio.\n\n**Qual é a interpretação mais adequada?**",
    choices: {
      A: "O cloreto de potássio é incapaz de elevar o potássio sérico quando utilizado como substituto alimentar do sal.",
      B: "O enalapril deve ser considerado a única causa possível, pois mudanças alimentares não interferem significativamente no potássio de pacientes com doença renal.",
      C: "A substituição de cloreto de sódio por cloreto de potássio pode aumentar a ingestão desse eletrólito e contribuir para hipercalemia, especialmente quando a capacidade renal de excreção está comprometida.",
      D: "A presença de potássio no substituto do sal indica que o produto deve ser utilizado para corrigir possíveis déficits corporais, independentemente da concentração sérica."
    },
    pearl: "Em pacientes com hipercalemia inexplicada, pergunte especificamente: “Qual sal você usa em casa?” A resposta pode revelar uma fonte importante de potássio que não aparece em nenhuma receita médica.",
    reference: "UpToDate — Causes and evaluation of hyperkalemia in adults, discussão sobre ingestão e adaptação ao potássio; Treatment and prevention of hyperkalemia in adults, seção “Dietary modification”."
  },
  {
    title: "O anti-inflamatório que não entrou na prescrição",
    competency: "Identificar medicamentos de uso eventual que comprometem a excreção de potássio",
    stem: "Um homem de 74 anos, com hipertensão arterial e doença renal crônica, procura atendimento por redução da diurese e fraqueza.\n\nUtiliza regularmente losartana e furosemida.\n\nNos últimos quatro dias, apresentou dor lombar e passou a tomar ibuprofeno por conta própria, três vezes ao dia.\n\nOs exames mostram:\n\n- Potássio anterior: 4,5 mEq/L.\n- Potássio atual: 6,1 mEq/L.\n- Creatinina anterior: 1,6 mg/dL.\n- Creatinina atual: 2,7 mg/dL.\n- Bicarbonato: 20 mEq/L.\n\nO paciente afirma que não começou nenhum medicamento novo, pois considera o ibuprofeno apenas um analgésico.\n\n**Qual interpretação melhor explica a deterioração renal e a hipercalemia?**",
    choices: {
      A: "O ibuprofeno provoca hipercalemia exclusivamente por liberar potássio das células musculares, sem interferir na função renal.",
      B: "A furosemida impede completamente a ocorrência de hipercalemia, tornando o resultado incompatível com os medicamentos utilizados.",
      C: "O ibuprofeno pode reduzir a síntese de prostaglandinas renais, comprometendo a perfusão e a filtração glomerular, além de favorecer menor atividade do sistema renina-aldosterona, contribuindo para a hipercalemia.",
      D: "O uso de anti-inflamatórios não esteroidais só pode provocar hipercalemia quando associado à suplementação oral de potássio."
    },
    pearl: "Quando a creatinina e o potássio sobem juntos, pergunte especificamente sobre anti-inflamatórios. Muitos pacientes não os mencionam espontaneamente porque não os consideram medicamentos de uso contínuo.",
    reference: "UpToDate — Causes and evaluation of hyperkalemia in adults, discussão sobre redução da secreção de aldosterona e doença renal; Treatment and prevention of hyperkalemia in adults, seção “Drug-induced hyperkalemia”."
  },
  {
    title: "O suplemento que ninguém perguntou",
    competency: "Reconhecer fontes não prescritas de potássio e sua interação com a função renal",
    stem: "Uma mulher de 61 anos, com doença renal crônica e hipertensão arterial, apresenta potássio de 5,8 mEq/L em avaliação ambulatorial.\n\nUtiliza valsartana e não houve mudanças recentes na prescrição.\n\nDurante a investigação, nega utilizar suplementos de potássio.\n\nEntretanto, ao perguntar sobre produtos naturais, vitaminas e suplementos alimentares, a paciente relata que começou a consumir diariamente um pó para preparo de bebidas, adquirido pela internet.\n\nAo examinar o rótulo, você identifica que cada porção contém 900 mg de potássio. A paciente consome duas porções por dia.\n\n**Qual interpretação é mais adequada?**",
    choices: {
      A: "Por se tratar de suplemento alimentar, e não de medicamento, o produto não pode contribuir para a hipercalemia.",
      B: "A presença de potássio no suplemento não tem importância clínica, porque os rins sempre conseguem eliminar o excesso ingerido.",
      C: "A única medida necessária é suspender definitivamente a valsartana, sem investigar a ingestão adicional de potássio.",
      D: "O suplemento fornece uma carga adicional relevante de potássio, que pode contribuir para hipercalemia em uma paciente com doença renal crônica e uso de bloqueador do sistema renina-angiotensina."
    },
    pearl: "Não se contente com a pergunta “usa suplemento de potássio?”. Pergunte sobre vitaminas, pós para bebidas, produtos naturais e suplementos nutricionais. O paciente pode estar ingerindo potássio sem saber.",
    reference: "UpToDate — Causes and evaluation of hyperkalemia in adults, discussão sobre ingestão de potássio e adaptação renal; Treatment and prevention of hyperkalemia in adults, seção “Dietary modification”."
  },
  {
    title: "Suspender tudo resolve o problema?",
    competency: "Integrar reconciliação medicamentosa, gravidade e preservação de benefícios terapêuticos",
    stem: "Um homem de 65 anos, com insuficiência cardíaca com fração de ejeção reduzida e doença renal crônica, procura atendimento após receber um resultado de potássio de 5,9 mEq/L.\n\nEstá clinicamente estável, sem alterações eletrocardiográficas sugestivas de hipercalemia.\n\nSeus medicamentos habituais incluem sacubitril-valsartana, espironolactona e carvedilol.\n\nNa última semana, iniciou ibuprofeno por conta própria para dor no joelho e passou a utilizar um substituto do sal contendo cloreto de potássio.\n\nOs exames mostram:\n\n- Potássio anterior: 4,7 mEq/L.\n- Potássio atual: 5,9 mEq/L.\n- Creatinina anterior: 1,7 mg/dL.\n- Creatinina atual: 1,9 mg/dL.\n\nUm interno propõe:\n\n“Vamos suspender definitivamente todos os medicamentos da insuficiência cardíaca que podem elevar o potássio. Assim eliminamos o risco de recorrência.”\n\n**Qual abordagem demonstra melhor raciocínio clínico?**",
    choices: {
      A: "Suspender definitivamente todos os bloqueadores do sistema renina-angiotensina-aldosterona, independentemente do benefício cardiovascular e da possibilidade de corrigir fatores reversíveis.",
      B: "Investigar e corrigir as causas modificáveis, incluindo ibuprofeno e substituto do sal, avaliar a gravidade e a necessidade de ajustes medicamentosos temporários, monitorar o potássio e buscar preservar ou reintroduzir tratamentos com benefício cardiorrenal quando for seguro.",
      C: "Manter todos os medicamentos e produtos utilizados, sem qualquer intervenção, porque a ausência de alterações eletrocardiográficas exclui risco.",
      D: "Considerar que a hipercalemia é exclusivamente alimentar, pois os medicamentos para insuficiência cardíaca não interferem na excreção renal de potássio."
    },
    pearl: "Antes de retirar definitivamente um medicamento que protege o coração ou os rins, procure o que mudou: anti-inflamatório recente, suplemento, substituto do sal ou piora da função renal. Corrigir o fator desencadeante pode permitir preservar um tratamento importante.",
    reference: "UpToDate — Treatment and prevention of hyperkalemia in adults, seções “Drug-induced hyperkalemia” e “Prevention”; Causes and evaluation of hyperkalemia in adults, mecanismos de redução da excreção renal de potássio."
  }
];
/* Aula 07: cinco questões, gabarito A-C-C-D-B, sem tabelas. */
function conferirConteudo07(conteudo, aprovado) {
  assert.equal(conteudo.questions.length, aprovado.length);
  assert.equal(conteudo.questions.length, 5);
  assert.deepEqual(conteudo.key, ['A', 'C', 'C', 'D', 'B']);
  assert.deepEqual(Q.keyOf(conteudo), ['A', 'C', 'C', 'D', 'B']);
  conteudo.questions.forEach((q, i) => {
    assert.equal(q.number, i + 1);
    assert.equal(q.title, aprovado[i].title);
    assert.equal(q.competency, aprovado[i].competency);
    assert.equal(q.stem, aprovado[i].stem);
    assert.equal(q.table, undefined);
    assert.equal(q.stemAfter, undefined);
    assert.deepEqual(q.choices, aprovado[i].choices);
    assert.deepEqual(Object.keys(q.feedback), ['A', 'B', 'C', 'D']);
    for (const letra of 'ABCD') assert.ok(q.feedback[letra].length > 60);
    assert.ok(q.correctExplanation.length > 300);
    assert.match(q.correctExplanation, /\n\s*\n/, 'a explicação deve ter múltiplos parágrafos');
    assert.equal(q.pearl, aprovado[i].pearl);
    assert.equal(q.reference, aprovado[i].reference);
  });
}
/* Conteúdo aprovado da Aula 08, transcrito do enunciado entregue. */
const aprovado08 = [
  {
    title: "As pernas pararam de responder",
    competency: "Reconhecer manifestações neuromusculares graves da hipercalemia",
    stem: "Um homem de 62 anos, com doença renal crônica avançada, procura a emergência por fraqueza progressiva nos membros inferiores iniciada há aproximadamente seis horas.\n\nInicialmente, percebeu dificuldade para subir escadas. Nas últimas duas horas, passou a necessitar de ajuda para ficar em pé.\n\nNega dor lombar, trauma ou alterações sensitivas.\n\nAo exame físico:\n\n- Consciente e orientado.\n- Força muscular grau 2/5 nos membros inferiores e 4/5 nos superiores.\n- Sensibilidade preservada.\n- Sem assimetria facial ou alterações da fala.\n- Frequência cardíaca de 58 bpm.\n- Pressão arterial de 138/82 mmHg.\n\nOs exames laboratoriais mostram:",
    table: {"caption":"Exames","headers":["Parâmetro","Resultado"],"rows":[["Potássio","7,2 mEq/L"],["Creatinina","4,8 mg/dL"],["Bicarbonato","19 mEq/L"],["Glicemia","126 mg/dL"]]},
    stemAfter: "O ECG apresenta ondas T apiculadas e discreto prolongamento do intervalo PR.\n\nUm interno comenta:\n\n“Ele está acordado, sem dor torácica e com pressão normal. Talvez essa fraqueza não tenha relação com o potássio.”\n\n**Qual interpretação é mais adequada?**",
    choices: {
      A: "A hipercalemia provoca exclusivamente manifestações cardíacas; a fraqueza muscular deve ser atribuída obrigatoriamente a outra doença.",
      B: "A preservação da sensibilidade exclui uma manifestação neuromuscular relacionada à hipercalemia.",
      C: "A hipercalemia grave pode provocar fraqueza muscular progressiva e até paralisia flácida, constituindo manifestação clínica de emergência, mesmo sem hipotensão ou alteração da consciência.",
      D: "A fraqueza muscular só pode ser atribuída à hipercalemia após o aparecimento de arritmia ventricular."
    },
    pearl: "Fraqueza muscular progressiva em um paciente com risco de hipercalemia deve acender um alerta imediato. Não espere aparecer uma arritmia para reconhecer que o potássio já pode estar comprometendo a excitabilidade celular.",
    reference: "UpToDate — Clinical manifestations of hyperkalemia in adults, seção “Severe muscle weakness or paralysis”; Treatment and prevention of hyperkalemia in adults, seção “Determining the urgency of therapy”."
  },
  {
    title: "A bradicardia não é apenas um número",
    competency: "Identificar instabilidade cardíaca potencialmente associada à hipercalemia",
    stem: "Um homem de 76 anos, com doença renal crônica e insuficiência cardíaca, é levado à emergência após apresentar tontura intensa e episódio de quase desmaio.\n\nUtiliza carvedilol, espironolactona e losartana.\n\nNa admissão:",
    table: {"caption":"Exames","headers":["Parâmetro","Resultado"],"rows":[["Frequência cardíaca","32 bpm"],["Pressão arterial","82/48 mmHg"],["Potássio","6,4 mEq/L"],["Creatinina","3,1 mg/dL"]]},
    stemAfter: "O monitor mostra bradicardia importante. O ECG de 12 derivações evidencia ritmo juncional lento e alargamento do QRS.\n\nUm residente afirma:\n\n“Como o potássio ainda não chegou a 7,0 mEq/L, a bradicardia provavelmente é causada apenas pelo betabloqueador.”\n\n**Qual interpretação melhor orienta a avaliação inicial?**",
    choices: {
      A: "A hipercalemia não provoca bradicardia importante em concentrações inferiores a 7,0 mEq/L.",
      B: "A presença de betabloqueador exclui a participação da hipercalemia na alteração do ritmo.",
      C: "A pressão arterial baixa demonstra que o potássio elevado é apenas consequência da bradicardia, sem participação no distúrbio de condução.",
      D: "A combinação de hipercalemia, bradicardia importante, alterações de condução e instabilidade hemodinâmica representa um sinal de alarme, podendo haver interação entre o potássio elevado e medicamentos que reduzem a condução atrioventricular."
    },
    pearl: "Bradicardia importante em paciente com disfunção renal e potássio elevado exige pensar em hipercalemia, mesmo quando o valor não parece extremamente alto. Se houver uso de bloqueadores do nó atrioventricular, considere a possibilidade de BRASH.",
    reference: "UpToDate — Clinical manifestations of hyperkalemia in adults, seção “Cardiac manifestations”; Treatment and prevention of hyperkalemia in adults, seção “Determining the urgency of therapy”."
  },
  {
    title: "O potássio subiu rápido demais",
    competency: "Reconhecer a velocidade de elevação como determinante do risco",
    stem: "Uma mulher de 48 anos é internada após sofrer politraumatismo com lesão muscular extensa.\n\nNa admissão, apresentava potássio de 4,3 mEq/L, creatinina de 1,0 mg/dL e ECG sem alterações relevantes.\n\nQuatro horas depois, a paciente apresenta fraqueza muscular, palpitações e sensação de mal-estar.\n\nUma nova avaliação mostra:",
    table: {"caption":"Exames","headers":["Parâmetro","Resultado"],"rows":[["Potássio inicial","4,3 mEq/L"],["Potássio atual","6,2 mEq/L"],["Creatinoquinase","32.000 U/L"],["Creatinina atual","1,5 mg/dL"],["Frequência cardíaca","112 bpm"]]},
    stemAfter: "O ECG apresenta ondas T apiculadas, não observadas no traçado anterior.\n\nUm interno comenta:\n\n“Já vimos pacientes com potássio de 6,2 mEq/L que estavam completamente assintomáticos. Talvez possamos aguardar.”\n\n**Qual interpretação é mais adequada?**",
    choices: {
      A: "A velocidade de elevação do potássio não interfere na gravidade; somente o valor absoluto determina o risco de manifestações clínicas.",
      B: "A elevação rápida do potássio pode provocar manifestações neuromusculares e cardíacas em concentrações menores do que aquelas toleradas por alguns pacientes com hipercalemia crônica, especialmente quando existe liberação celular contínua.",
      C: "A creatinoquinase elevada protege o miocárdio contra os efeitos elétricos da hipercalemia.",
      D: "A presença de taquicardia exclui manifestações cardíacas relacionadas à hipercalemia, pois essa condição provoca exclusivamente bradicardia."
    },
    pearl: "Não pergunte apenas “quanto está o potássio?”. Pergunte também “quanto estava antes e em quanto tempo chegou aqui?”. Uma elevação rápida pode ser mais perigosa do que o número isolado sugere.",
    reference: "UpToDate — Clinical manifestations of hyperkalemia in adults, seções sobre manifestações neuromusculares e cardíacas; Treatment and prevention of hyperkalemia in adults, seção “Determining the urgency of therapy”."
  },
  {
    title: "Ele não sente nada. Podemos ficar tranquilos?",
    competency: "Evitar falsa segurança diante da ausência de sintomas",
    stem: "Um homem de 66 anos, com doença renal crônica avançada, é encaminhado à emergência após um exame ambulatorial identificar potássio de 7,1 mEq/L.\n\nO paciente afirma estar bem e nega fraqueza, palpitações, tontura ou dor torácica.\n\nNa avaliação inicial:",
    table: {"caption":"Exames","headers":["Parâmetro","Resultado"],"rows":[["Potássio","7,1 mEq/L"],["Creatinina","5,2 mg/dL"],["Frequência cardíaca","76 bpm"],["Pressão arterial","142/86 mmHg"]]},
    stemAfter: "A amostra não apresenta hemólise relevante.\n\nO ECG mostra ritmo sinusal, sem alterações características de hipercalemia.\n\nUm residente comenta:\n\n“Como ele está assintomático e o ECG está normal, provavelmente podemos apenas orientar retorno ambulatorial.”\n\n**Qual interpretação é mais adequada?**",
    choices: {
      A: "A ausência de sintomas demonstra que a concentração elevada de potássio não representa risco imediato.",
      B: "O ECG sem alterações características exclui toxicidade cardíaca relacionada à hipercalemia.",
      C: "A presença de doença renal crônica significa que o organismo desenvolveu proteção completa contra os efeitos do potássio elevado.",
      D: "A hipercalemia grave pode estar presente sem sintomas ou alterações eletrocardiográficas típicas; o potássio de 7,1 mEq/L exige avaliação e tratamento emergenciais, mesmo diante de aparente estabilidade clínica."
    },
    pearl: "O paciente pode estar conversando normalmente enquanto apresenta hipercalemia grave. Não utilize a ausência de sintomas ou um ECG aparentemente normal como autorização para ignorar um potássio perigosamente elevado.",
    reference: "UpToDate — Clinical manifestations of hyperkalemia in adults, seção “Cardiac manifestations”; Treatment and prevention of hyperkalemia in adults, seção “Determining the urgency of therapy”."
  },
  {
    title: "Qual paciente exige sua atenção primeiro?",
    competency: "Integrar sinais de alarme para priorização clínica",
    stem: "Durante um plantão na emergência, quatro pacientes apresentam hipercalemia confirmada, sem evidências de pseudohipercalemia.\n\nTodos estão sendo avaliados pela equipe.\n\n**Paciente A:** homem de 58 anos, com doença renal crônica, potássio de 5,6 mEq/L, assintomático, ECG sem alterações características e função renal estável.\n\n**Paciente B:** mulher de 64 anos, com doença renal crônica, potássio de 6,0 mEq/L, sem sintomas, ECG sem alterações características e diurese preservada.\n\n**Paciente C:** homem de 73 anos, com doença renal crônica, potássio de 6,2 mEq/L, frequência cardíaca de 29 bpm, pressão arterial de 76/42 mmHg, confusão mental e QRS alargado.\n\n**Paciente D:** mulher de 55 anos, com potássio de 5,8 mEq/L, assintomática, ECG sem alterações características e função renal estável.\n\n**Qual paciente apresenta os sinais de alarme mais evidentes e exige intervenção imediata prioritária?**",
    table: undefined,
    stemAfter: undefined,
    choices: {
      A: "Paciente A, porque qualquer hipercalemia associada à doença renal crônica produz necessariamente instabilidade cardíaca.",
      B: "Paciente B, porque a concentração de 6,0 mEq/L, isoladamente, indica risco maior do que qualquer manifestação clínica.",
      C: "Paciente C, porque apresenta bradicardia extrema, hipotensão, alteração do estado mental e distúrbio de condução, configurando instabilidade grave potencialmente relacionada à hipercalemia.",
      D: "Paciente D, porque a ausência de doença renal avançada indica maior probabilidade de arritmia do que nos demais pacientes."
    },
    pearl: "Na hipercalemia, olhe primeiro para o paciente e para o monitor, não apenas para o número do laboratório. Bradicardia importante, hipotensão, alteração da consciência e distúrbios de condução são sinais de alarme que não podem esperar.",
    reference: "UpToDate — Clinical manifestations of hyperkalemia in adults, seção “Cardiac manifestations”; Treatment and prevention of hyperkalemia in adults, seção “Determining the urgency of therapy”."
  }
];
/* Aula 08: cinco questões, gabarito C-D-B-D-C, tabelas nas 01-04. */
function conferirConteudo08(conteudo, aprovado) {
  assert.equal(conteudo.questions.length, aprovado.length);
  assert.equal(conteudo.questions.length, 5);
  assert.deepEqual(conteudo.key, ['C', 'D', 'B', 'D', 'C']);
  assert.deepEqual(Q.keyOf(conteudo), ['C', 'D', 'B', 'D', 'C']);
  conteudo.questions.forEach((q, i) => {
    assert.equal(q.number, i + 1);
    assert.equal(q.title, aprovado[i].title);
    assert.equal(q.competency, aprovado[i].competency);
    assert.equal(q.stem, aprovado[i].stem);
    assert.deepEqual(q.table, aprovado[i].table);
    assert.equal(q.stemAfter, aprovado[i].stemAfter);
    assert.deepEqual(q.choices, aprovado[i].choices);
    assert.deepEqual(Object.keys(q.feedback), ['A', 'B', 'C', 'D']);
    for (const letra of 'ABCD') assert.ok(q.feedback[letra].length > 60);
    assert.ok(q.correctExplanation.length > 300);
    assert.match(q.correctExplanation, /\n\s*\n/, 'a explicação deve ter múltiplos parágrafos');
    assert.equal(q.pearl, aprovado[i].pearl);
    assert.equal(q.reference, aprovado[i].reference);
  });
}
/* Conteúdo aprovado da Aula 09, transcrito do enunciado entregue. */
const aprovado09 = [
  {
    title: "Aquela onda T sempre esteve ali?",
    competency: "Reconhecer alterações de repolarização e interpretá-las no contexto clínico",
    stem: "Um homem de 59 anos, com doença renal crônica, procura a emergência por redução da diurese há dois dias.\n\nApresenta pressão arterial de 136/84 mmHg, frequência cardíaca de 88 bpm e encontra-se consciente, sem dor torácica.\n\nO laboratório informa potássio de 6,4 mEq/L e creatinina de 3,2 mg/dL.\n\nO ECG mostra ritmo sinusal, QRS de 96 ms e ondas T altas, estreitas, simétricas e pontiagudas em múltiplas derivações. Um ECG realizado três meses antes não apresentava essas alterações.\n\nUm interno comenta:\n\n“Como o QRS ainda está estreito, não parece haver efeito cardíaco importante do potássio.”\n\n**Qual interpretação é mais adequada?**",
    table: undefined,
    stemAfter: undefined,
    choices: {
      A: "O QRS estreito exclui alterações eletrocardiográficas relacionadas à hipercalemia.",
      B: "Ondas T altas, estreitas e pontiagudas, especialmente quando novas e associadas à elevação do potássio, podem representar uma manifestação eletrocardiográfica da hipercalemia, mesmo com QRS ainda estreito.",
      C: "As ondas T só podem ser atribuídas à hipercalemia quando acompanhadas de desaparecimento completo da onda P.",
      D: "Toda onda T alta e pontiaguda confirma hipercalemia, independentemente do contexto clínico e laboratorial."
    },
    pearl: "Não procure apenas ondas T apiculadas: procure ondas T que mudaram. Comparar o ECG atual com um traçado anterior pode ajudar muito mais do que avaliar apenas a altura da onda.",
    reference: "UpToDate — Clinical manifestations of hyperkalemia in adults, seção “ECG changes”; Treatment and prevention of hyperkalemia in adults, tabela de manejo emergencial."
  },
  {
    title: "A onda P está desaparecendo",
    competency: "Reconhecer alterações da condução atrial e ventricular",
    stem: "Uma mulher de 71 anos, com doença renal crônica avançada, é atendida por fraqueza e mal-estar.\n\nO potássio sérico é de 7,0 mEq/L.\n\nO ECG realizado na admissão mostra:\n\n- Frequência ventricular de 54 bpm.\n- Ondas P de baixa amplitude, algumas dificilmente identificáveis.\n- Intervalo PR de 260 ms nos complexos em que a onda P é visível.\n- QRS de 148 ms.\n\nUm ECG anterior apresentava PR de 170 ms e QRS de 92 ms.\n\nUm residente afirma:\n\n“Como não existem ondas T muito apiculadas, essas alterações provavelmente não têm relação com a hipercalemia.”\n\n**Qual interpretação é mais adequada?**",
    table: undefined,
    stemAfter: undefined,
    choices: {
      A: "A ausência de ondas T muito apiculadas exclui comprometimento da condução relacionado à hipercalemia.",
      B: "O prolongamento do PR e o alargamento do QRS são alterações inespecíficas que não podem ocorrer na hipercalemia.",
      C: "A redução da amplitude da onda P demonstra exclusivamente uma alteração técnica do eletrocardiograma.",
      D: "A redução ou perda da onda P, o prolongamento do PR e o alargamento do QRS podem representar comprometimento progressivo da condução elétrica pela hipercalemia, mesmo sem ondas T tipicamente apiculadas."
    },
    pearl: "Na hipercalemia, não olhe apenas para a onda T. Uma onda P que desaparece, um PR que aumenta ou um QRS que alarga podem representar uma ameaça elétrica ainda mais importante.",
    reference: "UpToDate — Clinical manifestations of hyperkalemia in adults, seções “ECG changes” e “Conduction abnormalities and arrhythmias”."
  },
  {
    title: "Quando o QRS encontra a onda T",
    competency: "Reconhecer o padrão sinusoidal como sinal de toxicidade elétrica extrema",
    stem: "Um homem de 68 anos, em tratamento dialítico crônico, é levado à emergência após perder duas sessões consecutivas de hemodiálise.\n\nChega sonolento, com extremidades frias e dificuldade para responder às perguntas.\n\nNa avaliação inicial:",
    table: {"caption":"Exames","headers":["Parâmetro","Resultado"],"rows":[["Frequência cardíaca","38 bpm"],["Pressão arterial","78/46 mmHg"],["Potássio","8,6 mEq/L"],["Creatinina","10,2 mg/dL"],["Bicarbonato","13 mEq/L"]]},
    stemAfter: "O monitor cardíaco mostra complexos QRS extremamente alargados, com transição pouco definida entre o QRS e a onda T. O traçado apresenta aspecto ondulatório contínuo, semelhante a uma senoide.\n\nAs ondas P não são identificáveis.\n\nUm interno pergunta:\n\n“Isso ainda é um ECG de hipercalemia ou já estamos diante de uma arritmia completamente diferente?”\n\n**Qual interpretação é mais adequada?**",
    choices: {
      A: "O padrão sinusoidal pode representar toxicidade elétrica extrema pela hipercalemia, com grave comprometimento da condução ventricular e risco iminente de arritmias fatais ou assistolia, exigindo intervenção imediata.",
      B: "O padrão sinusoidal indica apenas uma alteração benigna da repolarização, sem comprometimento da condução ventricular.",
      C: "O desaparecimento das ondas P demonstra que o paciente desenvolveu necessariamente fibrilação atrial, independentemente dos demais achados.",
      D: "A fusão entre QRS e onda T indica que o potássio começou a retornar ao espaço intracelular, representando melhora espontânea."
    },
    pearl: "Quando o QRS se alarga a ponto de praticamente se fundir com a onda T, não perca tempo procurando a próxima alteração eletrocardiográfica. Você pode estar diante de uma emergência hipercalêmica imediatamente ameaçadora à vida.",
    reference: "UpToDate — Clinical manifestations of hyperkalemia in adults, seção “ECG changes”; Treatment and prevention of hyperkalemia in adults, tabela de manejo emergencial."
  },
  {
    title: "Potássio de 7,8 com ECG normal?",
    competency: "Compreender a baixa sensibilidade do ECG para excluir hipercalemia",
    stem: "Uma mulher de 63 anos, com doença renal crônica avançada, é encaminhada à emergência após receber resultado de potássio de 7,8 mEq/L em exame ambulatorial.\n\nEstá consciente, orientada e nega palpitações, fraqueza ou dor torácica.\n\nNa avaliação:",
    table: {"caption":"Exames","headers":["Parâmetro","Resultado"],"rows":[["Potássio","7,8 mEq/L"],["Creatinina","5,6 mg/dL"],["Frequência cardíaca","82 bpm"],["Pressão arterial","148/88 mmHg"]]},
    stemAfter: "O ECG apresenta ritmo sinusal, ondas P identificáveis, QRS de 94 ms e ausência de ondas T claramente apiculadas.\n\nA coleta foi adequada, sem evidência de hemólise. Uma nova amostra, obtida prontamente, confirma potássio de 7,6 mEq/L.\n\nUm residente comenta:\n\n“Se o potássio estivesse realmente tão alto, o ECG obrigatoriamente estaria alterado.”\n\n**Qual afirmação melhor explica a situação?**",
    choices: {
      A: "Um ECG normal possui sensibilidade suficiente para excluir hipercalemia grave, mesmo quando duas amostras confirmam valores elevados.",
      B: "A ausência de alterações eletrocardiográficas significa que o potássio está elevado apenas no sangue, mas não produz qualquer efeito fisiológico.",
      C: "O ECG possui sensibilidade limitada para detectar hipercalemia; sua aparência pode permanecer pouco alterada mesmo diante de concentrações muito elevadas, e um traçado normal não exclui risco clínico.",
      D: "O ECG só apresenta alterações na hipercalemia quando existe infarto agudo do miocárdio associado."
    },
    pearl: "ECG normal não é sinônimo de potássio seguro. Um traçado alterado pode ajudar a reconhecer a emergência, mas um traçado normal não autoriza ignorar uma hipercalemia grave confirmada.",
    reference: "UpToDate — Clinical manifestations of hyperkalemia in adults, seção “ECG changes”, incluindo a discussão sobre baixa sensibilidade do ECG e a possibilidade de traçados normais em hipercalemia grave."
  },
  {
    title: "O QRS estreitou. O potássio normalizou?",
    competency: "Diferenciar estabilização elétrica de correção da hipercalemia",
    stem: "Um homem de 70 anos, com doença renal crônica avançada, é atendido por fraqueza intensa.\n\nOs exames mostram potássio de 7,4 mEq/L.\n\nO ECG inicial apresenta bradicardia, ondas P pouco evidentes e QRS de 164 ms.\n\nDiante da suspeita de toxicidade elétrica pela hipercalemia, a equipe administra cálcio intravenoso.\n\nPoucos minutos depois, o paciente apresenta frequência cardíaca de 78 bpm, com QRS de 108 ms.\n\nUm interno comenta:\n\n“Excelente! O QRS praticamente normalizou. Isso significa que o potássio já caiu e podemos encerrar o tratamento.”\n\n**Qual interpretação é mais adequada?**",
    table: undefined,
    stemAfter: undefined,
    choices: {
      A: "O estreitamento do QRS confirma que o cálcio promoveu eliminação renal de potássio, normalizando sua concentração sérica.",
      B: "A melhora do ECG pode indicar estabilização elétrica após o cálcio, mas não demonstra redução do potássio sérico; são necessárias medidas para redistribuir e remover potássio, além de monitorização e reavaliação laboratorial.",
      C: "O cálcio intravenoso reduz diretamente a quantidade total de potássio corporal, tornando desnecessárias outras intervenções.",
      D: "A normalização do QRS permite descartar o resultado laboratorial inicial, pois a hipercalemia verdadeira não responde ao cálcio."
    },
    pearl: "O cálcio protege o coração, mas não baixa o potássio. Se o QRS estreitou depois do cálcio, você pode ter ganhado tempo — não necessariamente resolvido a hipercalemia.",
    reference: "UpToDate — Treatment and prevention of hyperkalemia in adults, seções sobre estabilização cardíaca com cálcio e monitorização; Clinical manifestations of hyperkalemia in adults, discussão sobre as limitações do ECG na avaliação da resposta terapêutica."
  }
];
/* Aula 09: cinco questões, gabarito B-D-A-C-B, tabelas nas 03 e 04. */
function conferirConteudo09(conteudo, aprovado) {
  assert.equal(conteudo.questions.length, aprovado.length);
  assert.equal(conteudo.questions.length, 5);
  assert.deepEqual(conteudo.key, ['B', 'D', 'A', 'C', 'B']);
  assert.deepEqual(Q.keyOf(conteudo), ['B', 'D', 'A', 'C', 'B']);
  conteudo.questions.forEach((q, i) => {
    assert.equal(q.number, i + 1);
    assert.equal(q.title, aprovado[i].title);
    assert.equal(q.competency, aprovado[i].competency);
    assert.equal(q.stem, aprovado[i].stem);
    assert.deepEqual(q.table, aprovado[i].table);
    assert.equal(q.stemAfter, aprovado[i].stemAfter);
    assert.deepEqual(q.choices, aprovado[i].choices);
    assert.deepEqual(Object.keys(q.feedback), ['A', 'B', 'C', 'D']);
    for (const letra of 'ABCD') assert.ok(q.feedback[letra].length > 60);
    assert.ok(q.correctExplanation.length > 300);
    assert.match(q.correctExplanation, /\n\s*\n/, 'a explicação deve ter múltiplos parágrafos');
    assert.equal(q.pearl, aprovado[i].pearl);
    assert.equal(q.reference, aprovado[i].reference);
  });
}
function conferirConteudo(conteudo, aprovado, chave) {
  assert.equal(conteudo.questions.length, aprovado.length);
  assert.equal(conteudo.questions.length, 5);
  assert.deepEqual(conteudo.key, chave);
  assert.deepEqual(Q.keyOf(conteudo), chave);
  conteudo.questions.forEach((q, i) => {
    assert.equal(q.number, i + 1);
    assert.equal(q.title, aprovado[i].title);
    assert.equal(q.stem, aprovado[i].stem);
    assert.deepEqual(q.choices, aprovado[i].choices);
    assert.deepEqual(Object.keys(q.feedback), ['A', 'B', 'C', 'D']);
    for (const letra of 'ABCD') assert.ok(q.feedback[letra].length > 60);
    assert.ok(q.correctExplanation.length > 80);
    assert.equal(q.pearl, aprovado[i].pearl);
    assert.ok((q.reference || conteudo.references).length > 10);
  });
}

/* 1 e 3 — Aula 01 continua exatamente como aprovada. */
test('Aula 01: enunciados, alternativas e gabarito preservados', () => {
  assert.equal(AULA_01.slug, SLUG_01);
  conferirConteudo(AULA_01, aprovado01, ['B', 'C', 'B', 'D', 'C']);
  assert.match(AULA_01.references, /UpToDate/);
});

/* 2, 3, 4, 7, 8 — Aula 02 com as cinco questões exatas. */
test('Aula 02: cinco questões exatas, gabarito B-C-B-D-C, análises e pérolas', () => {
  assert.equal(AULA_02.slug, SLUG_02);
  conferirConteudo(AULA_02, aprovado02, ['B', 'C', 'B', 'D', 'C']);
  assert.equal(AULA_02.questions.length, 5);
  assert.equal(AULA_02.questions[0].feedback.A.includes('menos negativo'), true);
  assert.equal(AULA_02.questions[3].feedback.D, 'A alternativa distingue corretamente proteção cardíaca, redistribuição temporária e remoção efetiva, três objetivos fundamentais do tratamento.');
});

/* Aula 03: cinco questões exatas, gabarito B-D-C-A-C, conteúdo integral. */
test('Aula 03: cinco questões exatas, gabarito B-D-C-A-C, análises e pérolas', () => {
  assert.equal(AULA_03.slug, SLUG_03);
  assert.equal(AULA_03.versao, 1);
  assert.equal(AULA_03.title, 'Hipercalemia — Aula 03');
  assert.equal(AULA_03.subtitle, 'Potássio sérico não é estoque corporal');
  conferirConteudo(AULA_03, aprovado03, ['B', 'D', 'C', 'A', 'C']);
  assert.equal(AULA_03.questions.length, 5);
  assert.deepEqual(AULA_03.questions.map((q) => q.number), [1, 2, 3, 4, 5]);
  assert.match(AULA_03.questions[0].correctExplanation, /98% do potássio corporal/);
  assert.match(AULA_03.questions[2].correctExplanation, /Na⁺\/K⁺-ATPase/);
  assert.equal(AULA_03.questions[4].pearl, 'O tratamento mudou o número. Agora você precisa descobrir o que esse número significa para o paciente e qual risco vem a seguir.');
  assert.ok(AULA_03.closing.includes('Concentração não é inventário'));
  assert.equal(AULA_03.questions.filter((q) => q.reference || AULA_03.references).length, 5);
});

/* Aula 04: cinco questões exatas, gabarito B-D-A-C-D, conteúdo integral. */
test('Aula 04: cinco questões exatas, gabarito B-D-A-C-D, análises e pérolas', () => {
  assert.equal(AULA_04.slug, SLUG_04);
  assert.equal(AULA_04.versao, 1);
  assert.equal(AULA_04.title, 'Hipercalemia — Aula 04');
  assert.equal(AULA_04.subtitle, 'Pseudohipercalemia — quando desconfiar e como confirmar');
  conferirConteudo(AULA_04, aprovado04, ['B', 'D', 'A', 'C', 'D']);
  assert.equal(AULA_04.questions.length, 5);
  assert.deepEqual(AULA_04.questions.map((q) => q.number), [1, 2, 3, 4, 5]);
  assert.match(AULA_04.questions[0].correctExplanation, /hemólise significativa/);
  assert.match(AULA_04.questions[2].correctExplanation, /plaquetas podem liberar potássio/);
  assert.match(AULA_04.questions[3].correctExplanation, /pseudohipercalemia reversa/);
  assert.equal(AULA_04.questions[4].pearl, 'Pseudohipercalemia é uma hipótese laboratorial. Instabilidade e alterações elétricas compatíveis com hipercalemia são problemas clínicos que não podem esperar.');
  assert.ok(AULA_04.closing.includes('Pseudohipercalemia é uma hipótese'));
  assert.equal(AULA_04.questions.filter((q) => q.reference || AULA_04.references).length, 5);
});

/* Aula 05: cinco questões exatas, gabarito B-C-D-A-D, tabelas, competências e pérolas. */
test('Aula 05: cinco questões exatas, gabarito B-C-D-A-D, tabelas e competências', () => {
  assert.equal(AULA_05.slug, SLUG_05);
  assert.equal(AULA_05.versao, 1);
  assert.equal(AULA_05.title, 'Hipercalemia — Aula 05');
  assert.equal(AULA_05.subtitle, 'Redistribuição e liberação celular de potássio');
  conferirConteudo05(AULA_05, aprovado05);
  assert.deepEqual(AULA_05.questions.map((q) => q.number), [1, 2, 3, 4, 5]);
  assert.deepEqual(AULA_05.questions.map((q) => q.competency), aprovado05.map((q) => q.competency));
  /* Somente as questões 01, 03 e 05 trazem tabela laboratorial. */
  assert.deepEqual(AULA_05.questions.filter((q) => q.table).map((q) => q.number), [1, 3, 5]);
  assert.deepEqual(AULA_05.questions[0].table.rows, [
    ['Glicemia', '584 mg/dL'], ['pH arterial', '7,12'], ['Bicarbonato', '9 mEq/L'],
    ['Potássio', '6,2 mEq/L'], ['Creatinina', '1,1 mg/dL']
  ]);
  assert.equal(AULA_05.questions[0].table.caption, 'Exames iniciais');
  assert.match(AULA_05.questions[0].correctExplanation, /Na⁺\/K⁺-ATPase/);
  assert.match(AULA_05.questions[4].correctExplanation, /síndrome de lise tumoral/);
  assert.ok(AULA_05.closing.includes('Redistribuição e remoção são processos diferentes'));
  assert.equal(AULA_05.questions.filter((q) => q.reference).length, 5);
  assert.match(AULA_05.references, /UpToDate/);
});

/* Aula 06: cinco questões exatas, gabarito B-C-D-B-D, tabelas e competências. */
test('Aula 06: cinco questões exatas, gabarito B-C-D-B-D, tabelas e competências', () => {
  assert.equal(AULA_06.slug, SLUG_06);
  assert.equal(AULA_06.versao, 1);
  assert.equal(AULA_06.title, 'Hipercalemia — Aula 06');
  assert.equal(AULA_06.subtitle, 'Quando o rim não consegue eliminar potássio');
  conferirConteudo06(AULA_06, aprovado06);
  assert.deepEqual(AULA_06.questions.map((q) => q.number), [1, 2, 3, 4, 5]);
  assert.deepEqual(AULA_06.questions.map((q) => q.competency), aprovado06.map((q) => q.competency));
  /* Tabelas nas questões 01, 02, 03 e 05; questão 04 é apenas texto. */
  assert.deepEqual(AULA_06.questions.filter((q) => q.table).map((q) => q.number), [1, 2, 3, 5]);
  assert.equal(AULA_06.questions[0].table.caption, 'Exames');
  assert.match(AULA_06.questions[0].correctExplanation, /segmento conector/);
  assert.match(AULA_06.questions[4].correctExplanation, /três efeitos terapêuticos/);
  assert.ok(AULA_06.closing.includes('Eliminação de potássio é função tubular'));
  assert.equal(AULA_06.questions.filter((q) => q.reference).length, 5);
  assert.match(AULA_06.references, /UpToDate/);
});

/* Aula 07: cinco questões exatas, gabarito A-C-C-D-B, competências e pérolas. */
test('Aula 07: cinco questões exatas, gabarito A-C-C-D-B e competências', () => {
  assert.equal(AULA_07.slug, SLUG_07);
  assert.equal(AULA_07.versao, 1);
  assert.equal(AULA_07.title, 'Hipercalemia — Aula 07');
  assert.equal(AULA_07.subtitle, 'Medicamentos e fontes de potássio que passam despercebidos');
  conferirConteudo07(AULA_07, aprovado07);
  assert.deepEqual(AULA_07.questions.map((q) => q.number), [1, 2, 3, 4, 5]);
  assert.deepEqual(AULA_07.questions.map((q) => q.competency), aprovado07.map((q) => q.competency));
  assert.equal(AULA_07.questions.filter((q) => q.table).length, 0);
  assert.match(AULA_07.questions[0].correctExplanation, /ensinamento central/);
  assert.match(AULA_07.questions[4].correctExplanation, /melhor conduta não é simplesmente/);
  assert.ok(AULA_07.closing.includes('Medicamentos podem causar hipercalemia'));
  assert.equal(AULA_07.questions.filter((q) => q.reference).length, 5);
  assert.match(AULA_07.references, /UpToDate/);
});

/* Aula 08: cinco questões exatas, gabarito C-D-B-D-C, tabelas e competências. */
test('Aula 08: cinco questões exatas, gabarito C-D-B-D-C e competências', () => {
  assert.equal(AULA_08.slug, SLUG_08);
  assert.equal(AULA_08.versao, 1);
  assert.equal(AULA_08.title, 'Hipercalemia — Aula 08');
  assert.equal(AULA_08.subtitle, 'Manifestações clínicas e sinais de alarme');
  conferirConteudo08(AULA_08, aprovado08);
  assert.deepEqual(AULA_08.questions.map((q) => q.number), [1, 2, 3, 4, 5]);
  assert.deepEqual(AULA_08.questions.map((q) => q.competency), aprovado08.map((q) => q.competency));
  assert.deepEqual(AULA_08.questions.filter((q) => q.table).map((q) => q.number), [1, 2, 3, 4]);
  assert.match(AULA_08.questions[0].correctExplanation, /gradiente de potássio/);
  assert.match(AULA_08.questions[4].correctExplanation, /paciente mais grave/);
  assert.ok(AULA_08.closing.includes('A hipercalemia pode comprometer'));
  assert.equal(AULA_08.questions.filter((q) => q.reference).length, 5);
  assert.match(AULA_08.references, /UpToDate/);
});

/* Aula 09: cinco questões exatas, gabarito B-D-A-C-B, tabelas e competências. */
test('Aula 09: cinco questões exatas, gabarito B-D-A-C-B e competências', () => {
  assert.equal(AULA_09.slug, SLUG_09);
  assert.equal(AULA_09.versao, 1);
  assert.equal(AULA_09.title, 'Hipercalemia — Aula 09');
  assert.equal(AULA_09.subtitle, 'ECG na hipercalemia: o que procurar e quais são suas limitações');
  conferirConteudo09(AULA_09, aprovado09);
  assert.deepEqual(AULA_09.questions.map((q) => q.number), [1, 2, 3, 4, 5]);
  assert.deepEqual(AULA_09.questions.map((q) => q.competency), aprovado09.map((q) => q.competency));
  assert.deepEqual(AULA_09.questions.filter((q) => q.table).map((q) => q.number), [3, 4]);
  assert.match(AULA_09.questions[0].correctExplanation, /ondas T altas/);
  assert.match(AULA_09.questions[4].correctExplanation, /melhora elétrica/);
  assert.ok(AULA_09.closing.includes('O ECG é fundamental'));
  assert.equal(AULA_09.questions.filter((q) => q.reference).length, 5);
  assert.match(AULA_09.references, /UpToDate/);
});

/* 5, 6, 9, 10 — feedback imediato, bloqueio, avanço e pontuação. */
test('engine: feedback só após confirmar, alternativa bloqueada, avanço e nota final', () => {
  let s = Q.E.fresh();
  assert.ok(Q.E.valid(s));
  const inicial = Q.visible(s, AULA_01);
  assert.ok(inicial.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl));
  assert.equal(inicial.closing, undefined);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'E' }, AULA_01), /Seleção indisponível/);
  assert.throws(() => Q.transition(s, 'next', {}, AULA_01), /Não há comentário/);

  s = Q.transition(s, 'answer', { choice: 'A' }, AULA_01);
  const depois = Q.visible(s, AULA_01);
  assert.equal(depois.questions[0].correctChoice, 'B');
  assert.deepEqual(Object.keys(depois.questions[0].feedback), ['A', 'B', 'C', 'D']);
  assert.ok(depois.questions[0].pearl);
  assert.ok(depois.questions[0].reference);
  assert.ok(!depois.questions[1].feedback && !depois.questions[1].correctChoice);
  assert.equal(Q.publicState(s, AULA_01).answers[0].correct, false);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'B' }, AULA_01), /Seleção indisponível/);

  s = Q.transition(s, 'next', {}, AULA_01);
  assert.ok(!Q.visible(s, AULA_01).questions[1].feedback);

  for (let i = 1; i < 5; i++) {
    s = Q.transition(s, 'answer', { choice: Q.E.KEY[i] }, AULA_01);
    s = Q.transition(s, 'next', {}, AULA_01);
  }
  assert.ok(s.finishedAt);
  assert.equal(Q.E.score(s, Q.keyOf(AULA_01)), 4);
  assert.equal(Q.publicState(s, AULA_01).score, 4);
  assert.ok(Q.visible(s, AULA_01).closing);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'A' }, AULA_01), /já foi concluída/);
});

/* 4 — o mesmo engine respeita o gabarito da Aula 02, sem herdar a chave da Aula 01. */
test('engine: Aula 02 usa o próprio gabarito e calcula a nota corretamente', () => {
  let s = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    s = Q.transition(s, 'answer', { choice: Q.keyOf(AULA_02)[i] }, AULA_02);
    s = Q.transition(s, 'next', {}, AULA_02);
  }
  assert.equal(Q.E.score(s, Q.keyOf(AULA_02)), 5);
  assert.equal(Q.publicState(s, AULA_02).score, 5);

  let errado = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    errado = Q.transition(errado, 'answer', { choice: Q.keyOf(AULA_02)[i] === 'A' ? 'B' : 'A' }, AULA_02);
    errado = Q.transition(errado, 'next', {}, AULA_02);
  }
  assert.equal(Q.E.score(errado, Q.keyOf(AULA_02)), 0);
  assert.equal(Q.publicState(errado, AULA_02).score, 0);
  assert.equal(Q.visible(errado, AULA_02).questions[3].correctChoice, 'D');
});

/* Aula 03: gabarito próprio, bloqueio após confirmar e aprovação em 80%. */
test('engine: Aula 03 usa o próprio gabarito, bloqueia a resposta e aprova com 80%', () => {
  let s = Q.E.fresh();
  const inicial = Q.visible(s, AULA_03);
  assert.ok(inicial.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl && !q.reference));
  assert.equal(inicial.closing, undefined);

  s = Q.transition(s, 'answer', { choice: 'A' }, AULA_03);
  assert.equal(Q.visible(s, AULA_03).questions[0].correctChoice, 'B');
  assert.equal(Q.publicState(s, AULA_03).answers[0].correct, false);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'B' }, AULA_03), /Seleção indisponível/);
  s = Q.transition(s, 'next', {}, AULA_03);

  for (let i = 1; i < 5; i++) {
    s = Q.transition(s, 'answer', { choice: Q.keyOf(AULA_03)[i] }, AULA_03);
    s = Q.transition(s, 'next', {}, AULA_03);
  }
  assert.ok(s.finishedAt);
  assert.equal(Q.E.score(s, Q.keyOf(AULA_03)), 4);
  assert.equal(Q.publicState(s, AULA_03).score, 4);
  assert.ok(Q.visible(s, AULA_03).closing);
  assert.equal(Q.visible(s, AULA_03).questions[3].correctChoice, 'A');
  assert.throws(() => Q.transition(s, 'answer', { choice: 'C' }, AULA_03), /já foi concluída/);

  let perfeito = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    perfeito = Q.transition(perfeito, 'answer', { choice: Q.keyOf(AULA_03)[i] }, AULA_03);
    perfeito = Q.transition(perfeito, 'next', {}, AULA_03);
  }
  assert.equal(Q.E.score(perfeito, Q.keyOf(AULA_03)), 5);
});

/* Aula 04: gabarito próprio, bloqueio após confirmar e aprovação em 80%. */
test('engine: Aula 04 usa o próprio gabarito, bloqueia a resposta e aprova com 80%', () => {
  let s = Q.E.fresh();
  const inicial = Q.visible(s, AULA_04);
  assert.ok(inicial.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl && !q.reference));
  assert.equal(inicial.closing, undefined);

  s = Q.transition(s, 'answer', { choice: 'A' }, AULA_04);
  assert.equal(Q.visible(s, AULA_04).questions[0].correctChoice, 'B');
  assert.equal(Q.publicState(s, AULA_04).answers[0].correct, false);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'B' }, AULA_04), /Seleção indisponível/);
  s = Q.transition(s, 'next', {}, AULA_04);

  for (let i = 1; i < 5; i++) {
    s = Q.transition(s, 'answer', { choice: Q.keyOf(AULA_04)[i] }, AULA_04);
    s = Q.transition(s, 'next', {}, AULA_04);
  }
  assert.ok(s.finishedAt);
  assert.equal(Q.E.score(s, Q.keyOf(AULA_04)), 4);
  assert.equal(Q.publicState(s, AULA_04).score, 4);
  assert.ok(Q.visible(s, AULA_04).closing);
  assert.equal(Q.visible(s, AULA_04).questions[4].correctChoice, 'D');
  assert.throws(() => Q.transition(s, 'answer', { choice: 'C' }, AULA_04), /já foi concluída/);

  let perfeito = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    perfeito = Q.transition(perfeito, 'answer', { choice: Q.keyOf(AULA_04)[i] }, AULA_04);
    perfeito = Q.transition(perfeito, 'next', {}, AULA_04);
  }
  assert.equal(Q.E.score(perfeito, Q.keyOf(AULA_04)), 5);
});

/* Aula 05: gabarito próprio, tabelas visíveis antes e depois, aprovação em 80%. */
test('engine: Aula 05 usa o próprio gabarito, expõe tabelas e aprova com 80%', () => {
  let s = Q.E.fresh();
  const inicial = Q.visible(s, AULA_05);
  assert.equal(inicial.questions[0].competency, 'Reconhecer o mecanismo predominante');
  assert.ok(inicial.questions[0].table);
  assert.ok(inicial.questions[0].stemAfter);
  assert.equal(inicial.questions[1].table, undefined);
  assert.equal(inicial.questions[3].stemAfter, undefined);
  assert.ok(inicial.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl && !q.reference));
  assert.equal(inicial.closing, undefined);

  s = Q.transition(s, 'answer', { choice: 'A' }, AULA_05);
  const depois = Q.visible(s, AULA_05);
  assert.equal(depois.questions[0].correctChoice, 'B');
  assert.ok(depois.questions[0].table, 'a tabela continua visível após responder');
  assert.equal(depois.questions[0].stemAfter, AULA_05.questions[0].stemAfter);
  assert.equal(Q.publicState(s, AULA_05).answers[0].correct, false);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'B' }, AULA_05), /Seleção indisponível/);
  s = Q.transition(s, 'next', {}, AULA_05);

  for (let i = 1; i < 5; i++) {
    s = Q.transition(s, 'answer', { choice: Q.keyOf(AULA_05)[i] }, AULA_05);
    s = Q.transition(s, 'next', {}, AULA_05);
  }
  assert.ok(s.finishedAt);
  assert.equal(Q.E.score(s, Q.keyOf(AULA_05)), 4);
  assert.equal(Q.publicState(s, AULA_05).score, 4);
  assert.ok(Q.visible(s, AULA_05).closing);
  assert.equal(Q.visible(s, AULA_05).questions[4].correctChoice, 'D');
  assert.throws(() => Q.transition(s, 'answer', { choice: 'C' }, AULA_05), /já foi concluída/);

  let perfeito = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    perfeito = Q.transition(perfeito, 'answer', { choice: Q.keyOf(AULA_05)[i] }, AULA_05);
    perfeito = Q.transition(perfeito, 'next', {}, AULA_05);
  }
  assert.equal(Q.E.score(perfeito, Q.keyOf(AULA_05)), 5);
});

/* Aula 06: gabarito próprio, tabelas visíveis antes e depois, aprovação em 80%. */
test('engine: Aula 06 usa o próprio gabarito, expõe tabelas e aprova com 80%', () => {
  let s = Q.E.fresh();
  const inicial = Q.visible(s, AULA_06);
  assert.equal(inicial.questions[0].competency, 'Diferenciar diurese de excreção efetiva de potássio');
  assert.ok(inicial.questions[0].table);
  assert.ok(inicial.questions[0].stemAfter);
  assert.equal(inicial.questions[3].table, undefined);
  assert.ok(inicial.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl && !q.reference));
  assert.equal(inicial.closing, undefined);

  s = Q.transition(s, 'answer', { choice: 'A' }, AULA_06);
  const depois = Q.visible(s, AULA_06);
  assert.equal(depois.questions[0].correctChoice, 'B');
  assert.ok(depois.questions[0].table, 'a tabela continua visível após responder');
  assert.equal(depois.questions[0].stemAfter, AULA_06.questions[0].stemAfter);
  assert.equal(Q.publicState(s, AULA_06).answers[0].correct, false);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'B' }, AULA_06), /Seleção indisponível/);
  s = Q.transition(s, 'next', {}, AULA_06);

  for (let i = 1; i < 5; i++) {
    s = Q.transition(s, 'answer', { choice: Q.keyOf(AULA_06)[i] }, AULA_06);
    s = Q.transition(s, 'next', {}, AULA_06);
  }
  assert.ok(s.finishedAt);
  assert.equal(Q.E.score(s, Q.keyOf(AULA_06)), 4);
  assert.equal(Q.publicState(s, AULA_06).score, 4);
  assert.ok(Q.visible(s, AULA_06).closing);
  assert.equal(Q.visible(s, AULA_06).questions[4].correctChoice, 'D');
  assert.throws(() => Q.transition(s, 'answer', { choice: 'C' }, AULA_06), /já foi concluída/);

  let perfeito = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    perfeito = Q.transition(perfeito, 'answer', { choice: Q.keyOf(AULA_06)[i] }, AULA_06);
    perfeito = Q.transition(perfeito, 'next', {}, AULA_06);
  }
  assert.equal(Q.E.score(perfeito, Q.keyOf(AULA_06)), 5);
});

/* Aula 07: gabarito próprio, sem tabelas, aprovação em 80%. */
test('engine: Aula 07 usa o próprio gabarito e aprova com 80%', () => {
  let s = Q.E.fresh();
  const inicial = Q.visible(s, AULA_07);
  assert.equal(inicial.questions[0].competency, 'Reconhecer uma interação medicamentosa de risco');
  assert.equal(inicial.questions[0].table, undefined);
  assert.ok(inicial.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl && !q.reference));
  assert.equal(inicial.closing, undefined);

  s = Q.transition(s, 'answer', { choice: 'B' }, AULA_07);
  const depois = Q.visible(s, AULA_07);
  assert.equal(depois.questions[0].correctChoice, 'A');
  assert.equal(Q.publicState(s, AULA_07).answers[0].correct, false);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'A' }, AULA_07), /Seleção indisponível/);
  s = Q.transition(s, 'next', {}, AULA_07);

  for (let i = 1; i < 5; i++) {
    s = Q.transition(s, 'answer', { choice: Q.keyOf(AULA_07)[i] }, AULA_07);
    s = Q.transition(s, 'next', {}, AULA_07);
  }
  assert.ok(s.finishedAt);
  assert.equal(Q.E.score(s, Q.keyOf(AULA_07)), 4);
  assert.equal(Q.publicState(s, AULA_07).score, 4);
  assert.ok(Q.visible(s, AULA_07).closing);
  assert.equal(Q.visible(s, AULA_07).questions[4].correctChoice, 'B');
  assert.throws(() => Q.transition(s, 'answer', { choice: 'C' }, AULA_07), /já foi concluída/);

  let perfeito = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    perfeito = Q.transition(perfeito, 'answer', { choice: Q.keyOf(AULA_07)[i] }, AULA_07);
    perfeito = Q.transition(perfeito, 'next', {}, AULA_07);
  }
  assert.equal(Q.E.score(perfeito, Q.keyOf(AULA_07)), 5);
});

/* Aula 08: gabarito próprio, tabelas visíveis, aprovação em 80%. */
test('engine: Aula 08 usa o próprio gabarito, expõe tabelas e aprova com 80%', () => {
  let s = Q.E.fresh();
  const inicial = Q.visible(s, AULA_08);
  assert.equal(inicial.questions[0].competency, 'Reconhecer manifestações neuromusculares graves da hipercalemia');
  assert.ok(inicial.questions[0].table);
  assert.ok(inicial.questions[0].stemAfter);
  assert.equal(inicial.questions[4].table, undefined);
  assert.ok(inicial.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl && !q.reference));
  assert.equal(inicial.closing, undefined);

  s = Q.transition(s, 'answer', { choice: 'A' }, AULA_08);
  const depois = Q.visible(s, AULA_08);
  assert.equal(depois.questions[0].correctChoice, 'C');
  assert.ok(depois.questions[0].table, 'a tabela continua visível após responder');
  assert.equal(Q.publicState(s, AULA_08).answers[0].correct, false);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'C' }, AULA_08), /Seleção indisponível/);
  s = Q.transition(s, 'next', {}, AULA_08);

  for (let i = 1; i < 5; i++) {
    s = Q.transition(s, 'answer', { choice: Q.keyOf(AULA_08)[i] }, AULA_08);
    s = Q.transition(s, 'next', {}, AULA_08);
  }
  assert.ok(s.finishedAt);
  assert.equal(Q.E.score(s, Q.keyOf(AULA_08)), 4);
  assert.equal(Q.publicState(s, AULA_08).score, 4);
  assert.ok(Q.visible(s, AULA_08).closing);
  assert.equal(Q.visible(s, AULA_08).questions[4].correctChoice, 'C');
  assert.throws(() => Q.transition(s, 'answer', { choice: 'D' }, AULA_08), /já foi concluída/);

  let perfeito = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    perfeito = Q.transition(perfeito, 'answer', { choice: Q.keyOf(AULA_08)[i] }, AULA_08);
    perfeito = Q.transition(perfeito, 'next', {}, AULA_08);
  }
  assert.equal(Q.E.score(perfeito, Q.keyOf(AULA_08)), 5);
});

/* Aula 09: gabarito próprio, tabelas visíveis, aprovação em 80%. */
test('engine: Aula 09 usa o próprio gabarito, expõe tabelas e aprova com 80%', () => {
  let s = Q.E.fresh();
  const inicial = Q.visible(s, AULA_09);
  assert.equal(inicial.questions[0].competency, 'Reconhecer alterações de repolarização e interpretá-las no contexto clínico');
  assert.equal(inicial.questions[0].table, undefined);
  assert.ok(inicial.questions[2].table);
  assert.ok(inicial.questions[2].stemAfter);
  assert.ok(inicial.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl && !q.reference));
  assert.equal(inicial.closing, undefined);

  s = Q.transition(s, 'answer', { choice: 'A' }, AULA_09);
  const depois = Q.visible(s, AULA_09);
  assert.equal(depois.questions[0].correctChoice, 'B');
  assert.equal(Q.publicState(s, AULA_09).answers[0].correct, false);
  assert.throws(() => Q.transition(s, 'answer', { choice: 'B' }, AULA_09), /Seleção indisponível/);
  s = Q.transition(s, 'next', {}, AULA_09);

  for (let i = 1; i < 5; i++) {
    s = Q.transition(s, 'answer', { choice: Q.keyOf(AULA_09)[i] }, AULA_09);
    s = Q.transition(s, 'next', {}, AULA_09);
  }
  assert.ok(s.finishedAt);
  assert.equal(Q.E.score(s, Q.keyOf(AULA_09)), 4);
  assert.equal(Q.publicState(s, AULA_09).score, 4);
  assert.ok(Q.visible(s, AULA_09).closing);
  assert.equal(Q.visible(s, AULA_09).questions[4].correctChoice, 'B');
  assert.throws(() => Q.transition(s, 'answer', { choice: 'C' }, AULA_09), /já foi concluída/);

  let perfeito = Q.E.fresh();
  for (let i = 0; i < 5; i++) {
    perfeito = Q.transition(perfeito, 'answer', { choice: Q.keyOf(AULA_09)[i] }, AULA_09);
    perfeito = Q.transition(perfeito, 'next', {}, AULA_09);
  }
  assert.equal(Q.E.score(perfeito, Q.keyOf(AULA_09)), 5);
});

/* 11, 12, 13, 15 — domínio do caderno: identificação, indicadores, agrupamento e revisão. */
test('caderno: identificação estável, indicadores, agrupamento e revisão sem gabarito antecipado', () => {
  assert.equal(N.questaoId(SLUG_02, 3), 'hipercalemia-aula-02-v1#3');
  assert.deepEqual(N.separarId('hipercalemia-aula-02-v1#3'), { slug: SLUG_02, numero: 3 });
  assert.equal(N.separarId('sem-numero'), null);
  assert.equal(N.dominioAcertos('3'), 3);
  assert.equal(N.dominioAcertos('x'), 2);

  const itens = [
    { estado: 'precisa_revisar', revisoes: 0 },
    { estado: 'precisa_revisar', revisoes: 1 },
    { estado: 'em_revisao', revisoes: 2 },
    { estado: 'dominada', revisoes: 4 }
  ];
  assert.deepEqual(N.indicadores(itens), {
    total: 4, precisaRevisar: 2, emRevisao: 1, dominadas: 1, percentualDominio: 25, revisoes: 7
  });

  const row = {
    id: 'cad-1', questao_id: SLUG_02 + '#3', slug: SLUG_02, numero: 3, aula_id: AULA,
    estado: 'precisa_revisar', erros: 2, revisoes: 1, acertos_seguidos: 0,
    ultima_escolha: 'A', ultimo_erro_em: '2026-11-12T12:00:00.000Z', atualizado_em: '2026-11-12T12:00:00.000Z',
    aulas: { titulo: 'A fisiologia do potássio que muda a conduta', ordem: 2, modulos: { titulo: 'Módulo 1', ordem: 1, curso_id: CURSO_HIPER, cursos: { id: CURSO_HIPER, titulo: 'Tratamento da Hipercalemia em Adultos' } } }
  };
  const lista = N.montarLista([row, { ...row, id: 'cad-2', questao_id: SLUG_02 + '#4', numero: 4, estado: 'dominada' }], (slug) => Q.porSlug(slug));
  assert.equal(lista.itens.length, 2);
  assert.equal(lista.grupos[0].titulo, 'Tratamento da Hipercalemia em Adultos');
  assert.equal(lista.grupos[0].modulos[0].aulas[0].itens[0].numero, 3);
  assert.equal(lista.indicadores.total, 2);

  const revisao = N.revisaoView(row, AULA_02);
  assert.equal(revisao.stem, AULA_02.questions[2].stem);
  assert.deepEqual(revisao.choices, AULA_02.questions[2].choices);
  assert.equal(revisao.correctChoice, undefined);
  assert.equal(revisao.feedback, undefined);
  assert.equal(revisao.correctExplanation, undefined);
  assert.equal(revisao.pearl, undefined);

  const resultado = N.resultadoRevisao(row, AULA_02, 'A');
  assert.equal(resultado.correctChoice, 'B');
  assert.equal(resultado.correta, false);
  assert.deepEqual(Object.keys(resultado.feedback), ['A', 'B', 'C', 'D']);
  assert.equal(resultado.pearl, AULA_02.questions[2].pearl);
});

/* Aula 05 no caderno: revisão preserva tabela, competência e stemAfter sem vazar o gabarito. */
test('caderno: revisão da Aula 05 preserva tabela, competência e stemAfter sem gabarito', () => {
  const row = {
    id: 'cad-5', questao_id: SLUG_05 + '#1', slug: SLUG_05, numero: 1, aula_id: AULA,
    estado: 'precisa_revisar', erros: 1, revisoes: 0, acertos_seguidos: 0,
    ultima_escolha: 'A', ultimo_erro_em: '2026-11-12T12:00:00.000Z', atualizado_em: '2026-11-12T12:00:00.000Z',
    aulas: { titulo: 'Redistribuição e liberação celular de potássio', ordem: 2, modulos: { titulo: 'Módulo 2', ordem: 2, curso_id: CURSO_HIPER, cursos: { id: CURSO_HIPER, titulo: 'Tratamento da Hipercalemia em Adultos' } } }
  };
  const revisao = N.revisaoView(row, AULA_05);
  assert.equal(revisao.competency, AULA_05.questions[0].competency);
  assert.deepEqual(revisao.table, AULA_05.questions[0].table);
  assert.equal(revisao.stemAfter, AULA_05.questions[0].stemAfter);
  assert.equal(revisao.correctChoice, undefined);
  assert.equal(revisao.feedback, undefined);
  assert.equal(revisao.correctExplanation, undefined);
  assert.equal(revisao.pearl, undefined);

  const resultado = N.resultadoRevisao(row, AULA_05, 'A');
  assert.equal(resultado.correctChoice, 'B');
  assert.equal(resultado.correta, false);
  assert.match(resultado.correctExplanation, /\n\s*\n/);
  assert.equal(resultado.pearl, AULA_05.questions[0].pearl);
});

/* Aula 06 no caderno: revisão preserva tabela, competência e stemAfter sem vazar o gabarito. */
test('caderno: revisão da Aula 06 preserva tabela, competência e stemAfter sem gabarito', () => {
  const row = {
    id: 'cad-6', questao_id: SLUG_06 + '#1', slug: SLUG_06, numero: 1, aula_id: AULA,
    estado: 'precisa_revisar', erros: 1, revisoes: 0, acertos_seguidos: 0,
    ultima_escolha: 'A', ultimo_erro_em: '2026-11-12T12:00:00.000Z', atualizado_em: '2026-11-12T12:00:00.000Z',
    aulas: { titulo: 'Quando o rim não consegue eliminar potássio', ordem: 3, modulos: { titulo: 'Módulo 2', ordem: 2, curso_id: CURSO_HIPER, cursos: { id: CURSO_HIPER, titulo: 'Tratamento da Hipercalemia em Adultos' } } }
  };
  const revisao = N.revisaoView(row, AULA_06);
  assert.equal(revisao.competency, AULA_06.questions[0].competency);
  assert.deepEqual(revisao.table, AULA_06.questions[0].table);
  assert.equal(revisao.stemAfter, AULA_06.questions[0].stemAfter);
  assert.equal(revisao.correctChoice, undefined);
  assert.equal(revisao.feedback, undefined);
  assert.equal(revisao.correctExplanation, undefined);
  assert.equal(revisao.pearl, undefined);

  const resultado = N.resultadoRevisao(row, AULA_06, 'A');
  assert.equal(resultado.correctChoice, 'B');
  assert.equal(resultado.correta, false);
  assert.match(resultado.correctExplanation, /\n\s*\n/);
  assert.equal(resultado.pearl, AULA_06.questions[0].pearl);
});

/* Aula 07 no caderno: revisão preserva competência sem gabarito. */
test('caderno: revisão da Aula 07 preserva competência sem gabarito', () => {
  const row = {
    id: 'cad-7', questao_id: SLUG_07 + '#1', slug: SLUG_07, numero: 1, aula_id: AULA,
    estado: 'precisa_revisar', erros: 1, revisoes: 0, acertos_seguidos: 0,
    ultima_escolha: 'B', ultimo_erro_em: '2026-11-12T12:00:00.000Z', atualizado_em: '2026-11-12T12:00:00.000Z',
    aulas: { titulo: 'Medicamentos e fontes de potássio que passam despercebidos', ordem: 4, modulos: { titulo: 'Módulo 2', ordem: 2, curso_id: CURSO_HIPER, cursos: { id: CURSO_HIPER, titulo: 'Tratamento da Hipercalemia em Adultos' } } }
  };
  const revisao = N.revisaoView(row, AULA_07);
  assert.equal(revisao.competency, AULA_07.questions[0].competency);
  assert.equal(revisao.table, undefined);
  assert.equal(revisao.stemAfter, undefined);
  assert.equal(revisao.correctChoice, undefined);
  assert.equal(revisao.feedback, undefined);
  assert.equal(revisao.correctExplanation, undefined);
  assert.equal(revisao.pearl, undefined);

  const resultado = N.resultadoRevisao(row, AULA_07, 'B');
  assert.equal(resultado.correctChoice, 'A');
  assert.equal(resultado.correta, false);
  assert.match(resultado.correctExplanation, /\n\s*\n/);
  assert.equal(resultado.pearl, AULA_07.questions[0].pearl);
});

/* Aula 08 no caderno: revisão preserva tabela, competência e stemAfter sem vazar o gabarito. */
test('caderno: revisão da Aula 08 preserva tabela, competência e stemAfter sem gabarito', () => {
  const row = {
    id: 'cad-8', questao_id: SLUG_08 + '#1', slug: SLUG_08, numero: 1, aula_id: AULA,
    estado: 'precisa_revisar', erros: 1, revisoes: 0, acertos_seguidos: 0,
    ultima_escolha: 'A', ultimo_erro_em: '2026-11-12T12:00:00.000Z', atualizado_em: '2026-11-12T12:00:00.000Z',
    aulas: { titulo: 'Manifestações clínicas e sinais de alarme', ordem: 1, modulos: { titulo: 'Módulo 3', ordem: 3, curso_id: CURSO_HIPER, cursos: { id: CURSO_HIPER, titulo: 'Tratamento da Hipercalemia em Adultos' } } }
  };
  const revisao = N.revisaoView(row, AULA_08);
  assert.equal(revisao.competency, AULA_08.questions[0].competency);
  assert.deepEqual(revisao.table, AULA_08.questions[0].table);
  assert.equal(revisao.stemAfter, AULA_08.questions[0].stemAfter);
  assert.equal(revisao.correctChoice, undefined);
  assert.equal(revisao.feedback, undefined);
  assert.equal(revisao.correctExplanation, undefined);
  assert.equal(revisao.pearl, undefined);

  const resultado = N.resultadoRevisao(row, AULA_08, 'A');
  assert.equal(resultado.correctChoice, 'C');
  assert.equal(resultado.correta, false);
  assert.match(resultado.correctExplanation, /\n\s*\n/);
  assert.equal(resultado.pearl, AULA_08.questions[0].pearl);
});

/* Aula 09 no caderno: revisão preserva tabela, competência e stemAfter sem vazar o gabarito. */
test('caderno: revisão da Aula 09 preserva tabela, competência e stemAfter sem gabarito', () => {
  const row = {
    id: 'cad-9', questao_id: SLUG_09 + '#3', slug: SLUG_09, numero: 3, aula_id: AULA,
    estado: 'precisa_revisar', erros: 1, revisoes: 0, acertos_seguidos: 0,
    ultima_escolha: 'B', ultimo_erro_em: '2026-11-12T12:00:00.000Z', atualizado_em: '2026-11-12T12:00:00.000Z',
    aulas: { titulo: 'ECG na hipercalemia: o que procurar e quais são suas limitações', ordem: 2, modulos: { titulo: 'Módulo 3', ordem: 3, curso_id: CURSO_HIPER, cursos: { id: CURSO_HIPER, titulo: 'Tratamento da Hipercalemia em Adultos' } } }
  };
  const revisao = N.revisaoView(row, AULA_09);
  assert.equal(revisao.competency, AULA_09.questions[2].competency);
  assert.deepEqual(revisao.table, AULA_09.questions[2].table);
  assert.equal(revisao.stemAfter, AULA_09.questions[2].stemAfter);
  assert.equal(revisao.correctChoice, undefined);
  assert.equal(revisao.feedback, undefined);
  assert.equal(revisao.correctExplanation, undefined);
  assert.equal(revisao.pearl, undefined);

  const resultado = N.resultadoRevisao(row, AULA_09, 'B');
  assert.equal(resultado.correctChoice, 'A');
  assert.equal(resultado.correta, false);
  assert.match(resultado.correctExplanation, /\n\s*\n/);
  assert.equal(resultado.pearl, AULA_09.questions[2].pearl);
});

/* ------------------------------------------------------------------ API */
function montarRota({ aulaAtividade = null, semAtividade = false, slug = SLUG_01, cadernoInicial = [], ...overrides } = {}) {
  const logs = [];
  const tentativas = [];
  const sincronizacoes = [];
  const caderno = cadernoInicial.map((x) => ({ ...x }));
  const curso = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const modulo = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const aulaEmbed = (r) => ({
    titulo: slug === SLUG_09 ? 'ECG na hipercalemia: o que procurar e quais são suas limitações' : slug === SLUG_08 ? 'Manifestações clínicas e sinais de alarme' : slug === SLUG_07 ? 'Medicamentos e fontes de potássio que passam despercebidos' : slug === SLUG_06 ? 'Quando o rim não consegue eliminar potássio' : slug === SLUG_05 ? 'Redistribuição e liberação celular de potássio' : slug === SLUG_04 ? 'Pseudohipercalemia — quando desconfiar e como confirmar' : slug === SLUG_03 ? 'Potássio sérico não é estoque corporal' : slug === SLUG_02 ? 'A fisiologia do potássio que muda a conduta' : 'Aula 01',
    ordem: slug === SLUG_09 ? 2 : slug === SLUG_08 ? 1 : slug === SLUG_07 ? 4 : slug === SLUG_06 ? 3 : slug === SLUG_05 ? 2 : slug === SLUG_04 ? 1 : slug === SLUG_03 ? 3 : slug === SLUG_02 ? 2 : 1,
    modulos: (slug === SLUG_04 || slug === SLUG_05 || slug === SLUG_06 || slug === SLUG_07 || slug === SLUG_08 || slug === SLUG_09)
      ? { titulo: (slug === SLUG_08 || slug === SLUG_09) ? 'Reconhecer o risco antes da deterioração' : 'Esse resultado é verdadeiro? Por que o potássio subiu?', ordem: (slug === SLUG_08 || slug === SLUG_09) ? 3 : 2, curso_id: curso, cursos: { id: curso, titulo: 'Tratamento da Hipercalemia em Adultos' } }
      : { titulo: 'Módulo 1', ordem: 1, curso_id: curso, cursos: { id: curso, titulo: 'Tratamento da Hipercalemia em Adultos' } }
  });

  const deps = {
    envFaltando: () => [],
    sessaoPerfil: async () => ({ id: ids.aluno, liberado: true, papel: 'aluno' }),
    podeAcessarCurso: async () => true,
    json: (res, status, body) => { res.status = status; res.body = body; },
    postgrest: async (url, opt = {}) => {
      logs.push({ url, opt });
      if (url.startsWith('/aulas?')) {
        return { ok: true, dados: [{ id: AULA, titulo: aulaEmbed().titulo, atividade: aulaAtividade, modulo_id: modulo, modulos: { curso_id: curso, titulo: 'Módulo 1' } }] };
      }
      if (url.startsWith('/agoraquest_atividades?')) {
        return { ok: true, dados: semAtividade ? [] : [{ slug, versao_conteudo: 1, titulo: slug === SLUG_09 ? 'Hipercalemia — Aula 09' : slug === SLUG_08 ? 'Hipercalemia — Aula 08' : slug === SLUG_07 ? 'Hipercalemia — Aula 07' : slug === SLUG_06 ? 'Hipercalemia — Aula 06' : slug === SLUG_05 ? 'Hipercalemia — Aula 05' : slug === SLUG_04 ? 'Hipercalemia — Aula 04' : slug === SLUG_03 ? 'Hipercalemia — Aula 03' : slug === SLUG_02 ? 'Hipercalemia — Aula 02' : 'Hipercalemia — Aula 01' }] };
      }
      if (url.startsWith('/cursos?')) return { ok: true, dados: [{ titulo: 'Tratamento da Hipercalemia em Adultos' }] };
      if (url.startsWith('/modulos?')) {
        return { ok: true, dados: [{ id: modulo, ordem: 1, aulas: [{ id: AULA, ordem: 1 }, { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', ordem: 2 }] }] };
      }
      if (url.startsWith('/agoraquest_tentativas?')) {
        if (url.includes('limit=26')) {
          const offset = Number((url.match(/offset=(\d+)/) || [])[1] || 0);
          return { ok: true, dados: tentativas.slice().reverse().slice(offset) };
        }
        if (url.includes('limit=100')) return { ok: true, dados: tentativas.slice().reverse() };
        return { ok: true, dados: tentativas.length ? [tentativas[tentativas.length - 1]] : [] };
      }
      if (url.startsWith('/rpc/agoraquest_gravar')) {
        const b = opt.corpo;
        if (b.p_nova) {
          const ultima = tentativas[tentativas.length - 1] || null;
          if ((b.p_anterior || null) !== (ultima ? ultima.id : null)) return { ok: false, dados: { code: '40001' } };
          const row = { id: b.p_id, revisao: 1, estado: b.p_estado, ultima_operacao: b.p_operacao, criado_em: new Date().toISOString() };
          tentativas.push(row);
          return { ok: true, dados: row };
        }
        const row = tentativas.find((t) => t.id === b.p_id);
        if (!row || row.revisao !== b.p_revisao) return { ok: false, dados: { code: '40001' } };
        row.estado = b.p_estado;
        row.revisao += 1;
        row.ultima_operacao = b.p_operacao;
        return { ok: true, dados: row };
      }
      if (url.startsWith('/rpc/agoraquest_caderno_sincronizar')) {
        sincronizacoes.push(opt.corpo);
        caderno.length = 0;
        for (const e of opt.corpo.p_erros) {
          caderno.push({
            id: 'cad-' + e.numero, questao_id: opt.corpo.p_slug + '#' + e.numero, slug: opt.corpo.p_slug,
            numero: e.numero, aula_id: opt.corpo.p_aula, estado: 'precisa_revisar', erros: 1, revisoes: 0,
            acertos_seguidos: 0, ultima_escolha: e.escolha, ultimo_erro_em: e.em,
            atualizado_em: new Date().toISOString(), aulas: aulaEmbed()
          });
        }
        return { ok: true, dados: opt.corpo.p_erros.length };
      }
      if (url.startsWith('/agoraquest_caderno?')) {
        const u = new URL(url, 'http://teste');
        const qid = (u.searchParams.get('questao_id') || '').replace(/^eq\./, '');
        const aula = (u.searchParams.get('aula_id') || '').replace(/^eq\./, '');
        const rows = caderno.filter((r) => (!qid || r.questao_id === qid) && (!aula || r.aula_id === aula));
        return { ok: true, dados: rows };
      }
      throw Error('URL não prevista no teste: ' + url);
    },
    ...overrides
  };

  const moduloCarregado = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../lib/rotas/agoraquest.js'), 'utf8'), {
    module: moduloCarregado,
    require: (nome) => {
      if (nome === 'crypto') return require('node:crypto');
      if (nome === '../api') return deps;
      if (nome === '../curso-edicao') return require('../lib/curso-edicao');
      if (nome === '../agoraquest') return Q;
      return require(nome);
    },
    URL,
    console,
    process,
    setTimeout,
    clearTimeout
  });
  const rota = moduloCarregado.exports;

  return {
    logs,
    sincronizacoes,
    get tentativas() { return tentativas; },
    get caderno() { return caderno; },
    async call(body, query = { aula_id: AULA }, method = body ? 'POST' : 'GET') {
      const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; } };
      await rota({ method, body, query }, res);
      return res;
    }
  };
}

function montarRotaCaderno({ acesso = true, perfil = { id: ids.aluno, liberado: true, papel: 'aluno' }, semAtividade = false } = {}) {
  const logs = [];
  const curso = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const row = {
    id: 'cad-1', questao_id: SLUG_02 + '#1', slug: SLUG_02, numero: 1, aula_id: AULA,
    estado: 'precisa_revisar', erros: 1, revisoes: 0, acertos_seguidos: 0,
    ultima_escolha: 'A', ultimo_erro_em: '2026-11-12T12:00:00.000Z',
    criado_em: '2026-11-12T12:00:00.000Z', atualizado_em: '2026-11-12T12:00:00.000Z',
    aulas: { titulo: 'A fisiologia do potássio que muda a conduta', ordem: 2, modulos: { titulo: 'Módulo 1', ordem: 1, curso_id: curso, cursos: { id: curso, titulo: 'Tratamento da Hipercalemia em Adultos' } } }
  };
  const deps = {
    envFaltando: () => [],
    sessaoPerfil: async () => perfil,
    podeAcessarCurso: async () => acesso,
    cursoDaAula: async () => curso,
    json: (res, status, body) => { res.status = status; res.body = body; },
    postgrest: async (url, opt = {}) => {
      logs.push({ url, opt });
      if (url.startsWith('/agoraquest_caderno?')) {
        const u = new URL(url, 'http://teste');
        const qid = (u.searchParams.get('questao_id') || '').replace(/^eq\./, '');
        return { ok: true, dados: !qid || qid === row.questao_id ? [row] : [] };
      }
      if (url.startsWith('/agoraquest_atividades?')) {
        return { ok: true, dados: semAtividade ? [] : [{ aula_id: AULA, versao_conteudo: 1 }] };
      }
      if (url.startsWith('/rpc/agoraquest_caderno_revisar')) {
        const b = opt.corpo;
        const correta = b.p_correta===true;
        row.revisoes += 1;
        row.acertos_seguidos = correta ? row.acertos_seguidos + 1 : 0;
        row.estado = correta && row.acertos_seguidos >= b.p_dominio ? 'dominada' : 'em_revisao';
        if (!correta) { row.erros += 1; row.ultimo_erro_em = new Date().toISOString(); }
        row.ultima_escolha = b.p_escolha;
        row.atualizado_em = new Date().toISOString();
        return { ok: true, dados: row };
      }
      throw Error('URL não prevista no teste do caderno: ' + url);
    }
  };
  const moduloCarregado = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../lib/rotas/agoraquest-caderno.js'), 'utf8'), {
    module: moduloCarregado,
    require: (nome) => {
      if (nome === '../api') return deps;
      if (nome === '../curso-edicao') return require('../lib/curso-edicao');
      if (nome === '../agoraquest') return Q;
      return require(nome);
    },
    URL,
    console,
    process
  });
  const rota = moduloCarregado.exports;
  return {
    logs,
    row,
    async call(body, query = {}, method = body ? 'POST' : 'GET') {
      const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; } };
      await rota({ method, body, query }, res);
      return res;
    }
  };
}

/* 17, 20 — autorização e isolamento antes de ler qualquer tentativa. */
test('API da prática: sessão, acesso, identificadores e isolamento por aluno', async () => {
  let h = montarRota({ sessaoPerfil: async () => null });
  assert.equal((await h.call()).status, 401);
  assert.equal(h.logs.length, 0);

  h = montarRota({ podeAcessarCurso: async () => false });
  assert.equal((await h.call()).status, 403);
  assert.ok(!h.logs.some((x) => x.url.startsWith('/agoraquest_tentativas')));

  assert.equal((await montarRota().call(null, { aula_id: 'x&select=*' })).status, 400);
  assert.equal((await montarRota({ semAtividade: true }).call()).status, 404);
  assert.equal((await montarRota({ aulaAtividade: 'pre-requisitos-v1' }).call()).status, 200);

  const ok = await montarRota().call();
  assert.equal(ok.status, 200);
  assert.ok(ok.logs === undefined);
  const h2 = montarRota();
  await h2.call();
  assert.ok(h2.logs.some((x) => x.url.includes('usuario_id=eq.' + ids.aluno)));
});

/* 6, 9, 11, 12, 14 — fluxo completo e alimentação idempotente do caderno. */
test('API da prática: Aulas 01 a 06 publicam o conteúdo certo sem vazar o gabarito', async () => {
  for (const [slug, conteudo, chave] of [[SLUG_01, AULA_01, ['B', 'C', 'B', 'D', 'C']], [SLUG_02, AULA_02, ['B', 'C', 'B', 'D', 'C']], [SLUG_03, AULA_03, ['B', 'D', 'C', 'A', 'C']], [SLUG_04, AULA_04, ['B', 'D', 'A', 'C', 'D']], [SLUG_05, AULA_05, ['B', 'C', 'D', 'A', 'D']], [SLUG_06, AULA_06, ['B', 'C', 'D', 'B', 'D']], [SLUG_07, AULA_07, ['A', 'C', 'C', 'D', 'B']], [SLUG_08, AULA_08, ['C', 'D', 'B', 'D', 'C']], [SLUG_09, AULA_09, ['B', 'D', 'A', 'C', 'B']]]) {
    const h = montarRota({ slug });
    const r = await h.call();
    assert.equal(r.status, 200);
    assert.equal(r.headers['Cache-Control'], 'private, no-store');
    assert.equal(r.body.state, null);
    assert.equal(r.body.content.questions.length, 5);
    assert.ok(r.body.content.questions.every((q) => !q.feedback && !q.correctChoice && !q.correctExplanation && !q.pearl));
    /* Aula 06: tabelas, competências e stemAfter são enunciado, não gabarito. */
    if (slug === SLUG_06) {
      assert.equal(r.body.content.questions[0].competency, AULA_06.questions[0].competency);
      assert.deepEqual(r.body.content.questions[0].table, AULA_06.questions[0].table);
      assert.equal(r.body.content.questions[0].stemAfter, AULA_06.questions[0].stemAfter);
      assert.deepEqual(r.body.content.questions.filter((q) => q.table).map((q) => q.number), [1, 2, 3, 5]);
    }
    const meta = await h.call(null, { aula_id: AULA, meta: '1' });
    assert.equal(meta.status, 200);
    assert.equal(meta.body.slug, slug);
    assert.equal(meta.body.content, undefined);

    const inicio = await h.call({ aula_id: AULA, action: 'start', operation: randomUUID(), previous: null });
    assert.equal(inicio.status, 200);
    const id = inicio.body.state.id;
    let revisao = inicio.body.revision;
    const errada = chave[0] === 'A' ? 'B' : 'A';
    const resposta = await h.call({ aula_id: AULA, action: 'answer', choice: errada, operation: randomUUID(), attempt: id, revision: revisao });
    assert.equal(resposta.status, 200);
    assert.equal(resposta.body.state.score, 0);
    assert.equal(resposta.body.content.questions[0].correctChoice, chave[0]);
    assert.ok(resposta.body.content.questions[0].feedback.A);
    assert.ok(!resposta.body.content.questions[1].feedback);
    assert.ok(h.sincronizacoes.length >= 1);
    assert.deepEqual(h.sincronizacoes[h.sincronizacoes.length - 1].p_erros.map((e) => e.numero), [1]);

    const caderno = await h.call(null, { aula_id: AULA, caderno: '1' });
    assert.equal(caderno.status, 200);
    assert.equal(caderno.body.caderno.length, 1);
    assert.equal(caderno.body.caderno[0].estado, 'precisa_revisar');
    assert.equal(caderno.body.caderno[0].correctChoice, undefined);
    assert.equal(caderno.body.caderno[0].pearl, undefined);
    assert.equal(caderno.body.indicadores.total, 1);
    assert.equal(conteudo.questions.length, 5);
  }
});

/* 5, 14 — acerto não entra no caderno; erro entra uma única vez. */
test('API da prática: questão correta não entra no caderno e erro repetido não duplica', async () => {
  const h = montarRota();
  let r = await h.call({ aula_id: AULA, action: 'start', operation: randomUUID(), previous: null });
  const id = r.body.state.id;
  r = await h.call({ aula_id: AULA, action: 'answer', choice: Q.E.KEY[0], operation: randomUUID(), attempt: id, revision: r.body.revision });
  assert.equal(r.status, 200);
  assert.equal(r.body.state.score, 1);
  /* Sem erro, o servidor não precisa chamar a RPC do caderno. */
  assert.ok(h.sincronizacoes.every((c) => c.p_erros.length === 0));
  const semErros = await h.call(null, { aula_id: AULA, caderno: '1' });
  assert.equal(semErros.body.caderno.length, 0);

  r = await h.call({ aula_id: AULA, action: 'next', operation: randomUUID(), attempt: id, revision: r.body.revision });
  r = await h.call({ aula_id: AULA, action: 'answer', choice: 'A', operation: randomUUID(), attempt: id, revision: r.body.revision });
  const comErro = await h.call(null, { aula_id: AULA, caderno: '1' });
  assert.equal(comErro.body.caderno.length, 1);
  assert.equal(comErro.body.caderno[0].numero, 2);
});

test('API da prática: operação idempotente e conflito de revisão continuam bloqueados', async () => {
  const h = montarRota();
  const operacao = randomUUID();
  let r = await h.call({ aula_id: AULA, action: 'start', operation: operacao, previous: null });
  const id = r.body.state.id;
  const revisao = r.body.revision;
  assert.equal((await h.call({ aula_id: AULA, action: 'start', operation: operacao, previous: null })).status, 200);
  r = await h.call({ aula_id: AULA, action: 'answer', choice: 'A', operation: randomUUID(), attempt: id, revision: revisao });
  assert.equal(r.status, 200);
  const conflito = await h.call({ aula_id: AULA, action: 'answer', choice: 'B', operation: randomUUID(), attempt: id, revision: 1 });
  assert.equal(conflito.status, 409);
  assert.equal(conflito.body.conflito, true);
  const semOperacao = await h.call({ aula_id: AULA, action: 'next', attempt: id, revision: r.body.revision });
  assert.equal(semOperacao.status, 400);
});

/* 13, 15, 16 — revisão no servidor, gabarito depois da confirmação e domínio configurável. */
test('API do caderno: lista, revisão sem gabarito antecipado e domínio em duas revisões', async () => {
  const h = montarRotaCaderno();
  const lista = await h.call();
  assert.equal(lista.status, 200);
  assert.equal(lista.body.itens.length, 1);
  assert.equal(lista.body.indicadores.total, 1);
  assert.equal(lista.body.dominioAcertos, 2);
  assert.ok(h.logs.some((x) => x.url.includes('usuario_id=eq.' + ids.aluno)));

  const aberta = await h.call(null, { revisao: SLUG_02 + '#1' });
  assert.equal(aberta.status, 200);
  assert.equal(aberta.body.revisao.stem, AULA_02.questions[0].stem);
  assert.deepEqual(aberta.body.revisao.choices, AULA_02.questions[0].choices);
  assert.equal(aberta.body.revisao.correctChoice, undefined);
  assert.equal(aberta.body.revisao.feedback, undefined);
  assert.equal(aberta.body.revisao.correctExplanation, undefined);

  let r = await h.call({ action: 'revisar', questao_id: SLUG_02 + '#1', choice: 'A', operation: randomUUID() });
  assert.equal(r.status, 200);
  assert.equal(r.body.resultado.correctChoice, 'B');
  assert.equal(r.body.resultado.correta, false);
  assert.equal(r.body.resultado.estado, 'em_revisao');
  assert.deepEqual(Object.keys(r.body.resultado.feedback), ['A', 'B', 'C', 'D']);
  assert.equal(r.body.resultado.pearl, AULA_02.questions[0].pearl);
  assert.equal(r.body.item.estado, 'em_revisao');
  assert.ok(h.logs.some((x) => x.opt && x.opt.corpo && x.opt.corpo.p_usuario === ids.aluno));

  r = await h.call({ action: 'revisar', questao_id: SLUG_02 + '#1', choice: 'B', operation: randomUUID() });
  assert.equal(r.body.resultado.correta, true);
  assert.equal(r.body.resultado.estado, 'em_revisao');
  assert.equal(r.body.resultado.acertosSeguidos, 1);

  r = await h.call({ action: 'revisar', questao_id: SLUG_02 + '#1', choice: 'B', operation: randomUUID() });
  assert.equal(r.body.resultado.estado, 'dominada');
  assert.equal(r.body.resultado.acertosSeguidos, 2);
  assert.equal(r.body.indicadores.dominadas, 1);
});

test('API do caderno: acesso negado, entrada inválida e atividade ausente', async () => {
  const negado = montarRotaCaderno({ acesso: false });
  assert.equal((await negado.call(null, { revisao: SLUG_02 + '#1' })).status, 403);
  assert.equal((await negado.call({ action: 'revisar', questao_id: SLUG_02 + '#1', choice: 'A', operation: randomUUID() })).status, 403);

  const h = montarRotaCaderno();
  assert.equal((await h.call({ action: 'revisar', questao_id: 'x', choice: 'A', operation: randomUUID() })).status, 400);
  assert.equal((await h.call({ action: 'revisar', questao_id: SLUG_02 + '#1', choice: 'E', operation: randomUUID() })).status, 400);
  assert.equal((await h.call({ action: 'revisar', questao_id: SLUG_02 + '#1', choice: 'A', operation: 'x' })).status, 400);
  assert.equal((await h.call({ action: 'outra', questao_id: SLUG_02 + '#1', choice: 'A', operation: randomUUID() })).status, 400);

  const semAtividade = montarRotaCaderno({ semAtividade: true });
  assert.equal((await semAtividade.call(null, { revisao: SLUG_02 + '#1' })).status, 403);
});

/* ----------------------------------------------------------- banco */
test('migração: RLS, privilégios mínimos, sincronização idempotente e histórico por aluno', async () => {
  const db = await criarBanco();
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.exec(migracao(MIGRACAO_AULA_02));
    await db.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values($1,$2,1,'Hipercalemia — Aula 01')", [SLUG_01, AULA]);

    const priv = (await db.query(`select
      has_table_privilege('anon','public.agoraquest_caderno','SELECT') as anon_caderno,
      has_table_privilege('authenticated','public.agoraquest_caderno','INSERT') as auth_caderno,
      has_table_privilege('authenticated','public.agoraquest_caderno_eventos','SELECT') as auth_eventos,
      has_function_privilege('authenticated','public.agoraquest_caderno_sincronizar(uuid,uuid,text,jsonb)','EXECUTE') as sync,
      has_function_privilege('authenticated','public.agoraquest_caderno_revisar(uuid,text,text,boolean,uuid,integer)','EXECUTE') as revisar`)).rows[0];
    assert.deepEqual(priv, { anon_caderno: false, auth_caderno: false, auth_eventos: false, sync: false, revisar: false });
    const rls = (await db.query("select relname,relrowsecurity from pg_class where relname in ('agoraquest_caderno','agoraquest_caderno_eventos') order by relname")).rows;
    assert.deepEqual(rls, [
      { relname: 'agoraquest_caderno', relrowsecurity: true },
      { relname: 'agoraquest_caderno_eventos', relrowsecurity: true }
    ]);

    const sync = async (uid, aula, slug, erros) =>
      (await db.query('select public.agoraquest_caderno_sincronizar($1,$2,$3,$4::jsonb) as n',
        [uid, aula, slug, JSON.stringify(erros)])).rows[0].n;
    const revisar = async (uid, qid, escolha, correta, op = randomUUID(), dominio = 2) =>
      (await db.query('select public.agoraquest_caderno_revisar($1,$2,$3,$4,$5,$6) as r',
        [uid, qid, escolha, correta, op, dominio])).rows[0].r;
    const item = async (uid, qid) =>
      (await db.query('select * from public.agoraquest_caderno where usuario_id=$1 and questao_id=$2', [uid, qid])).rows[0];

    const t1 = randomUUID();
    const erro = { tentativa: t1, numero: 1, escolha: 'A', em: '2026-11-12T10:00:00.000Z' };
    assert.equal(await sync(ids.aluno, AULA, SLUG_01, [erro]), 1);
    assert.equal(await sync(ids.aluno, AULA, SLUG_01, [erro]), 0);
    let row = await item(ids.aluno, SLUG_01 + '#1');
    assert.equal(row.estado, 'precisa_revisar');
    assert.equal(row.erros, 1);
    assert.equal(row.revisoes, 0);
    assert.equal((await db.query('select * from public.agoraquest_caderno_eventos where usuario_id=$1', [ids.aluno])).rows.length, 1);

    const op = randomUUID();
    let r = await revisar(ids.aluno, SLUG_01 + '#1', 'B', true, op);
    assert.equal(r.estado, 'em_revisao');
    assert.equal(r.acertos_seguidos, 1);
    assert.equal(r.revisoes, 1);
    r = await revisar(ids.aluno, SLUG_01 + '#1', 'B', true, op);
    assert.equal(r.revisoes, 1);
    assert.equal((await db.query('select * from public.agoraquest_caderno_eventos where usuario_id=$1 and tipo=$2', [ids.aluno, 'revisao'])).rows.length, 1);

    r = await revisar(ids.aluno, SLUG_01 + '#1', 'B', true);
    assert.equal(r.estado, 'dominada');
    assert.equal(r.acertos_seguidos, 2);
    r = await revisar(ids.aluno, SLUG_01 + '#1', 'A', false);
    assert.equal(r.estado, 'em_revisao');
    assert.equal(r.acertos_seguidos, 0);
    assert.equal(r.erros, 2);

    await revisar(ids.aluno, SLUG_01 + '#1', 'B', true);
    r = await revisar(ids.aluno, SLUG_01 + '#1', 'B', true);
    assert.equal(r.estado, 'dominada');
    await sync(ids.aluno, AULA, SLUG_01, [{ tentativa: randomUUID(), numero: 1, escolha: 'D', em: '2026-11-12T11:00:00.000Z' }]);
    row = await item(ids.aluno, SLUG_01 + '#1');
    assert.equal(row.estado, 'em_revisao');
    assert.equal(row.erros, 3);
    assert.equal(row.acertos_seguidos, 0);

    await sync(ids.admin, AULA, SLUG_01, [{ tentativa: randomUUID(), numero: 2, escolha: 'A', em: '2026-11-12T12:00:00.000Z' }]);
    assert.deepEqual((await db.query('select usuario_id,questao_id from public.agoraquest_caderno order by usuario_id')).rows, [
      { usuario_id: ids.admin, questao_id: SLUG_01 + '#2' },
      { usuario_id: ids.aluno, questao_id: SLUG_01 + '#1' }
    ]);
    await assert.rejects(revisar(ids.admin, SLUG_01 + '#1', 'B', true), /não está no seu caderno/);
    await assert.rejects(sync(ids.aluno, AULA, SLUG_01, 'x'), /Sincronização inválida/);
    await assert.rejects(sync(ids.aluno, AULA, 'slug-inexistente', []), /Atividade indisponível/);
  } finally {
    await db.close();
  }
});

test('migração: domínio configurável e nova prática reabre questão dominada', async () => {
  const db = await criarBanco();
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.exec(migracao(MIGRACAO_AULA_02));
    await db.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values($1,$2,1,'Hipercalemia — Aula 01')", [SLUG_01, AULA]);
    await db.query('update public.cursos set tipo_acesso=$1 where id=$2', ['pago', ids.curso]);
    const sync = async (erros) => (await db.query('select public.agoraquest_caderno_sincronizar($1,$2,$3,$4::jsonb) as n', [ids.aluno, AULA, SLUG_01, JSON.stringify(erros)])).rows[0].n;
    const revisar = async (correta, dominio) => (await db.query('select public.agoraquest_caderno_revisar($1,$2,$3,$4,$5,$6) as r', [ids.aluno, SLUG_01 + '#1', 'B', correta, randomUUID(), dominio])).rows[0].r;

    await sync([{ tentativa: randomUUID(), numero: 1, escolha: 'A', em: new Date().toISOString() }]);
    assert.equal((await revisar(true, 3)).estado, 'em_revisao');
    assert.equal((await revisar(true, 3)).estado, 'em_revisao');
    assert.equal((await revisar(true, 3)).estado, 'dominada');
    await sync([{ tentativa: randomUUID(), numero: 1, escolha: 'C', em: new Date().toISOString() }]);
    const row = (await db.query('select * from public.agoraquest_caderno where usuario_id=$1 and questao_id=$2', [ids.aluno, SLUG_01 + '#1'])).rows[0];
    assert.equal(row.estado, 'em_revisao');
    assert.equal(row.acertos_seguidos, 0);
    assert.equal(row.erros, 2);
  } finally {
    await db.close();
  }
});

test('migração: vincula Aulas 02, 03, 04, 05, 06, 07, 08 e 09 pelo título e preserva as anteriores', async () => {
  const db = await criarBanco();
  const modulo1 = '99999999-9999-4999-8999-999999999991';
  const modulo2 = '99999999-9999-4999-8999-999999999992';
  const modulo3 = '99999999-9999-4999-8999-999999999993';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000001';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000002';
  const terceira = 'aaaaaaaa-0000-4000-8000-000000000005';
  const quarta = 'aaaaaaaa-0000-4000-8000-000000000009';
  const quinta = 'aaaaaaaa-0000-4000-8000-00000000000a';
  const sexta = 'aaaaaaaa-0000-4000-8000-00000000000b';
  const setima = 'aaaaaaaa-0000-4000-8000-00000000000c';
  const oitava = 'aaaaaaaa-0000-4000-8000-00000000000d';
  const nona = 'aaaaaaaa-0000-4000-8000-00000000000e';
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.query("insert into public.cursos(id,titulo) values($1,'Tratamento da Hipercalemia em Adultos')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Potássio elevado: por onde começar?',1),($3,$2,'Esse resultado é verdadeiro? Por que o potássio subiu?',2),($4,$2,'Reconhecer o risco antes da deterioração',3)", [modulo1, CURSO_HIPER, modulo2, modulo3]);
    await db.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula 01',1),($3,$2,'A fisiologia do potássio que muda a conduta',2),($4,$2,'Potássio sérico não é estoque corporal',3),($5,$6,'Pseudohipercalemia — quando desconfiar e como confirmar',1),($7,$6,'Redistribuição e liberação celular de potássio',2),($8,$6,'Quando o rim não consegue eliminar potássio',3),($9,$6,'Medicamentos e fontes de potássio que passam despercebidos',4),($11,$10,'Manifestações clínicas e sinais de alarme',1),($12,$10,'ECG na hipercalemia: o que procurar e quais são suas limitações',2)", [primeira, modulo1, segunda, terceira, quarta, modulo2, quinta, sexta, setima, modulo3, oitava, nona]);
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.exec(migracao(MIGRACAO_AULA_02));
    await db.exec(migracao(MIGRACAO_AULA_03));
    await db.exec(migracao(MIGRACAO_AULA_04));
    await db.exec(migracao(MIGRACAO_AULA_05));
    await db.exec(migracao(MIGRACAO_AULA_06));
    await db.exec(migracao(MIGRACAO_AULA_07));
    await db.exec(migracao(MIGRACAO_AULA_08));
    await db.exec(migracao(MIGRACAO_AULA_09));
    assert.deepEqual((await db.query('select slug,aula_id,versao_conteudo,titulo from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_01, aula_id: primeira, versao_conteudo: 1, titulo: 'Hipercalemia — Aula 01' },
      { slug: SLUG_02, aula_id: segunda, versao_conteudo: 1, titulo: 'Hipercalemia — Aula 02' },
      { slug: SLUG_03, aula_id: terceira, versao_conteudo: 1, titulo: 'Hipercalemia — Aula 03' },
      { slug: SLUG_04, aula_id: quarta, versao_conteudo: 1, titulo: 'Hipercalemia — Aula 04' },
      { slug: SLUG_05, aula_id: quinta, versao_conteudo: 1, titulo: 'Hipercalemia — Aula 05' },
      { slug: SLUG_06, aula_id: sexta, versao_conteudo: 1, titulo: 'Hipercalemia — Aula 06' },
      { slug: SLUG_07, aula_id: setima, versao_conteudo: 1, titulo: 'Hipercalemia — Aula 07' },
      { slug: SLUG_08, aula_id: oitava, versao_conteudo: 1, titulo: 'Hipercalemia — Aula 08' },
      { slug: SLUG_09, aula_id: nona, versao_conteudo: 1, titulo: 'Hipercalemia — Aula 09' }
    ]);
  } finally {
    await db.close();
  }
});

test('migração: fallback para a segunda aula e não invade aula com outra atividade', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000003';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000004';
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2)", [primeira, modulo, segunda]);
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values('outra-atividade',$1,1,'Outra')", [segunda]);
    await db.exec(migracao(MIGRACAO_AULA_02));
    const linhas = (await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows;
    assert.deepEqual(linhas, [
      { slug: SLUG_01, aula_id: primeira },
      { slug: 'outra-atividade', aula_id: segunda }
    ]);
  } finally {
    await db.close();
  }
});

test('migração: Aula 03 usa a terceira aula como fallback e não invade aula com outra atividade', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000006';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000007';
  const terceira = 'aaaaaaaa-0000-4000-8000-000000000008';
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Aula C',3)", [primeira, modulo, segunda, terceira]);
    await db.exec(migracao(MIGRACAO_AULA_03));
    assert.deepEqual((await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_03, aula_id: terceira }
    ]);
  } finally {
    await db.close();
  }

  const db2 = await criarBanco();
  try {
    await db2.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db2.exec('alter table public.aulas add column if not exists atividade text;');
    await db2.exec(migracao(MIGRACAO_AULA_01));
    await db2.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db2.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db2.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Aula C',3)", [primeira, modulo, segunda, terceira]);
    await db2.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values('outra-atividade',$1,1,'Outra')", [terceira]);
    await db2.exec(migracao(MIGRACAO_AULA_03));
    assert.deepEqual((await db2.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: 'outra-atividade', aula_id: terceira }
    ]);
  } finally {
    await db2.close();
  }
});

test('migração: Aula 03 não é vinculada quando o curso não existe', async () => {
  const db = await criarBanco();
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.exec(migracao(MIGRACAO_AULA_03));
    assert.equal((await db.query('select count(*)::int as n from public.agoraquest_atividades')).rows[0].n, 0);
  } finally {
    await db.close();
  }
});
test('migração: Aula 04 usa a quarta aula como fallback e não invade aula com outra atividade', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000011';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000012';
  const terceira = 'aaaaaaaa-0000-4000-8000-000000000013';
  const quarta = 'aaaaaaaa-0000-4000-8000-000000000014';
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Aula C',3),($5,$2,'Aula D',4)", [primeira, modulo, segunda, terceira, quarta]);
    await db.exec(migracao(MIGRACAO_AULA_04));
    assert.deepEqual((await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_04, aula_id: quarta }
    ]);
  } finally {
    await db.close();
  }

  const db2 = await criarBanco();
  try {
    await db2.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db2.exec('alter table public.aulas add column if not exists atividade text;');
    await db2.exec(migracao(MIGRACAO_AULA_01));
    await db2.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db2.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db2.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Aula C',3),($5,$2,'Aula D',4)", [primeira, modulo, segunda, terceira, quarta]);
    await db2.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values('outra-atividade',$1,1,'Outra')", [quarta]);
    await db2.exec(migracao(MIGRACAO_AULA_04));
    assert.deepEqual((await db2.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: 'outra-atividade', aula_id: quarta }
    ]);
  } finally {
    await db2.close();
  }
});

test('migração: Aula 05 usa a quinta aula como fallback e não invade aula com outra atividade', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000021';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000022';
  const terceira = 'aaaaaaaa-0000-4000-8000-000000000023';
  const quarta = 'aaaaaaaa-0000-4000-8000-000000000024';
  const quinta = 'aaaaaaaa-0000-4000-8000-000000000025';
  const aulasSql = "insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Aula C',3),($5,$2,'Aula D',4),($6,$2,'Aula E',5)";
  const params = [primeira, modulo, segunda, terceira, quarta, quinta];
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query(aulasSql, params);
    await db.exec(migracao(MIGRACAO_AULA_05));
    assert.deepEqual((await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_05, aula_id: quinta }
    ]);
  } finally {
    await db.close();
  }

  const db2 = await criarBanco();
  try {
    await db2.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db2.exec('alter table public.aulas add column if not exists atividade text;');
    await db2.exec(migracao(MIGRACAO_AULA_01));
    await db2.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db2.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db2.query(aulasSql, params);
    await db2.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values('outra-atividade',$1,1,'Outra')", [quinta]);
    await db2.exec(migracao(MIGRACAO_AULA_05));
    assert.deepEqual((await db2.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: 'outra-atividade', aula_id: quinta }
    ]);
  } finally {
    await db2.close();
  }
});

test('migração: Aula 05 prefere o título de redistribuição e não é vinculada sem o curso', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000031';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000032';
  const redistribuicao = 'aaaaaaaa-0000-4000-8000-000000000033';
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Redistribuição e liberação celular de potássio',3)", [primeira, modulo, segunda, redistribuicao]);
    await db.exec(migracao(MIGRACAO_AULA_05));
    assert.deepEqual((await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_05, aula_id: redistribuicao }
    ]);
  } finally {
    await db.close();
  }

  const db2 = await criarBanco();
  try {
    await db2.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db2.exec('alter table public.aulas add column if not exists atividade text;');
    await db2.exec(migracao(MIGRACAO_AULA_01));
    await db2.exec(migracao(MIGRACAO_AULA_05));
    assert.equal((await db2.query('select count(*)::int as n from public.agoraquest_atividades')).rows[0].n, 0);
  } finally {
    await db2.close();
  }
});

test('migração: Aula 06 usa a sexta aula como fallback e não invade aula com outra atividade', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const ids6 = ['aaaaaaaa-0000-4000-8000-000000000041','aaaaaaaa-0000-4000-8000-000000000042','aaaaaaaa-0000-4000-8000-000000000043','aaaaaaaa-0000-4000-8000-000000000044','aaaaaaaa-0000-4000-8000-000000000045','aaaaaaaa-0000-4000-8000-000000000046'];
  const aulasSql = "insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Aula C',3),($5,$2,'Aula D',4),($6,$2,'Aula E',5),($7,$2,'Aula F',6)";
  const params = [ids6[0], modulo, ids6[1], ids6[2], ids6[3], ids6[4], ids6[5]];
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query(aulasSql, params);
    await db.exec(migracao(MIGRACAO_AULA_06));
    assert.deepEqual((await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_06, aula_id: ids6[5] }
    ]);
  } finally {
    await db.close();
  }

  const db2 = await criarBanco();
  try {
    await db2.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db2.exec('alter table public.aulas add column if not exists atividade text;');
    await db2.exec(migracao(MIGRACAO_AULA_01));
    await db2.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db2.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db2.query(aulasSql, params);
    await db2.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values('outra-atividade',$1,1,'Outra')", [ids6[5]]);
    await db2.exec(migracao(MIGRACAO_AULA_06));
    assert.deepEqual((await db2.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: 'outra-atividade', aula_id: ids6[5] }
    ]);
  } finally {
    await db2.close();
  }
});

test('migração: Aula 06 prefere o título sobre o rim e não é vinculada sem o curso', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000051';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000052';
  const rim = 'aaaaaaaa-0000-4000-8000-000000000053';
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Quando o rim não consegue eliminar potássio',3)", [primeira, modulo, segunda, rim]);
    await db.exec(migracao(MIGRACAO_AULA_06));
    assert.deepEqual((await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_06, aula_id: rim }
    ]);
  } finally {
    await db.close();
  }

  const db2 = await criarBanco();
  try {
    await db2.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db2.exec('alter table public.aulas add column if not exists atividade text;');
    await db2.exec(migracao(MIGRACAO_AULA_01));
    await db2.exec(migracao(MIGRACAO_AULA_06));
    assert.equal((await db2.query('select count(*)::int as n from public.agoraquest_atividades')).rows[0].n, 0);
  } finally {
    await db2.close();
  }
});

test('migração: Aula 07 usa a sétima aula como fallback e não invade aula com outra atividade', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const ids7 = ['aaaaaaaa-0000-4000-8000-000000000061','aaaaaaaa-0000-4000-8000-000000000062','aaaaaaaa-0000-4000-8000-000000000063','aaaaaaaa-0000-4000-8000-000000000064','aaaaaaaa-0000-4000-8000-000000000065','aaaaaaaa-0000-4000-8000-000000000066','aaaaaaaa-0000-4000-8000-000000000067'];
  const aulasSql = "insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Aula C',3),($5,$2,'Aula D',4),($6,$2,'Aula E',5),($7,$2,'Aula F',6),($8,$2,'Aula G',7)";
  const params = [ids7[0], modulo, ids7[1], ids7[2], ids7[3], ids7[4], ids7[5], ids7[6]];
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query(aulasSql, params);
    await db.exec(migracao(MIGRACAO_AULA_07));
    assert.deepEqual((await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_07, aula_id: ids7[6] }
    ]);
  } finally {
    await db.close();
  }

  const db2 = await criarBanco();
  try {
    await db2.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db2.exec('alter table public.aulas add column if not exists atividade text;');
    await db2.exec(migracao(MIGRACAO_AULA_01));
    await db2.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db2.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db2.query(aulasSql, params);
    await db2.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values('outra-atividade',$1,1,'Outra')", [ids7[6]]);
    await db2.exec(migracao(MIGRACAO_AULA_07));
    assert.deepEqual((await db2.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: 'outra-atividade', aula_id: ids7[6] }
    ]);
  } finally {
    await db2.close();
  }
});

test('migração: Aula 07 prefere o título e não é vinculada sem o curso', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000071';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000072';
  const medicamentos = 'aaaaaaaa-0000-4000-8000-000000000073';
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Medicamentos e fontes de potássio que passam despercebidos',3)", [primeira, modulo, segunda, medicamentos]);
    await db.exec(migracao(MIGRACAO_AULA_07));
    assert.deepEqual((await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_07, aula_id: medicamentos }
    ]);
  } finally {
    await db.close();
  }

  const db2 = await criarBanco();
  try {
    await db2.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db2.exec('alter table public.aulas add column if not exists atividade text;');
    await db2.exec(migracao(MIGRACAO_AULA_01));
    await db2.exec(migracao(MIGRACAO_AULA_07));
    assert.equal((await db2.query('select count(*)::int as n from public.agoraquest_atividades')).rows[0].n, 0);
  } finally {
    await db2.close();
  }
});

test('migração: Aula 08 usa a oitava aula como fallback e não invade aula com outra atividade', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const ids8 = ['aaaaaaaa-0000-4000-8000-000000000081','aaaaaaaa-0000-4000-8000-000000000082','aaaaaaaa-0000-4000-8000-000000000083','aaaaaaaa-0000-4000-8000-000000000084','aaaaaaaa-0000-4000-8000-000000000085','aaaaaaaa-0000-4000-8000-000000000086','aaaaaaaa-0000-4000-8000-000000000087','aaaaaaaa-0000-4000-8000-000000000088'];
  const aulasSql = "insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Aula C',3),($5,$2,'Aula D',4),($6,$2,'Aula E',5),($7,$2,'Aula F',6),($8,$2,'Aula G',7),($9,$2,'Aula H',8)";
  const params = [ids8[0], modulo, ids8[1], ids8[2], ids8[3], ids8[4], ids8[5], ids8[6], ids8[7]];
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query(aulasSql, params);
    await db.exec(migracao(MIGRACAO_AULA_08));
    assert.deepEqual((await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_08, aula_id: ids8[7] }
    ]);
  } finally {
    await db.close();
  }

  const db2 = await criarBanco();
  try {
    await db2.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db2.exec('alter table public.aulas add column if not exists atividade text;');
    await db2.exec(migracao(MIGRACAO_AULA_01));
    await db2.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db2.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db2.query(aulasSql, params);
    await db2.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values('outra-atividade',$1,1,'Outra')", [ids8[7]]);
    await db2.exec(migracao(MIGRACAO_AULA_08));
    assert.deepEqual((await db2.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: 'outra-atividade', aula_id: ids8[7] }
    ]);
  } finally {
    await db2.close();
  }
});

test('migração: Aula 08 prefere o título e não é vinculada sem o curso', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000091';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000092';
  const alarme = 'aaaaaaaa-0000-4000-8000-000000000093';
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Manifestações clínicas e sinais de alarme',3)", [primeira, modulo, segunda, alarme]);
    await db.exec(migracao(MIGRACAO_AULA_08));
    assert.deepEqual((await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_08, aula_id: alarme }
    ]);
  } finally {
    await db.close();
  }

  const db2 = await criarBanco();
  try {
    await db2.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db2.exec('alter table public.aulas add column if not exists atividade text;');
    await db2.exec(migracao(MIGRACAO_AULA_01));
    await db2.exec(migracao(MIGRACAO_AULA_08));
    assert.equal((await db2.query('select count(*)::int as n from public.agoraquest_atividades')).rows[0].n, 0);
  } finally {
    await db2.close();
  }
});

test('migração: Aula 09 usa a nona aula como fallback e não invade aula com outra atividade', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const ids9 = ['aaaaaaaa-0000-4000-8000-000000000091','aaaaaaaa-0000-4000-8000-000000000092','aaaaaaaa-0000-4000-8000-000000000093','aaaaaaaa-0000-4000-8000-000000000094','aaaaaaaa-0000-4000-8000-000000000095','aaaaaaaa-0000-4000-8000-000000000096','aaaaaaaa-0000-4000-8000-000000000097','aaaaaaaa-0000-4000-8000-000000000098','aaaaaaaa-0000-4000-8000-000000000099'];
  const aulasSql = "insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'Aula C',3),($5,$2,'Aula D',4),($6,$2,'Aula E',5),($7,$2,'Aula F',6),($8,$2,'Aula G',7),($9,$2,'Aula H',8),($10,$2,'Aula I',9)";
  const params = [ids9[0], modulo, ids9[1], ids9[2], ids9[3], ids9[4], ids9[5], ids9[6], ids9[7], ids9[8]];
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query(aulasSql, params);
    await db.exec(migracao(MIGRACAO_AULA_09));
    assert.deepEqual((await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_09, aula_id: ids9[8] }
    ]);
  } finally {
    await db.close();
  }

  const db2 = await criarBanco();
  try {
    await db2.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db2.exec('alter table public.aulas add column if not exists atividade text;');
    await db2.exec(migracao(MIGRACAO_AULA_01));
    await db2.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db2.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db2.query(aulasSql, params);
    await db2.query("insert into public.agoraquest_atividades(slug,aula_id,versao_conteudo,titulo) values('outra-atividade',$1,1,'Outra')", [ids9[8]]);
    await db2.exec(migracao(MIGRACAO_AULA_09));
    assert.deepEqual((await db2.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: 'outra-atividade', aula_id: ids9[8] }
    ]);
  } finally {
    await db2.close();
  }
});

test('migração: Aula 09 prefere o título e não é vinculada sem o curso', async () => {
  const db = await criarBanco();
  const modulo = '99999999-9999-4999-8999-999999999999';
  const primeira = 'aaaaaaaa-0000-4000-8000-000000000101';
  const segunda = 'aaaaaaaa-0000-4000-8000-000000000102';
  const ecg = 'aaaaaaaa-0000-4000-8000-000000000103';
  try {
    await db.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db.exec('alter table public.aulas add column if not exists atividade text;');
    await db.exec(migracao(MIGRACAO_AULA_01));
    await db.query("insert into public.cursos(id,titulo) values($1,'Hipercalemia — curso de teste')", [CURSO_HIPER]);
    await db.query("insert into public.modulos(id,curso_id,titulo,ordem) values($1,$2,'Módulo 1',1)", [modulo, CURSO_HIPER]);
    await db.query("insert into public.aulas(id,modulo_id,titulo,ordem) values($1,$2,'Aula A',1),($3,$2,'Aula B',2),($4,$2,'ECG na hipercalemia: o que procurar e quais são suas limitações',3)", [primeira, modulo, segunda, ecg]);
    await db.exec(migracao(MIGRACAO_AULA_09));
    assert.deepEqual((await db.query('select slug,aula_id from public.agoraquest_atividades order by slug')).rows, [
      { slug: SLUG_09, aula_id: ecg }
    ]);
  } finally {
    await db.close();
  }

  const db2 = await criarBanco();
  try {
    await db2.exec('alter table public.matriculas add column if not exists expira_em timestamptz;');
    await db2.exec('alter table public.aulas add column if not exists atividade text;');
    await db2.exec(migracao(MIGRACAO_AULA_01));
    await db2.exec(migracao(MIGRACAO_AULA_09));
    assert.equal((await db2.query('select count(*)::int as n from public.agoraquest_atividades')).rows[0].n, 0);
  } finally {
    await db2.close();
  }
});

/* --------------------------------------------------------------- estático */
test('estático: páginas, link no app, service worker e ausência do gabarito no cliente', () => {
  const html = fs.readFileSync(path.join(__dirname, '../agoraquest.html'), 'utf8');
  assert.match(html, /css\/agoraquest\.css\?v=4/);
  assert.match(html, /js\/agoraquest\.js\?v=4/);
  assert.doesNotMatch(html, /B.*C.*B.*D.*C/);
  assert.doesNotMatch(html, /B.*C.*D.*A.*D/);
  assert.match(html, /img\/agoramed-logo-branco\.png/);
  assert.match(html, /class="aq-logo-escuro"/);

  const caderno = fs.readFileSync(path.join(__dirname, '../caderno-erros.html'), 'utf8');
  assert.match(caderno, /css\/agoraquest\.css\?v=4/);
  assert.match(caderno, /css\/caderno-erros\.css\?v=1/);
  assert.match(caderno, /js\/caderno-erros\.js\?v=2/);
  assert.match(caderno, /id="cd-review"/);

  const js = fs.readFileSync(path.join(__dirname, '../js/agoraquest.js'), 'utf8');
  const jsCaderno = fs.readFileSync(path.join(__dirname, '../js/caderno-erros.js'), 'utf8');
  assert.doesNotMatch(js, /\[\s*['"]B['"]\s*,\s*['"]C['"]\s*,\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]C['"]\s*\]/);
  assert.doesNotMatch(js, /\[\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]C['"]\s*,\s*['"]A['"]\s*,\s*['"]C['"]\s*\]/);
  assert.doesNotMatch(js, /\[\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]A['"]\s*,\s*['"]C['"]\s*,\s*['"]D['"]\s*\]/);
  assert.doesNotMatch(js, /\[\s*['"]B['"]\s*,\s*['"]C['"]\s*,\s*['"]D['"]\s*,\s*['"]A['"]\s*,\s*['"]D['"]\s*\]/);
  assert.doesNotMatch(js, /\[\s*['"]B['"]\s*,\s*['"]C['"]\s*,\s*['"]D['"]\s*,\s*['"]B['"]\s*,\s*['"]D['"]\s*\]/);
  assert.doesNotMatch(jsCaderno, /\[\s*['"]B['"]\s*,\s*['"]C['"]\s*,\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]C['"]\s*\]/);
  assert.doesNotMatch(jsCaderno, /\[\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]C['"]\s*,\s*['"]A['"]\s*,\s*['"]C['"]\s*\]/);
  assert.doesNotMatch(jsCaderno, /\[\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]A['"]\s*,\s*['"]C['"]\s*,\s*['"]D['"]\s*\]/);
  assert.doesNotMatch(jsCaderno, /\[\s*['"]B['"]\s*,\s*['"]C['"]\s*,\s*['"]D['"]\s*,\s*['"]B['"]\s*,\s*['"]D['"]\s*\]/);
  assert.doesNotMatch(js, /\[\s*['"]A['"]\s*,\s*['"]C['"]\s*,\s*['"]C['"]\s*,\s*['"]D['"]\s*,\s*['"]B['"]\s*\]/);
  assert.doesNotMatch(js, /\[\s*['"]C['"]\s*,\s*['"]D['"]\s*,\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]C['"]\s*\]/);
  assert.doesNotMatch(jsCaderno, /\[\s*['"]A['"]\s*,\s*['"]C['"]\s*,\s*['"]C['"]\s*,\s*['"]D['"]\s*,\s*['"]B['"]\s*\]/);
  assert.doesNotMatch(jsCaderno, /\[\s*['"]C['"]\s*,\s*['"]D['"]\s*,\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]C['"]\s*\]/);
  assert.doesNotMatch(js, /\[\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]A['"]\s*,\s*['"]C['"]\s*,\s*['"]B['"]\s*\]/);
  assert.doesNotMatch(jsCaderno, /\[\s*['"]B['"]\s*,\s*['"]D['"]\s*,\s*['"]A['"]\s*,\s*['"]C['"]\s*,\s*['"]B['"]\s*\]/);
  for (const q of aprovado01.concat(aprovado02, aprovado03, aprovado04, aprovado05, aprovado06, aprovado07, aprovado08, aprovado09)) {
    assert.ok(!js.includes(q.stem));
    assert.ok(!jsCaderno.includes(q.stem));
    assert.ok(!js.includes(q.choices.B));
    assert.ok(!jsCaderno.includes(q.choices.B));
  }

  const aula = fs.readFileSync(path.join(__dirname, '../aula.html'), 'utf8');
  assert.match(aula, /id="agoraquest-cta"/);
  assert.match(aula, /api\/agoraquest\?meta=1/);
  assert.match(aula, /Praticar no AgoraQuest/);

  const app = fs.readFileSync(path.join(__dirname, '../app.html'), 'utf8');
  assert.match(app, /caderno-erros\.html/);

  const roteador = fs.readFileSync(path.join(__dirname, '../api/roteador.js'), 'utf8');
  assert.match(roteador, /'agoraquest': require\('\.\.\/lib\/rotas\/agoraquest'\)/);
  assert.match(roteador, /'agoraquest-caderno': require\('\.\.\/lib\/rotas\/agoraquest-caderno'\)/);

  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  assert.match(sw, /agoramed-v87/);
  assert.match(sw, /agoraquest\.html/);
  assert.match(sw, /caderno-erros\.html/);
  assert.match(sw, /css\/agoraquest\.css\?v=4/);
  assert.match(sw, /js\/agoraquest\.js\?v=4/);
  assert.match(sw, /css\/caderno-erros\.css\?v=1/);
  assert.match(sw, /js\/caderno-erros\.js\?v=2/);

  /* Tema exclusivo do curso de Hipercalemia, escopado por data-aq-tema. */
  assert.match(js, /data\.aqTema = 'hipercalemia'|dataset\.aqTema = 'hipercalemia'/);
  assert.match(js, /fa3c5d8d-94c4-4321-be7a-1cc45741a983/);
  assert.match(js, /function tabela\(/);
  assert.match(js, /stemAfter/);
  assert.match(jsCaderno, /function tabela\(/);
  assert.match(jsCaderno, /stemAfter/);

  const css = fs.readFileSync(path.join(__dirname, '../css/agoraquest.css'), 'utf8');
  assert.match(css, /#346F77/i);
  assert.match(css, /#808080/i);
  assert.match(css, /#F5F5F5/i);
  assert.match(css, /\.sr-only\{/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /\.aq-table\{/);
  assert.match(css, /\.aq-table-wrap\{/);
  assert.match(css, /body\[data-aq-tema="hipercalemia"\]/);
  assert.match(css, /--aq-bg:#061F27/);
  assert.match(css, /--aq-card:#0D303B/);
  assert.match(css, /#9552D0/);
  assert.match(css, /#CFBFFF/);
  assert.match(css, /\.aq-explanation/);

  const cssCaderno = fs.readFileSync(path.join(__dirname, '../css/caderno-erros.css'), 'utf8');
  assert.match(cssCaderno, /@media\(max-width:760px\)/);
  assert.match(cssCaderno, /\.aq-state/);
});
