# Salvamento seguro de cursos

## Experiência do professor

O editor busca a versão atual do curso ao abrir. O botão Salvar só fica disponível após uma alteração e aguarda o término da leitura de arquivos. Durante o envio, evita cliques repetidos e alterações concorrentes no mesmo editor.

Após salvar, o editor permanece aberto com a versão confirmada pelo servidor, permitindo continuar o trabalho. Erros não fecham o formulário nem substituem o rascunho. Quando outro professor alterou o curso, o salvamento é recusado e aparece **Reabrir versão atual**; reabrir pede confirmação antes de descartar o texto não salvo.

Remover módulos, aulas ou materiais registra os IDs escolhidos explicitamente. Antes de salvar remoções persistidas, há confirmação sobre o conteúdo e seus vínculos. Apenas omitir um item do formulário não autoriza exclusão. Adicionar um item novo e removê-lo antes de salvar não solicita exclusão de um registro inexistente.

O rascunho permanece na memória da página em caso de erro. Ele não constitui backup permanente e pode ser perdido ao fechar ou recarregar o navegador; fechar/reabrir pelo próprio editor pede confirmação.

## Banco: tudo confirma junto

`salvar_curso_atomico` aplica metadados, módulos, aulas, materiais e remoções em uma única transação. Uma exceção reverte a operação inteira, inclusive alterações que já tinham sido executadas dentro da função.

A coluna `cursos.versao` identifica a edição carregada. A função bloqueia a linha do curso durante a transação e verifica essa versão. Triggers também atualizam a versão quando módulos, aulas ou materiais são alterados por outro caminho administrativo. Comentários, matrículas e progresso de alunos não incrementam a versão do curso.

Uma tentativa tem UUID estável. Se o servidor confirmou, mas a resposta se perdeu, repetir a mesma tentativa devolve o resultado registrado em `operacoes_curso`. Não duplica aulas/arquivos nem sobrescreve uma edição posterior. A mesma tentativa não pode ser reutilizada para dados ou identidade diferentes.

A RPC é `SECURITY INVOKER`, somente `service_role` pode executá-la e o professor ativo é conferido novamente no banco. A rota autentica o usuário e fornece sua identidade; não aceita a identidade administrativa do navegador.

Os UUIDs existentes são mantidos. Linhas de módulos/aulas/materiais sem mudanças não são regravadas, preservando suas associações e evitando trabalho desnecessário. A exclusão de um curso inteiro também confere a versão e usa transação/idempotência.

## Arquivos: preparação e limpeza separadas

Storage não participa da transação Postgres. Por isso:

1. Arquivos novos usam caminhos únicos por tentativa e conteúdo, sem sobrescrever os antigos.
2. Os envios terminam antes da transação. Se falharem, o curso antigo continua íntegro.
3. A transação confirma os vínculos e coloca arquivos retirados na fila de limpeza.
4. A limpeza ocorre depois da confirmação, confere se o objeto ainda está referenciado e processa até três entradas por salvamento.
5. Arquivos preparados mas não vinculados ficam protegidos por 24 horas antes de poderem ser limpos. São verificados em salvamentos posteriores; esta alteração não instala um agendamento adicional.

A fila `arquivos_curso_pendentes` e o registro `operacoes_curso` têm RLS e nenhum acesso para visitantes/alunos. Falhas na limpeza deixam objetos para nova tentativa; não transformam uma gravação confirmada em erro fictício nem apagam o conteúdo que ainda está em uso.

O transporte continua usando JSON/base64. Há limite preventivo de 4 MB por requisição; arquivos maiores devem ser enviados em lotes menores. Upload direto/resumível é uma evolução separada, não incluída nesta mudança.

## Verificação e publicação

A migração é aditiva. Acrescenta versão, tabelas privadas de controle e funções/triggers; não altera títulos, classificação gratuita, matrículas ou progresso existentes. Uma cópia protegida dos dados atuais foi restaurada em Postgres isolado e comparada antes/depois da migração.

Os testes cobrem erros no meio da transação, formulários incompletos, remoções explícitas, conflitos entre editores, tentativas repetidas, privilégios, preservação de progresso/comentários e falhas de arquivo. A interface também foi exercitada em um servidor local com Postgres isolado, incluindo salvamento real da descrição e conflito que conserva o rascunho.

Aplicar a migração antes de publicar a rota nova, que depende da RPC e da coluna `versao`. O cliente antigo recebe orientação para atualizar ao tentar usar a rota nova sem versão/confirmações. Não oferecer fallback para o salvamento destrutivo antigo.

Em eventual reversão, conservar as colunas/tabelas e os dados. Restaurar a rota antiga reintroduziria os riscos anteriores; preferir correção ou suspensão temporária da edição. Não restaurar todo o banco apenas para reverter código.

Referências: [funções Postgres no Supabase](https://supabase.com/docs/guides/database/functions), [bloqueios de linha no PostgreSQL](https://www.postgresql.org/docs/17/explicit-locking.html), [uploads e arquivos existentes](https://supabase.com/docs/guides/storage/uploads/standard-uploads).
