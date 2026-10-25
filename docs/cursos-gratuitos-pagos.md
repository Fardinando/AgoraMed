# Cursos gratuitos e pagos

## Funcionamento

- Após confirmar o e-mail, uma conta nova acessa todos os cursos gratuitos sem aprovação ou matrícula manual.
- Uma conta bloqueada continua impedida de entrar. A classificação gratuita não reativa contas.
- Cursos pagos sem acesso aparecem em **Conheça outros cursos** e levam à página de vendas.
- Cursos pagos já liberados aparecem em **Meus cursos** e abrem o conteúdo.
- O clique consulta o acesso atual no servidor, inclusive se a capa veio de cache. Ao entrar no curso por esse caminho, os dados são carregados novamente.
- O professor continua podendo conceder/restringir cursos pagos individualmente ou em massa, e bloquear/desbloquear contas separadamente. Liberar um curso não desbloqueia automaticamente a conta na interface nova.
- Cursos gratuitos aparecem marcados e sem opção de desmarcar na gestão individual. Não é necessário criar matrículas para eles.
- O progresso administrativo inclui cursos gratuitos, mesmo quando o aluno não tem matrícula explícita.

## Curso atual

A migração classifica **DETERMINAÇÃO DE MORTE ENCEFÁLICA**, UUID `36c4246d-1f58-424b-ad07-c494ad7d4bd1`, como gratuito. A identidade e o título foram conferidos no banco antes da preparação.

A alteração não recria o curso nem modifica módulos, aulas, alunos, matrículas ou progresso. As matrículas antigas permanecem. Os demais cursos começam como pagos por padrão.

## Configurar um curso

No painel, abra **Cursos → Editar** e escolha **Acesso ao curso**. Para curso pago, preencha **Página de vendas do curso pago** com endereço HTTP/HTTPS. Enquanto não houver endereço, o anúncio fica como **Em breve**, sem link. Nenhum pagamento é processado pela AgoraMed nesta alteração; a concessão do curso pago permanece manual.

As divulgações genéricas continuam existindo. O catálogo de cursos pagos é gerado a partir dos cursos, sem necessidade de cadastrar uma divulgação duplicada.

## Segurança e compatibilidade

A API fornece somente a apresentação comercial dos cursos ainda não liberados. Vídeos, estrutura de aulas e caminhos de materiais só são consultados para cursos autorizados. PDFs, comentários e gravação de progresso usam a mesma regra de autorização: conta ativa e curso gratuito, matrícula ou papel administrativo.

A auditoria confirmou que a RPC antiga de exclusão podia ser chamada por visitantes e alunos. A migração conserva sua definição, mas revoga essa execução pública; o backend atual usa a API administrativa do Auth. Nenhuma exclusão foi executada.

A RLS também considera cursos gratuitos e bloqueio de conta. O helper privilegiado fica em schema privado, usa a identidade autenticada do chamador e não aceita um usuário arbitrário como parâmetro. O schema privado não deve ser adicionado aos schemas expostos pela Data API.

A coluna `perfis.liberado` passa a ter valor padrão `true` somente para novos perfis. Valores existentes não são alterados. A confirmação de e-mail no Supabase Auth deve continuar habilitada.

Editores antigos que não enviam os campos novos preservam a classificação e URL já gravadas. Um payload sem a estrutura mínima do curso é rejeitado antes de qualquer gravação. A estrutura completa ainda precisa ser preservada ao editar aulas; esta alteração não reescreve todo o editor nem torna suas múltiplas operações atômicas.

## Banco e publicação

Migração: `supabase/migrations/20261025223906_cursos_gratuitos_pagos.sql`.

Aplicar a migração antes de publicar o código que consulta `tipo_acesso` e `url_vendas`. Ela é transacional e não contém exclusões. Cancela caso o curso atual não corresponda ao ID/título conferidos, evitando execução inadvertida em outro conjunto de dados.

A migração antiga de avisos está no mesmo diretório `supabase/migrations`; as quatro migrações iniciais estão em `supabase/migracoes`. Não reexecutar indiscriminadamente o esquema inicial em produção.

Para reversão de interface, o código anterior pode operar com as colunas extras. Conservar dados e matrículas. Restaurar o padrão antigo de contas e as funções/policies só se for necessário reverter a regra de negócio; não remover cursos nem reimportar todo o banco.

## Validação

`npm ci` e `npm test` executam testes de cadastro, logout, avisos, progresso administrativo, regras de curso, redirecionamento e uma instância Postgres isolada em memória (PGlite). Os testes de banco aplicam o esquema e a migração reais com usuários e cursos fictícios, e verificam preservação de registros, gratuidade sem matrícula, concessão/revogação de pago, bloqueio e RLS.

A preparação também restaurou uma cópia protegida dos dados atuais em banco isolado e comparou todas as linhas antes/depois: 13 perfis, 1 curso, 3 módulos, 11 aulas, 11 matrículas e 5 conclusões, sem perda ou alteração dos valores originais. Esse backup contém dados pessoais, fica fora do repositório e não deve ser publicado.
