# Segredos, rotação de chaves e proteção de deployments

Registrado em 12/11/2026, após a rotação do `JWT_SECRET` de produção.

As chaves vivem somente nas env vars do Vercel (`lib/api.js` lê no carregamento do módulo). Nada de segredo no repositório: o histórico não contém valor real de `JWT_SECRET`, apenas a chave fictícia usada pelos testes de PDF (`chave-apenas-para-testes-de-pdf`). `.env`, `.env.*` e `.vercel/` estão no `.gitignore`; `.env.example` é o único versionado.

## O que o `JWT_SECRET` protege

É um segredo próprio da aplicação, distinto do JWT secret do Supabase. Assina duas coisas:

- **Cookie de sessão** `sessao`: JWT HS256, `HttpOnly`, `SameSite=Lax`, validade de 7 dias (`lib/api.js`).
- **Comprovante de upload de PDF**: chave derivada por HMAC-SHA256 (`agoramed:pdf-upload:v1`) e token de 18 horas (`lib/pdf-envio.js`). O comprovante vincula professor, curso, aula, tamanho e caminho; não serve como login.

Como o módulo lê `process.env.JWT_SECRET` uma única vez, **trocar a variável não afeta deployments já construídos**. É obrigatório um deployment novo.

## Rotação: efeitos esperados

- Todos os usuários são deslogados **uma vez**; o cookie antigo passa a ser inválido. Nenhum dado de aluno é perdido.
- Comprovantes de upload em andamento (janela de 18 h) param de valer; o professor precisa selecionar o arquivo novamente.
- O valor novo **não é recuperável** depois de gravado como Secret. Se for perdido, basta rotacionar de novo — o custo é repetir o logout geral.
- A variável do projeto cobre **Production e Preview**. Rotacionar atinge os dois ambientes.

## Passo a passo

1. Instalar e autenticar a CLI (o binário global fica em `~/.editor-video/node/bin`, já no `PATH`):

   ```bash
   npm install -g vercel
   cd "/Users/anderson/Documents/Projeto Padrão"
   vercel login
   vercel link          # projeto agoramed, org anderson-gleryston
   vercel env ls
   ```

   O `vercel link` cria `.vercel/`, já ignorado pelo Git. Ele também anexa `.vercel` e `.env*` ao final do `.gitignore`; conferir e remover as duplicatas, porque `.env*` depois de `!.env.example` volta a ignorar o exemplo.

2. Gerar o segredo sem exibi-lo e gravar direto na Vercel:

   ```bash
   SECRET=$(openssl rand -base64 48)
   printf '%s\n' "$SECRET" | vercel env update JWT_SECRET --environment production --sensitive --yes
   unset SECRET
   ```

   Se quiser guardar uma cópia no gerenciador de senhas, gere antes com `openssl rand -base64 48`, guarde e use `--value '<valor>'`.

3. **Redeploy obrigatório.** O caminho mais limpo é reconstruir o deployment de produção — reaproveita o build de origem e não empacota o diretório local (evita subir pastas não rastreadas):

   ```bash
   vercel redeploy https://<deployment-de-producao>.vercel.app
   ```

   Alternativa: commit vazio e push na `main`. Evitar `vercel --prod` local, que envia o diretório de trabalho inteiro.

   Confirmar que o deployment novo foi criado **depois** do `env update`:

   ```bash
   vercel inspect https://<deployment-novo>.vercel.app   # campo created
   ```

4. Validar em produção (`https://www.andersongleryston.med.br`):

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' https://www.andersongleryston.med.br/
   curl -s -o /dev/null -w '%{http_code}\n' -H 'Cookie: sessao=invalido.token.forjado' \
     https://www.andersongleryston.med.br/api/agoraquest-caderno
   ```

   Esperado: `200` na home e `401` com cookie forjado. O teste conclusivo é humano: a sessão antiga deve cair e o login novo deve funcionar no navegador.

## Proteção de deployments

Deployments antigos mantêm o segredo antigo e continuam acessíveis pelos URLs `*.vercel.app`, o que anula parte do efeito da rotação. A correção é a **Standard Protection** (Vercel Authentication), que protege os URLs de deployment e previews e deixa o domínio próprio público.

No projeto `agoramed` o valor antigo (`all_except_custom_domains`) estava configurado mas **não era aplicado no plano Hobby**: os URLs respondiam `200` para qualquer visitante. O valor efetivo é:

```json
{ "ssoProtection": { "deploymentType": "prod_deployment_urls_and_all_previews" } }
```

Estado verificado após a mudança:

- `https://agoramed-<id>.vercel.app/` → `302` para o login da Vercel.
- `https://www.andersongleryston.med.br/` → `200`, público.
- Cron `/api/interno/avisos-cadastro` disparado por `vercel-cron/1.0` → `200`.

Os crons internos da Vercel atravessam a proteção e continuam funcionando; confirmado nos logs de requisição (`vercel logs requests --deployment <url>`). Não foi preciso apagar deployments, então o rollback por `vercel promote` continua disponível.

Consequência: links de preview passam a exigir conta na Vercel. Para compartilhar uma prévia com alguém de fora, usar um bypass token temporário ou desativar a proteção pontualmente.

## Outras chaves do projeto

Todas em Production; rotacionar uma de cada vez, com redeploy e verificação.

| Variável | Uso | Se vazar |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | acesso administrativo ao Postgres/Storage, ignora RLS | rotacionar no Supabase e atualizar na Vercel imediatamente; é a chave de maior impacto |
| `CRON_SECRET` | header `Authorization` da rota de avisos de cadastro | rotacionar e redeploy; crons usam o valor atual da env var |
| `SMTP_USER` / `SMTP_PASS` | envio de e-mail | trocar a senha no provedor e na Vercel |
| `MERCADO_PAGO_ACCESS_TOKEN` / `MERCADO_PAGO_WEBHOOK_SECRET` | checkout e validação de webhook | revogar no Mercado Pago, emitir novo e redeploy |
| `CLOUDFLARE_STREAM_KEY_ID` / `CLOUDFLARE_STREAM_PRIVATE_KEY` / `CLOUDFLARE_STREAM_CUSTOMER_CODE` | assinatura de vídeo | revogar o token no Cloudflare |
| `SUPABASE_ANON_KEY` | cliente público, protegido por RLS | pública por desenho; depende de RLS correta |

## Checklist rápido

- [ ] `vercel whoami` e `vercel env ls` respondendo no projeto `agoramed`.
- [ ] `JWT_SECRET` atualizado em Production (e Preview) com valor novo.
- [ ] Deployment criado depois do `env update`, `Ready` e apontando para `www.andersongleryston.med.br`.
- [ ] Cookie antigo rejeitado e login novo funcionando no navegador.
- [ ] URLs `*.vercel.app` respondendo `302` sem sessão Vercel.
- [ ] Cron do dia seguinte executado com `200`.
