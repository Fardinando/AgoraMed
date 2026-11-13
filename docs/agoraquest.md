# AgoraQuest — prática por aula

O AgoraQuest é uma prática formativa extra, vinculada a uma aula específica. Estão publicadas duas atividades do curso **Tratamento da Hipercalemia em Adultos**: a **Aula 01** (`hipercalemia-aula-01-v1`) e a **Aula 02** (`hipercalemia-aula-02-v1`), ambas do Módulo 1.

Ele é independente do AgoraQuiz e do Plantão Virtual: não substitui a atividade principal da aula e **não marca a aula como concluída**. O convite aparece somente quando a atividade está publicada para aquela aula.

## Experiência

- Página standalone `agoraquest.html?aula_id=…`, em tema claro com a paleta `#346F77`, `#808080` e `#F5F5F5`.
- Cinco casos clínicos, uma questão por vez, quatro alternativas e seleção única.
- A confirmação bloqueia a alternativa e libera imediatamente:
  - o raciocínio fisiopatológico da resposta;
  - a análise individual das quatro alternativas;
  - a “pérola do plantão”;
  - a referência UpToDate.
- Progresso, histórico de tentativas e caderno de erros persistidos na conta.
- Nova tentativa preserva as anteriores.
- O resultado final mostra a nota, a revisão das respostas e o fechamento do tema.

O conteúdo aprovado fica em `lib/agoraquest/`:

- `hipercalemia-aula-01-v1.json` — Aula 01, gabarito **B-C-B-D-C**.
- `hipercalemia-aula-02-v1.json` — Aula 02, gabarito **B-C-B-D-C**.

Cada JSON traz o próprio gabarito no campo `key`; o engine usa a chave do conteúdo (`Q.keyOf`). Os enunciados, as alternativas e o gabarito **não devem ser reescritos sem uma nova revisão clínica**.

## Modelo de dados

Prática:

- `agoraquest_atividades`: vínculo entre uma aula e um conteúdo versionado (`slug`, `versao_conteudo`, `titulo`). A aula pode ter no máximo uma atividade AgoraQuest.
- `agoraquest_tentativas`: dono, aula, versão do conteúdo, revisão, estado da tentativa e datas.
- RPC `agoraquest_gravar`: grava a tentativa de forma atômica, com autorização por conta ativa e curso gratuito, matrícula válida ou admin. A matrícula expirada não concede acesso.

Caderno de Erros:

- `agoraquest_caderno`: estado consolidado por aluno e questão (chave única `usuario_id, questao_id`), com `estado`, `erros`, `revisoes`, `acertos_seguidos`, `ultima_escolha` e datas. Não duplica a mesma questão.
- `agoraquest_caderno_eventos`: histórico append-only de erros (`erro`) e revisões (`revisao`), com `operacao` para idempotência.
- RPC `agoraquest_caderno_sincronizar`: registra os erros de uma tentativa. Idempotente por `(tentativa_id, caderno_id, tipo)`; erros repetidos não duplicam. Um novo erro reabre questão `dominada` e zera `acertos_seguidos`.
- RPC `agoraquest_caderno_revisar`: aplica a máquina de estados (`precisa_revisar` → `em_revisao` → `dominada`). Idempotente por `operacao` e escopada ao dono (`usuario_id`). O número de acertos consecutivos para dominar é o parâmetro `p_dominio`.

Segurança:

- RLS habilitada em todas as tabelas. `anon` e `authenticated` não têm acesso direto; apenas `service_role`, usada no servidor.
- O gabarito não vai para o navegador antes da confirmação. A API usa o estado salvo no banco e corrige no servidor; nota, alternativa correta e estado enviados pelo cliente não são aceitos como verdade.
- Requisições repetidas com a mesma operação são idempotentes. Revisão divergente retorna conflito e a interface recarrega o estado atual.

## Caderno de Erros

A página **Meu Caderno de Erros** (`caderno-erros.html`) é acessível pelo menu do ambiente de aprendizagem (`app.html`). Ela lista, agrupadas por curso → módulo → aula, as questões que o aluno errou, com filtros por estado e indicadores (total, precisam revisar, em revisão, dominadas, percentual de domínio e revisões realizadas).

- O registro é automático: a prática envia os erros ao servidor, que confere o gabarito e consolida por aluno/questão sem duplicar.
- A revisão mostra uma questão por vez, sem o gabarito. A resposta é corrigida no servidor e o comentário só aparece depois da confirmação.
- Estado `precisa_revisar` ao errar pela primeira vez; `em_revisao` após a primeira revisão; `dominada` após o número configurado de acertos consecutivos (padrão 2). Um novo erro reabre a questão.
- A listagem e a revisão revalidam o acesso curso a curso (matrícula válida, curso gratuito ou homologação) e o vínculo da atividade antes de responder.
- `AGORAQUEST_DOMINIO_ACERTOS` (padrão `2`) define quantos acertos consecutivos dominam a questão; o mesmo valor é enviado como `p_dominio` às RPCs.

## Rotas da API

- `GET/POST /api/agoraquest` — estado e correção da prática; `?meta=1` devolve os metadados do CTA; `?caderno=1` devolve o resumo do caderno da aula.
- `GET /api/agoraquest-caderno` — lista o caderno do aluno; `?revisao=<questao_id>` abre uma questão para revisão (sem gabarito).
- `POST /api/agoraquest-caderno` — `{ action: 'revisar', questao_id, choice, operation }` corrige no servidor e devolve o resultado.

Ambas registradas em `api/roteador.js`.

## Publicação

As migrações são aditivas e idempotentes:

- `supabase/migrations/20261111233000_agoraquest_hipercalemia_aula_01.sql` — cria as tabelas e a RPC da prática e vincula a Aula 01 (primeira aula do primeiro módulo do curso de Hipercalemia). **Já aplicada em produção.**
- `supabase/migrations/20261112120000_agoraquest_aula_02_e_caderno_erros.sql` — cria as tabelas e RPCs do caderno e vincula a **Aula 02**. Localiza a Aula 02 pelo título que contém “fisiologia do potássio”; se não encontrar, usa a segunda aula na ordem. Nunca reaproveita uma aula que já tenha outra atividade AgoraQuest. **Pendente de aplicação em produção.**

Como o ambiente local não tem acesso de escrita ao Supabase, execute o conteúdo da migração manualmente no **SQL Editor** do projeto. Depois, confirme:

```sql
-- vínculos publicados
select a.slug, a.aula_id, a.versao_conteudo, a.titulo,
       l.titulo as aula, m.titulo as modulo, c.titulo as curso
from public.agoraquest_atividades a
join public.aulas l on l.id = a.aula_id
join public.modulos m on m.id = l.modulo_id
join public.cursos c on c.id = m.curso_id
order by a.slug;

-- nenhuma tentativa de teste deve existir em produção
select count(*) from public.agoraquest_tentativas;
select count(*) from public.agoraquest_caderno;

-- privilégios esperados
select has_table_privilege('anon','public.agoraquest_tentativas','SELECT') as anon_select,
       has_table_privilege('anon','public.agoraquest_caderno','SELECT') as anon_caderno,
       has_function_privilege('authenticated','public.agoraquest_gravar(uuid,uuid,uuid,integer,jsonb,boolean,uuid,uuid,integer)','EXECUTE') as aluno_rpc,
       has_function_privilege('authenticated','public.agoraquest_caderno_sincronizar(uuid,uuid,text,jsonb)','EXECUTE') as sync_rpc;
```

O retorno esperado são duas linhas em `agoraquest_atividades` (Aula 01 e Aula 02), `count = 0` e todos os privilégios `false`.

Se o curso ou as aulas forem renomeados/reordenados, a migração da Aula 02 pode ser executada novamente: o vínculo é recalculado e as tentativas e o caderno permanecem na conta.

## Como adicionar outra aula ou curso

1. Crie um JSON em `lib/agoraquest/` no mesmo formato dos existentes, com `slug`, `versao`, `key` (gabarito), questões, feedback por alternativa, explicação correta, pérola e referência real.
2. Registre o conteúdo em `lib/agoraquest/index.js` (lista `CONTEUDOS`). O gabarito vem do próprio JSON (`key`); não é mais necessário editar `KEY` no engine.
3. Insira o vínculo na tabela `agoraquest_atividades` com o `aula_id` correspondente e a mesma `versao_conteudo` do JSON (ou estenda a migração do caderno, que já faz esse vínculo para a Aula 02).
4. O CTA da aula e a página passam a funcionar automaticamente; não é necessário editar `aula.html` nem `agoraquest.html` para cada nova atividade.
5. Rode `npm test` e valide a atividade em uma conta de aluno matriculada.

## Verificação

`node --test tools/agoraquest.test.cjs` cobre 16 testes para os 20 itens essenciais: conteúdo aprovado da Aula 01 e da Aula 02, gabarito por conteúdo no engine, bloqueio de alteração, feedback imediato, conclusão e nota, identificação estável de questão, indicadores e agrupamento do caderno, revisão sem gabarito antecipado, autorização, isolamento por aluno, concorrência, idempotência, RLS/privilégios, sincronização do caderno, domínio configurável, vínculo das aulas, migração e integração do CTA/service worker. A suíte completa é executada com `npm test`.

As migrações também foram exercitadas em banco PostgreSQL descartável (PGlite) com os handlers reais e sessões simuladas, incluindo idempotência de sincronização, máquina de estados do caderno, reabertura de questão dominada e isolamento entre alunos. A interface foi exercitada com a API real simulada em memória: início, seleção única, bloqueio após confirmar, feedback, avanço pelas cinco questões, resultado, histórico, caderno de erros, revisão e nova tentativa. A página não carrega o gabarito no JavaScript nem no HTML.

## Limitações conhecidas

- A migração do caderno e da Aula 02 precisa ser executada manualmente no Supabase; não há ferramenta de escrita do banco disponível neste ambiente.
- O AgoraQuest não conclui a aula e não altera o progresso. Isso é intencional para não confundir prática extra com a videoaula.
- Se a aula vinculada já tiver outra atividade principal (`aulas.atividade`), a página da aula continua redirecionando para essa atividade. Nesse caso, o AgoraQuest permanece acessível pela URL direta com `aula_id`, mas o convite não aparece na aula.
- A listagem do caderno agrega até 500 questões por aluno. Se o volume crescer muito, será necessário paginar.
- A interface não foi exercitada com uma conta real de aluno neste ambiente; a autorização e a persistência foram testadas com banco descartável e handlers reais.
- O `JWT_SECRET` usado em produção ainda não foi rotacionado após o vazamento anterior; pendência de segurança independente do AgoraQuest.
