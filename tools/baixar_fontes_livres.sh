#!/bin/bash
# ============================================================================
# Baixa as fontes livres (Josefin Sans e Jost) do Google Fonts para uso local.
# Os arquivos ficam em fonts/ e as regras @font-face em css/fontes.css,
# então a plataforma funciona offline, sem depender de CDN.
#
# Uso:  bash tools/baixar_fontes_livres.sh
# ============================================================================
set -e

cd "$(dirname "$0")/.."

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
API="https://fonts.googleapis.com/css2"

echo "1/3 — buscando as folhas de estilo do Google Fonts..."
curl -sS -L --max-time 30 -A "$UA" -o /tmp/fontes-josefin.css \
  "$API?family=Josefin+Sans:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap"
curl -sS -L --max-time 30 -A "$UA" -o /tmp/fontes-jost.css \
  "$API?family=Jost:wght@300;400;500;600;700&display=swap"

echo "2/3 — baixando os arquivos (em paralelo)..."
python3 tools/montar_fontes.py preparar
mkdir -p fonts
cd fonts
# cada linha da lista é "url<TAB>arquivo"
xargs -P 6 -n 2 sh -c "curl -sS -L --max-time 30 --retry 2 -A '$UA' -o \"\$1\" \"\$0\" && echo \"  ok \$1\" || echo \"  FALHOU \$1\"" < /tmp/fontes-downloads.txt
cd ..

echo "3/3 — montando css/fontes.css..."
python3 tools/montar_fontes.py montar

echo "Pronto. Fontes em fonts/ e regras em css/fontes.css."
