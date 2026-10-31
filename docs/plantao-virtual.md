# Plantão Virtual — pré-requisitos

Atividade `plantao-pos-parada-v1`, aula adicional depois do AgoraQuiz no módulo dos nove pré-requisitos. Mantém as videoaulas, materiais, caso clínico anterior e AgoraQuiz. A navegação normal encaminha para `plantao-virtual.html?aula_id=…`.

## Experiência

Caso fictício de homem de 46 anos após parada cardiorrespiratória. Nove etapas na ordem atual, prontuário, classificação, evidências, fundamento, reflexão opcional, comentários, revisão e decisão integrada. O apoio vincula cada etapa à videoaula já cadastrada; sem retrato ou vídeos pendentes. Título sobre a imagem com destaque em turquesa e itálico. Repetição identificada como “Realizar nova tentativa”. Retorno às aulas no cabeçalho e no relatório.

A ausência de detalhamento farmacológico é uma lacuna explícita do registro fictício, não um cálculo de depuração. Não há habilitação profissional, diagnóstico real ou nota mínima. A reflexão livre não recebe correção automática.

## Integração

- Autorização por sessão ativa e acesso ao curso, repetida no servidor e na gravação transacional.
- `plantao_virtual_tentativas` com RLS e sem permissões diretas para anon/authenticated. RPC SECURITY INVOKER restrita a service_role; nenhuma credencial no navegador.
- API recebe ações e escolhas, aplica rubrica no servidor e ignora resultados enviados pelo cliente. Conteúdo entregue após autorização. Exercício formativo com rubrica consultável, não exame de alto impacto.
- Tentativas, reflexões, documentos consultados, apoio e versões das avaliações salvos na conta, com retomada entre aparelhos.
- Revisão otimista, idempotência e serialização por aluno/aula. Falha de gravação oferece repetição da operação pendente ou recarga. Conclusão exibida somente após confirmação do servidor.
- Nove registros confirmados e decisão integrada antes do fechamento. Tentativa concluída e progresso gravados na mesma transação. API manual e gatilho impedem conclusão antecipada. Repetir preserva a conclusão já obtida.
- Histórico do aluno paginado em 25 tentativas. Progresso e ranking contam como uma aula.
- API private/no-store fora do service worker. Cache v62 e catálogo v5 atualizam sessões existentes. Arquivos internos continuam protegidos por `/lib/*` → 404.

## Verificação

173 testes aprovados: autorização, isolamento de usuário, sequência, evidências, correção no servidor, preservação de versões, idempotência, conflitos, RLS, progresso atômico e regressão do AgoraQuiz/logout. Percurso completo exercitado também no navegador com handlers reais e PostgreSQL descartável, usando sessões simuladas: retomada com reflexão, nove etapas, apoio, conclusão, retorno e histórico após nova tentativa. Nenhuma tentativa de teste criada em conta real.
