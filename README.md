O cadastro e edição de módulos/aulas agora usa [salvamento transacional com versão e remoções explícitas](docs/salvamento-seguro.md).

> **Arquitetura atual:** Vercel + Supabase Auth/Postgres/Storage. As seções de demonstração abaixo são históricas. Para o fluxo atual de acesso automático e cursos pagos, consulte [Cursos gratuitos e pagos](docs/cursos-gratuitos-pagos.md).

# AGORAMED — Plataforma de Educação Médica (PWA)

Site responsivo (celular, tablet e computador), instalável como app (PWA), para cursos em vídeo
(YouTube incorporado), materiais em PDF, comentários/dúvidas e painel do professor.

> **Versão demonstração estática.** Todos os dados (contas, cursos, comentários, PDFs) ficam salvos
> no `localStorage` do navegador de cada dispositivo. Serve para validar a experiência e o visual.
> Para uso real com vários alunos, veja a seção *Próximo passo: versão com servidor*.

---

## 1. Como abrir

Não abra clicando duas vezes no arquivo `index.html` (o PWA e a câmera de armazenamento precisam de um servidor).
Rode um servidor local na pasta do projeto:

```bash
cd "/Users/anderson/Documents/Projeto Padrão"
python3 -m http.server 8123
```

Depois acesse **http://localhost:8123** no navegador. No celular, para testar na rede local:
`python3 -m http.server 8123 --bind 0.0.0.0` e acesse `http://SEU_IP:8123`.

Para publicar de graça depois: arraste a pasta para o **Netlify Drop**, ou use **Vercel / GitHub Pages / Cloudflare Pages**.

## 2. Contas de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Professor(a) / admin | `admin@plataforma.com` | `admin123` |
| Aluno | `aluno@demo.com` | `123456` |

Novos cadastros entram como **Pendente** e só acessam depois que você libera no painel.

## 3. O que existe hoje

**Tela de entrada (`index.html`)**
- Login e criação de conta na mesma tela, em abas.
- Mensagem clara quando a conta está aguardando liberação.
- **Marca:** a logomarca completa da AGORAMED abre o cartão; o símbolo aparece no rodapé
  (com o nome *Anderson Gleryston*), como marca d'água suave no fundo e como **ícone do app**
  (PWA/favicon). Veja a seção *Identidade visual (imagens da marca)*.
- **Tipografia: fonte do sistema** (padrão). Escolha feita por não baixar nenhum arquivo, aparecer
  instantaneamente e manter a mesma linguagem visual do resto da plataforma.
- Fontes decorativas **opcionais** (Josefin Sans e Jost, ambas SIL Open Font License) ficam guardadas
  em `fonts/` e só são carregadas quando pedidas explicitamente:
  - `index.html?fonte=josefin` — página inteira em Josefin Sans;
  - `index.html?fonte=titulos` — fonte só em títulos, botões e rótulos;
  - `index.html?fonte=jost` — página inteira em Jost;
  - `index.html?fonte=sistema` — o padrão (nada é baixado).
- Página de comparação: **`previa.html`** mostra computador + celular lado a lado com um botão para
  cada opção. Imagens de referência em `previas/` (`antes-*` = versão com Champagne & Limousines).

> Por padrão **nenhum arquivo de fonte é baixado** pelos alunos. `css/fontes.css` é gerado por
> `tools/baixar_fontes_livres.sh` e é carregado só sob demanda (via `?fonte=`). São fontes variáveis:
> cada arquivo cobre vários pesos (ex.: `300 700`), total de 6 arquivos (~118 KB) em `fonts/`.

### Identidade visual (imagens da marca)

A marca foi preparada a partir dos arquivos originais (que vinham como captura de tela, com fundo
cinza claro): `tools/tratar_logo.py` remove o fundo, limpa as bordas (sem halo claro) e recorta.
Resultado em `img/`:

| Arquivo | Uso |
|---|---|
| `img/agoramed-logo.png` | logomarca completa (símbolo + nome + assinatura) — topo do cartão de login |
| `img/agoramed-simbolo.png` | somente o símbolo, na cor original (azul-petróleo) — material de apoio |
| `img/agoramed-simbolo-branco.png` | símbolo em branco — marca d'água do fundo e rodapé |
| `icons/icon-192.png`, `icons/icon-512.png` | ícone do app (símbolo centralizado) |

Cor da marca: **#436E76** (praticamente o azul-petróleo da paleta, `#4A7784`).
A marca aparece na **tela de login** (logomarca no cartão + símbolo no rodapé e como marca d'água) e na
**barra do topo das demais páginas** (símbolo em branco + nome AGORAMED, que se resume ao símbolo em
telas de até 720px). A frase de assinatura é **"Decisões seguras, baseadas em evidências."**.
Para refazer as imagens a partir de novos originais:
`python3 tools/tratar_logo.py "logomarca.png" "simbolo.png"`.

> As fontes decorativas foram rebaixadas a opcional porque a marca agora é uma **imagem** — o nome
> aparece na logo, então o teste de tipografia (`previa.html`) afeta só textos auxiliares.

**Página do aluno (`app.html`)**
- Saudação por horário e destaque de "Continue de onde parou".
- Linha **Meus cursos** no estilo Netflix: capa grande, título, categoria, nº de módulos/aulas,
  duração, nível e barra de progresso.
- Linha **Novidades e cursos em destaque** com as divulgações que você cadastrar.
- Botão "Instalar app" quando o navegador permitir (PWA), menu do usuário e navegação inferior no celular.

**Página do curso (`curso.html?id=...`)**
- Capa, subtítulo, "pílulas" de informação rápida e progresso geral.
- Módulos em sanfona; cada aula mostra duração, descrição curta e selo de PDF.

**Página da aula (`aula.html?c=..&m=..&a=..`)**
- Player do YouTube incorporado (domínio `youtube-nocookie`, funciona no celular e em tela cheia).
- Se o vídeo ainda não foi publicado, aparece um aviso "Vídeo em produção".
- Botão **Marcar como concluída** (alimenta o progresso).
- **Materiais da aula**: PDFs anexados, com botão de download.
- **Dúvidas e comentários**: alunos e professor comentam na mesma linha do tempo;
  comentários do professor recebem o selo "Professor(a)"; o autor (ou o professor) pode excluir.

**Painel do professor (`admin.html`)**
- Aba **Cursos**: criar, editar, excluir. Editor com título, subtítulo, categoria, nível, descrição,
  emoji ou imagem de capa (a imagem é comprimida automaticamente), módulos e aulas.
- Em cada aula: **ID do vídeo do YouTube**, duração, descrição e **upload de PDFs** (vários por aula).
- Aba **Alunos**: liberar/bloquear cadastro, escolher quais cursos cada aluno vê, tornar alguém professor.
- Aba **Divulgações**: cards de propaganda de outros cursos que aparecem na home do aluno.

## 4. Como publicar uma aula nova (fluxo do dia a dia)

1. Suba o vídeo no YouTube (pode deixar como "Não listado" — só quem tem o link/o embed assiste).
2. Copie o ID: em `https://www.youtube.com/watch?v=**aBc123XyZ_4**`, o ID é `aBc123XyZ_4`.
3. Abra `admin.html` → **Cursos** → **✏️ Editar** no curso desejado.
4. No módulo correspondente, clique em **＋ Adicionar aula** e preencha título, duração e ID.
5. Anexe os PDFs da aula no seletor de arquivos ao lado.
6. **💾 Salvar alterações** — o aluno já vê a aula nova ao recarregar a página.

## 5. Instalar como app no celular (PWA)

- **Android/Chrome:** menu ⋮ → *Adicionar à tela inicial* (ou pelo botão "📲 Instalar app" no topo).
- **iPhone/Safari:** botão Compartilhar → *Adicionar à Tela de Início*.
- O app abre em tela cheia, com cor de tema `#4A7784` e **ícone do símbolo da AGORAMED** (`icons/`).

## 6. Limites importantes desta versão

- Dados **por navegador**: dois alunos em aparelhos diferentes **não veem os mesmos comentários** e o
  professor não enxerga os cadastros feitos em outros celulares.
- Limite de armazenamento do navegador (~5 MB por arquivo, ~5–10 MB por origem no total). Por isso a
  versão demo aceita PDFs de até 4,5 MB e comprime as imagens de capa.
- Senhas são apenas "mascaradas" com hash simples. **Não use dados reais** nesta versão.
- Limpar os dados do navegador apaga contas, cursos e comentários.

## 7. Próximo passo: versão com servidor

Para valer de verdade (múltiplos alunos, comentários compartilhados, PDFs na nuvem), o mesmo layout
precisa de um backend. Estrutura sugerida:

- **API**: Node/Express (ou FastAPI) + **SQLite/Postgres**, com autenticação por e-mail/senha (bcrypt + JWT) e
  papéis `admin` / `aluno`.
- **Arquivos**: PDFs e capas em armazenamento de objetos (S3, Cloudflare R2, Supabase Storage).
- **Tabelas**: `usuarios`, `cursos`, `modulos`, `aulas`, `materiais`, `comentarios`, `matriculas`, `progresso`.
- **Hospedagem**: front em Netlify/Vercel; API em Render/Railway/Fly.io.
- O front atual já está separado por página e usa um único módulo de dados (`js/store.js`), então a troca
  do `localStorage` por chamadas `fetch` à API é direta.

---

## Estrutura de arquivos

```
index.html      entrada (login / cadastro) — marca AGORAMED
app.html        home do aluno (cursos estilo Netflix + divulgações)
curso.html      módulos e aulas do curso
aula.html       player do YouTube + PDFs + comentários
admin.html      painel do professor
previa.html     página de teste visual da fonte da tela de login
css/styles.css  identidade visual (paleta Azul-petróleo #4A7784, Cinza-claro #EAEAEA, Cinza-escuro #5D6362)
css/fontes.css  @font-face das fontes opcionais (gerado — não editar à mão)
js/store.js     dados, login, progresso, comentários e utilitários de UI/PWA
manifest.json   configuração do app instalável
sw.js           service worker (funciona offline para o app shell)
icons/          ícones 192px e 512px, gerados a partir do símbolo da marca
img/            imagens da marca (logomarca e símbolo, com fundo transparente)
fonts/          Josefin Sans e Jost em woff2 (opcionais, só sob demanda)
previas/        capturas de tela geradas no teste visual
tools/          scripts de apoio (ícones, fontes, tratamento da logo, diagnóstico de PNG)
```

### Ferramentas (`tools/`)

| Script | Para que serve |
|---|---|
| `gerar_icones.py` | gera os ícones do PWA |
| `baixar_fontes_livres.sh` + `montar_fontes.py` | baixam e montam as fontes opcionais (`css/fontes.css`) |
| `tratar_logo.py` | prepara as imagens da marca (remove fundo, recorta, gera ícones) |
| `analisar_png.py` | lê um PNG sem dependências e informa dimensões, fundo, cores e área útil |
| `ver_ascii.py` | mostra a imagem como texto (mapa de opacidade/tom) — conferência rápida |

