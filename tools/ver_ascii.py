#!/usr/bin/env python3
"""
Prévia em texto (ASCII) de um PNG — útil para conferir rapidamente o formato,
a área ocupada e a distribuição de tons de uma imagem, sem abri-la.

Uso:
  python3 tools/ver_ascii.py imagem.png [largura_em_colunas]

Legenda: ' ' = transparente/vazio   '#' = tom escuro   '+' = tom médio   '.' = tom claro
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analisar_png import ler_png, para_rgba  # noqa: E402


def main():
    caminho = sys.argv[1]
    colunas = int(sys.argv[2]) if len(sys.argv) > 2 else 110
    largura, altura, canais, linhas = ler_png(caminho)
    px = para_rgba(largura, altura, canais, linhas)

    # cada caractere representa ~2 pixels de altura
    linhas_saida = max(1, int(altura / largura * colunas * 0.5))
    print(f"{caminho}  ({largura}x{altura}) -> {colunas}x{linhas_saida} caracteres")
    print("+" + "-" * colunas + "+")
    for ly in range(linhas_saida):
        y0 = int(ly * altura / linhas_saida)
        y1 = max(y0 + 1, int((ly + 1) * altura / linhas_saida))
        linha = []
        for lx in range(colunas):
            x0 = int(lx * largura / colunas)
            x1 = max(x0 + 1, int((lx + 1) * largura / colunas))
            soma_a = 0
            soma_lum = 0
            n = 0
            for y in range(y0, y1):
                base = y * largura
                for x in range(x0, x1):
                    o = (base + x) * 4
                    a = px[o + 3]
                    soma_a += a
                    if a > 0:
                        soma_lum += (px[o] * 299 + px[o + 1] * 587 + px[o + 2] * 114) // 1000
                    n += 1
            media_a = soma_a / n
            if media_a < 45:
                linha.append(" ")
                continue
            lum = soma_lum / max(1, n * media_a / 255)
            linha.append("#" if lum < 110 else ("+" if lum < 190 else "."))
        print("|" + "".join(linha) + "|")
    print("+" + "-" * colunas + "+")


if __name__ == "__main__":
    main()
