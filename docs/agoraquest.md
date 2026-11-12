# AgoraQuest — prática por aula

O AgoraQuest é uma prática formativa extra, vinculada a uma aula específica. A primeira atividade publicada é a da **Aula 01 do Módulo 1** do curso **Tratamento da Hipercalemia em Adultos**.

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

O conteúdo aprovado está em `lib/agoraquest/hipercalemia-aula-01-v1.json`. Os enunciados, as alternativas e o gabarito **B-C-B-D-C** não devem ser reescritos sem uma nova revisão clínica.

## Modelo de dados

- `agoraquest_atividades`: vínculo entre uma aula e um conteúdo versionado (`slug`, `versao_conteudo`, `titulo`). A aula pode ter no máximo uma atividade AgoraQuest.
- `agoraquest_tentativas`: dono, aula, versão do conteúdo, revisão, estado da tentativa e datas.
- RPC `agoraquest_gravar`: grava a tentativa de forma atômica, com autorização por conta ativa e curso gratuito, matrícula válida ou admin. A matrícula expirada não concede acesso.
- RLS habilitada nas duas tabelas. `anon` e `authenticated` não têm acesso direto; apenas `service_role`, usada no servidor.
- O gabarito não vai para o navegador antes da confirmação. A API usa o estado salvo no banco e corrige no servidor; nota, alternativa correta e estado enviados pelo cliente não são aceitos como verdade.
- Requisições repetidas com a mesma operação são idempotentes. Revisão divergente retorna conflito e a interface recarrega o estado atual.

## Publicação da Aula 01

A migração `supabase/migrations/20261111233000_agoraquest_hipercalemia_aula_01.sql` é aditiva. Ela cria as tabelas e a RPC e localiza, por ordem, a primeira aula do primeiro módulo do curso de Hipercalemia. Não depende de UUID copiado e não altera vídeos, matrículas, perfis ou progresso.

Como o ambiente local não tem acesso de escrita ao Supabase, execute o conteúdo da migração manualmente no **SQL Editor** do projeto. Depois, confirme:

```sql
-- vínculo publicado
select a.slug, a.aula_id, a.versao_conteudo, a.titulo,
       l.titulo as aula, m.titulo as modulo, c.titulo as curso
from public.agoraquest_atividades a
join public.aulas l on l.id = a.aula_id
join public.modulos m on m.id = l.modulo_id
join public.cursos c on c.id = m.curso_id;

-- nenhuma tentativa de teste deve existir em produção
select count(*) from public.agoraquest_tentativas;

-- privilégios esperados
select has_table_privilege('anon','public.agoraquest_tentativas','SELECT') as anon_select,
       has_table_privilege('authenticated','public.agoraquest_gravar(uuid,uuid,uuid,integer,jsonb,boolean,uuid,uuid,integer)','EXECUTE') as aluno_rpc;
```

O retorno esperado é uma linha em `agoraquest_atividades`, `count = 0` e `anon_select = false`, `aluno_rpc = false`.

Se o curso ou a aula forem renomeados/reordenados, a migração pode ser executada novamente: o vínculo é atualizado para a primeira aula do primeiro módulo e as tentativas antigas permanecem na conta.

## Como adicionar outra aula ou curso

1. Crie um JSON em `lib/agoraquest/` no mesmo formato de `hipercalemia-aula-01-v1.json`, com `slug`, `versao`, questões, feedback por alternativa, explicação correta, pérola e referência real.
2. Registre o conteúdo em `lib/agoraquest/index.js` (lista `CONTEUDOS`) e ajuste `KEY` em `lib/agoraquest/engine.js` se o novo conteúdo tiver outro gabarito. O ideal é migrar o gabarito para o próprio JSON quando houver mais de uma atividade.
3. Insira o vínculo na tabela `agoraquest_atividades` com o `aula_id` correspondente e a mesma `versao_conteudo` do JSON.
4. O CTA da aula e a página passam a funcionar automaticamente; não é necessário editar `aula.html` nem `agoraquest.html` para cada nova atividade.
5. Rode `npm test` e valide a atividade em uma conta de aluno matriculada.

## Verificação

`node --test tools/agoraquest.test.cjs` cobre conteúdo aprovado, não vazamento do gabarito, bloqueio de alteração, conclusão, caderno de erros, autorização, concorrência, idempotência, RLS/privilégios, migração e integração do CTA/service worker. A suíte completa é executada com `npm test`.

A migração também foi exercitada em banco PostgreSQL descartável (PGlite) com os handlers reais e sessões simuladas. A interface foi revisada estaticamente e a página não carrega o gabarito no JavaScript; a validação visual/interativa com login real de aluno deve ser feita após a migração em produção.

## Limitações conhecidas

- A migração precisa ser executada manualmente no Supabase; não há ferramenta de escrita do banco disponível neste ambiente.
- O AgoraQuest não conclui a aula e não altera o progresso. Isso é intencional para não confundir prática extra com a videoaula.
- Se a aula vinculada já tiver outra atividade principal (`aulas.atividade`), a página da aula continua redirecionando para essa atividade. Nesse caso, o AgoraQuest permanece acessível pela URL direta com `aula_id`, mas o convite não aparece na aula.
- O caderno de erros agrega as 100 tentativas mais recentes daquele aluno na aula. Se o volume crescer muito, será necessário paginar.
- A interface não foi exercitada com uma conta real de aluno neste ambiente; a autorização e a persistência foram testadas com banco descartável e handlers reais.
