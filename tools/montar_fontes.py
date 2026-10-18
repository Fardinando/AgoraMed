#!/usr/bin/env python3
"""
Monta css/fontes.css a partir dos CSS do Google Fonts salvos em /tmp.
NÃO usa rede: apenas organiza os @font-face para os arquivos locais.

Etapas (chamadas pelo próprio script `tools/baixar_fontes_livres.sh`):
  preparar  -> lê os CSS baixados, escreve /tmp/fontes-downloads.txt (url + destino)
  montar    -> verifica os arquivos locais e escreve css/fontes.css
"""
import os, re, sys

FAMILIAS = [
    ("Josefin Sans", "/tmp/fontes-josefin.css", ["latin", "latin-ext"]),
    ("Jost",         "/tmp/fontes-jost.css",    ["latin", "latin-ext"]),
]

OSC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA_FONTES = os.path.join(OSC, "fonts")
PASTA_CSS = os.path.join(OSC, "css")
LISTA = "/tmp/fontes-downloads.txt"


def slug(nome):
    return re.sub(r"[^a-z0-9]+", "-", nome.lower()).strip("-")


def analisar():
    """Devolve [(nome_familia, estilo, subconjunto, pesos, url, arquivo_local, unicode_range)]."""
    itens = []
    for nome, caminho_css, subconjuntos in FAMILIAS:
        css = open(caminho_css, encoding="utf-8").read()
        blocos = re.findall(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{[^}]+\})", css)
        grupos = {}
        for subconjunto, bloco in blocos:
            if subconjunto not in subconjuntos:
                continue
            peso = int(re.search(r"font-weight:\s*(\d+)", bloco).group(1))
            estilo = "italic" if "font-style: italic" in bloco else "normal"
            url = re.search(r"url\((https://[^)]+\.woff2)\)", bloco).group(1)
            alcance = re.search(r"unicode-range:\s*([^;]+);", bloco).group(1)
            chave = (estilo, subconjunto, url)
            grupos.setdefault(chave, {"pesos": set(), "alcance": alcance})["pesos"].add(peso)
        for (estilo, subconjunto, url), dados in sorted(grupos.items()):
            pesos = sorted(dados["pesos"])
            etiqueta = str(pesos[0]) if len(pesos) == 1 else f"{pesos[0]}-{pesos[-1]}"
            itens.append({
                "familia": nome,
                "estilo": estilo,
                "subconjunto": subconjunto,
                "faixa": str(pesos[0]) if len(pesos) == 1 else f"{pesos[0]} {pesos[-1]}",
                "url": url,
                "arquivo": f"{slug(nome)}-{etiqueta}-{estilo}-{subconjunto}.woff2",
                "alcance": dados["alcance"],
            })
    return itens


def preparar():
    itens = analisar()
    with open(LISTA, "w", encoding="utf-8") as f:
        for it in itens:
            f.write(f"{it['url']}\t{it['arquivo']}\n")
    print(f"{len(itens)} arquivos a baixar (lista em {LISTA})")
    for it in itens:
        print(" -", it["arquivo"])


def montar():
    itens = analisar()
    regras, faltando = [], []
    for it in itens:
        caminho = os.path.join(PASTA_FONTES, it["arquivo"])
        if not os.path.exists(caminho) or os.path.getsize(caminho) < 512:
            faltando.append(it["arquivo"])
            continue
        regras.append(
            "@font-face {\n"
            f'  font-family: "{it["familia"]}";\n'
            f'  font-style: {it["estilo"]};\n'
            f'  font-weight: {it["faixa"]};\n'
            "  font-display: swap;\n"
            f'  src: url("../fonts/{it["arquivo"]}") format("woff2");\n'
            f'  unicode-range: {it["alcance"]};\n'
            "}"
        )
    if faltando:
        print("ATENÇÃO — arquivos ausentes/incompletos:", ", ".join(faltando))
        sys.exit(1)
    cabecalho = (
        "/* ==========================================================================\n"
        "   fontes.css — fontes livres hospedadas localmente (SIL Open Font License)\n"
        "   Josefin Sans e Jost (Google Fonts). Gerado por tools/baixar_fontes_livres.sh\n"
        "   ========================================================================== */\n\n"
    )
    os.makedirs(PASTA_CSS, exist_ok=True)
    with open(os.path.join(PASTA_CSS, "fontes.css"), "w", encoding="utf-8") as f:
        f.write(cabecalho + "\n\n".join(regras) + "\n")
    print(f"css/fontes.css gerado com {len(regras)} @font-face")


if __name__ == "__main__":
    {"preparar": preparar, "montar": montar}[sys.argv[1]]()
