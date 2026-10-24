# Avisos de novos cadastros

Destinatário: **drandersongleryston@gmail.com**.

A fila é criada somente quando uma conta real é inserida em `auth.users`. Um recadastro não gera outra entrada. Falhas no envio não impedem o aluno de se cadastrar. A fila é privada; somente o servidor consegue processá-la.

## Ativar o remetente

No projeto da plataforma na **Vercel → Settings → Environment Variables**, adicione em **Production**:

| Variável | Valor |
|---|---|
| `SMTP_USER` | Endereço da conta remetente. Para enviar pela mesma conta: `drandersongleryston@gmail.com`. |
| `SMTP_PASS` | Credencial SMTP. Para Gmail, use uma senha de app criada para a AgoraMed, não a senha normal. |
| `CRON_SECRET` | Segredo aleatório e forte, criado no gerenciador de senhas; protege a retentativa agendada. |

Para Gmail, os padrões já são `SMTP_HOST=smtp.gmail.com` e `SMTP_PORT=465`. Para outro provedor, defina essas variáveis e `SMTP_FROM` com o remetente autorizado.

O Google exige verificação em duas etapas para criar senhas de app: https://myaccount.google.com/apppasswords. Não copie senhas para o chat, GitHub ou arquivos versionados.

Depois de salvar as variáveis, faça um **Redeploy** na Vercel. Abra **Painel do professor → Alunos → Avisos por e-mail → Enviar e-mail de teste** e confira a caixa de entrada e o spam. O teste apenas envia uma mensagem ao destinatário autorizado; não cria alunos.

## Funcionamento

- O aviso traz nome, e-mail do aluno e link para o painel de liberação.
- O cadastro tenta enviar o aviso imediatamente após criar o perfil.
- Uma trava de cinco minutos evita processamentos simultâneos. Avisos aceitos pelo SMTP são marcados como enviados e não são reenviados normalmente.
- A retentativa automática roda uma vez por dia, compatível com o plano Hobby. O botão **Enviar avisos pendentes** processa até três avisos por clique; pode ser necessário aguardar cinco minutos após uma falha.
- A aceitação pelo SMTP não comprova entrega na caixa de entrada. Em caso de falha de confirmação no banco após o SMTP aceitar a mensagem, uma retentativa pode repetir o aviso; o Message-ID é estável para auxiliar a identificação.
- O serviço de envio precisa estar configurado para os avisos saírem. Enquanto isso, novas entradas permanecem na fila.

## Validação

Execute `npm test`. Os testes usam SMTP e banco simulados. A migração cria a tabela privada, o índice de pendências e o gatilho; não envia e-mails para usuários existentes.
