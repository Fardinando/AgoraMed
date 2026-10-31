# AgoraQuiz — fechamento de pré-requisitos

A atividade `pre-requisitos-v1` é vinculada à coluna `aulas.atividade`. A aula normal redireciona para `agoraquiz.html?aula_id=…`; a autorização é conferida de novo no servidor. O curso mantém navegação livre. A próxima aula é derivada da ordem atual dos módulos/aulas; sem próxima aula, o encerramento leva ao curso.

## Conteúdo e experiência

Texto integral da proposta aprovada em `lib/agoraquiz/pre-requisitos-v1.json`, sem alteração clínica. São 11 questões, 44 alternativas, comentários por escolha, complemento da questão 7, mensagens e fechamento. O navegador recebe o comentário de cada escolha somente após a confirmação. Fechamento liberado após 11 confirmações de leitura. O botão de leitura registra uma declaração do aluno, não comprova leitura. Sem nota mínima. A API corrige; não aceita nota ou estado enviados pelo navegador.

O nome na lista é **AgoraQuiz — Antes de iniciar, o que ainda precisa ser resolvido?**. Última aula do módulo 3, depois do caso clínico existente. A identificação fica acima do título na atividade.

## Persistência e autorização

- `agoraquiz_tentativas`: dono, aula, versão do conteúdo, revisão, estado e datas. RLS habilitada e acesso direto negado a anon/authenticated; somente service_role, utilizada exclusivamente no servidor.
- RPC `agoraquiz_gravar`: SECURITY INVOKER, permissões restritas, autorização por conta ativa e curso gratuito/matrícula/admin, serialização por aluno/aula, comparação de revisão e tentativa mais recente.
- Uma nova tentativa preserva todas as anteriores. Respostas confirmadas são imutáveis na máquina de estados. Repetição da última operação recebe o resultado já gravado; requisição conflitante exige carregar o estado atual.
- A confirmação do fechamento atualiza a tentativa e o progresso na mesma transação. A rota manual e o gatilho de progresso impedem conclusão sem atividade finalizada.
- Retomada entre aparelhos usa a conta, não localStorage. Falha de envio mantém operação pendente e oferece repetir a gravação ou carregar o estado atual.
- `GET/POST /api/agoraquiz` filtra pelo usuário da sessão; `GET /api/admin/agoraquiz` exige professor e filtra o aluno indicado. Históricos paginados em 25 tentativas.
- APIs com `private, no-store`, fora do cache do service worker. O shell não inclui respostas, comentários ou gabarito. Redirecionamento `/lib/*` leva a uma resposta 404, protegendo os arquivos internos do backend em hospedagem estática Vercel.
- Após a conclusão, o cache do aplicativo é invalidado para refletir o progresso. A v4 também atualiza os cursos em sessões anteriores à publicação.

No painel: Alunos → clicar no aluno → **Ver tentativas do AgoraQuiz**. O relatório exibe a situação, acertos, respostas e confirmações de leitura por questão. O ranking mantém o critério existente de percentual de aulas concluídas; o quiz conta como uma aula.

## Verificação

168 testes passando, incluindo as 44 escolhas, liberação de comentários, conclusão 0/11, acesso, concorrência, idempotência, histórico, progresso atômico e regressão. Interface exercitada em banco PostgreSQL descartável com os handlers reais e sessões simuladas: 11 questões, retomada, resposta bloqueada e relatório. Arquivos `.tmp/` são somente QA e não integram o commit.

A migração é aditiva, não remove conteúdo, perfis, matrículas ou progresso. A inserção da aula é feita apenas depois de a publicação estar pronta, com UUID gerado no banco e ordem posterior à última aula do módulo. Não se criam tentativas falsas em contas de alunos na produção.

## Aula publicada

- Aula: `e478f244-1e92-40ac-a72f-0cb761c202a5`.
- Módulo: `96f8ab56-f42a-4ae7-98fa-34d9ffabcb13`, ordem 11.
- Acesso: `https://agoramed.vercel.app/agoraquiz.html?aula_id=e478f244-1e92-40ac-a72f-0cb761c202a5`.
- Estrutura e permissões conferidas no banco publicado. A RPC também foi exercitada em transação revertida: conclusão e progresso confirmados sem deixar tentativas ou aulas de teste persistidas.
- Shell público HTTP 200, API de aluno sem sessão HTTP 401 e relatório sem sessão sem dados. Arquivos internos do quiz retornam 404 após o redirecionamento, inclusive com query de atualização.
- A conferência completa de interação usou sessões simuladas no banco descartável; não se realizou login em conta real de aluno para testar.
