# AgoraQuiz na videoaula de exame clínico

Aula: `6a095878-7bc7-4316-9f90-c317efb27406`, módulo `7daf2fdb-ba8a-47ef-9931-ca21f811e29a`, curso de morte encefálica. Questões exibidas em `aula.html`, abaixo do vídeo e das ações da aula, antes dos materiais e comentários. Não cria outra aula, não altera o campo atividade e não substitui o vídeo.

## Conteúdo

Cinco questões e vinte comentários fornecidos pelo professor. Fonte integral preservada em `lib/quiz-aula/conteudo-original.md`; estrutura em JSON no mesmo diretório. Gabarito C, B, D, A, C. Para resposta incorreta, mostra comentário específico, alternativa correta e explicação. Inclui as cinco mensagens Para guardar e o exemplo de registro da quinta questão. Não houve reescrita clínica.

## Persistência

`GET/POST /api/quiz-aula` exige sessão ativa, aula vinculada e acesso ao curso. O servidor valida as transições e calcula a correção; o navegador não envia pontuação nem estado final. Comentários, gabarito e mensagens são liberados somente depois da confirmação de cada resposta. A API não é armazenada pelo service worker.

`quiz_aula_tentativas` possui RLS e acesso direto negado a anon/authenticated. RPC SECURITY INVOKER restrita à service_role, com nova autorização, bloqueio por aluno/aula, revisão e idempotência. Histórico paginado em 25 tentativas e novas tentativas preservam as anteriores. Falhas de gravação oferecem repetição da operação pendente e recarga da versão atual.

A última confirmação de leitura conclui o quiz e salva o resultado. Não existe nota mínima. Essa conclusão não escreve em progresso. Marcar ou desmarcar a videoaula permanece independente do quiz. Nenhuma tentativa anterior do AgoraQuiz ou Plantão Virtual foi migrada ou alterada.

## Verificação

177 testes passando: vinte escolhas e comentários, preservação textual, comentário oculto antes de confirmar, retomada, bloqueio de resposta confirmada, conclusão com zero acertos, autorização, isolamento por usuário, RLS, idempotência, conflito, histórico e independência do progresso. Percurso exercitado no navegador com handlers reais e PostgreSQL descartável: resposta errada, recarga, retomada, cinco questões, resultado 4/5, histórico e nova tentativa. Layout sem transbordamento na largura de celular. Nenhuma tentativa de teste foi criada em conta real.
