#!/usr/bin/env python3
"""
Prepara as imagens da marca AGORAMED a partir dos arquivos originais
(capturas de tela com fundo cinza claro) para uso no site:

  img/agoramed-logo.png             logomarca completa, fundo transparente e recortada
  img/agoramed-simbolo.png          símbolo, fundo transparente e recortado
  img/agoramed-simbolo-branco.png   símbolo em branco (para fundos escuros)
  icons/icon-192.png / icon-512.png ícones do PWA (símbolo centralizado em fundo branco)

Uso:
  python3 tools/tratar_logo.py "caminho da logomarca.png" "caminho do simbolo.png"
"""
import os, sys, zlib, struct
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analisar_png import ler_png, para_rgba, escrever_png  # noqa: E402

OSC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOLERANCIA = 26          # distância de cor considerada "fundo"
LIMIAR_ESCURO = 140      # luminância abaixo disso = arte sólida


def dist(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))


def separar_fundo(largura, altura, px):
    """Devolve (mask, bg): mask[i]=True para pixels de fundo (ligados às bordas)."""
    cantos = []
    for (x, y) in ((0, 0), (largura - 1, 0), (0, altura - 1), (largura - 1, altura - 1)):
        o = (y * largura + x) * 4
        cantos.append((px[o], px[o + 1], px[o + 2]))
    bg = Counter(cantos).most_common(1)[0][0]

    mask = bytearray(largura * altura)
    pilha = []
    for x in range(largura):
        pilha.append((x, 0)); pilha.append((x, altura - 1))
    for y in range(altura):
        pilha.append((0, y)); pilha.append((largura - 1, y))

    while pilha:
        x, y = pilha.pop()
        i = y * largura + x
        if mask[i]:
            continue
        o = i * 4
        if px[o + 3] == 0 or dist((px[o], px[o + 1], px[o + 2]), bg) <= TOLERANCIA:
            mask[i] = 1
            if x > 0: pilha.append((x - 1, y))
            if x < largura - 1: pilha.append((x + 1, y))
            if y > 0: pilha.append((x, y - 1))
            if y < altura - 1: pilha.append((x, y + 1))
    return mask, bg


def cor_da_arte(largura, altura, px, mask):
    """Cor mediana dos pixels escuros (a cor 'cheia' da marca)."""
    amostras = []
    for i in range(largura * altura):
        if mask[i]:
            continue
        o = i * 4
        r, g, b = px[o], px[o + 1], px[o + 2]
        if (r * 299 + g * 587 + b * 114) // 1000 < LIMIAR_ESCURO:
            amostras.append((r, g, b))
    if not amostras:
        return (0, 0, 0)
    amostras.sort(key=lambda c: c[0] * 299 + c[1] * 587 + c[2] * 114)
    return amostras[len(amostras) // 2]


def aplicar_transparencia(largura, altura, px, mask, bg, arte):
    """Zera o fundo e limpa as bordas (recupera a cor real onde havia antialias)."""
    dist_arte_bg = max(1, dist(arte, bg))
    # pixels de borda: fundo dentro de 2 px
    for y in range(altura):
        for x in range(largura):
            i = y * largura + x
            if mask[i] or px[i * 4 + 3] == 0:
                continue
            perto = False
            for dy in (-2, -1, 0, 1, 2):
                for dx in (-2, -1, 0, 1, 2):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < largura and 0 <= ny < altura and mask[ny * largura + nx]:
                        perto = True
                        break
                if perto:
                    break
            if not perto:
                continue
            o = i * 4
            c = (px[o], px[o + 1], px[o + 2])
            fracao = min(1.0, dist(c, bg) / dist_arte_bg)
            if fracao <= 0.02:
                px[o + 3] = 0
                continue
            # desfaz a mistura com o fundo: arte = bg + (c - bg) / fracao
            novos = []
            for k in range(3):
                v = bg[k] + (c[k] - bg[k]) / fracao
                novos.append(max(0, min(255, int(round(v)))))
            px[o], px[o + 1], px[o + 2] = novos
            px[o + 3] = max(0, min(255, int(round(255 * fracao))))

    # zera o fundo após processar as bordas (para não usar vizinhos já limpos)
    for i in range(largura * altura):
        if mask[i]:
            px[i * 4 + 3] = 0


def recortar(largura, altura, px, folga_relativa=0.015):
    xs0, xs1, ys0, ys1 = largura, -1, altura, -1
    for y in range(altura):
        base = y * largura
        for x in range(largura):
            if px[(base + x) * 4 + 3] > 4:
                if x < xs0: xs0 = x
                if x > xs1: xs1 = x
                if y < ys0: ys0 = y
                if y > ys1: ys1 = y
    if xs1 < 0:
        raise ValueError("nada visível depois de remover o fundo")
    folga = max(2, int(max(xs1 - xs0, ys1 - ys0) * folga_relativa))
    x0, y0 = max(0, xs0 - folga), max(0, ys0 - folga)
    x1, y1 = min(largura - 1, xs1 + folga), min(altura - 1, ys1 + folga)
    rw, rh = x1 - x0 + 1, y1 - y0 + 1
    saida = bytearray(rw * rh * 4)
    for y in range(rh):
        origem = ((y + y0) * largura + x0) * 4
        destino = y * rw * 4
        saida[destino:destino + rw * 4] = px[origem:origem + rw * 4]
    return rw, rh, saida


def pintar_de_branco(largura, altura, px):
    """Mantém o formato (canal alfa) e pinta tudo de branco."""
    novo = bytearray(px)
    for i in range(largura * altura):
        o = i * 4
        if novo[o + 3] > 0:
            novo[o] = novo[o + 1] = novo[o + 2] = 255
    return novo


def redimensionar(largura, altura, px, nova_largura, nova_altura):
    """Redimensiona com média de área, respeitando o canal alfa (sem franjas)."""
    saida = bytearray(nova_largura * nova_altura * 4)
    for y in range(nova_altura):
        y0 = int(y * altura / nova_altura)
        y1 = max(y0 + 1, int((y + 1) * altura / nova_altura))
        for x in range(nova_largura):
            x0 = int(x * largura / nova_largura)
            x1 = max(x0 + 1, int((x + 1) * largura / nova_largura))
            sr = sg = sb = sa = n = 0
            for yy in range(y0, y1):
                base = yy * largura
                for xx in range(x0, x1):
                    o = (base + xx) * 4
                    a = px[o + 3]
                    sr += px[o] * a; sg += px[o + 1] * a; sb += px[o + 2] * a; sa += a; n += 1
            d = (y * nova_largura + x) * 4
            if sa == 0:
                saida[d:d + 4] = bytes((0, 0, 0, 0))
            else:
                saida[d] = min(255, sr // sa)
                saida[d + 1] = min(255, sg // sa)
                saida[d + 2] = min(255, sb // sa)
                saida[d + 3] = min(255, sa // n)
    return saida


def icone_quadrado(sim_w, sim_h, sim_px, tamanho, fundo=(255, 255, 255), proporcao=0.66):
    alvo = int(tamanho * proporcao)
    escala = min(alvo / sim_w, alvo / sim_h)
    nw, nh = max(1, int(sim_w * escala)), max(1, int(sim_h * escala))
    red = redimensionar(sim_w, sim_h, sim_px, nw, nh)
    tela = bytearray(bytes(fundo + (255,)) * (tamanho * tamanho))
    ox, oy = (tamanho - nw) // 2, (tamanho - nh) // 2
    for y in range(nh):
        for x in range(nw):
            o = (y * nw + x) * 4
            a = red[o + 3] / 255
            if a <= 0:
                continue
            d = ((y + oy) * tamanho + (x + ox)) * 4
            for k in range(3):
                tela[d + k] = int(round(tela[d + k] * (1 - a) + red[o + k] * a))
            tela[d + 3] = 255
    return tamanho, tamanho, tela


def processar(caminho, destino_saida, nome):
    largura, altura, canais, linhas = ler_png(caminho)
    px = para_rgba(largura, altura, canais, linhas)
    mask, bg = separar_fundo(largura, altura, px)
    arte = cor_da_arte(largura, altura, px, mask)
    aplicar_transparencia(largura, altura, px, mask, bg, arte)
    rw, rh, rec = recortar(largura, altura, px)
    escrever_png(destino_saida, rw, rh, rec)
    print(f"{nome}: {largura}x{altura} -> {rw}x{rh}  (fundo {bg} removido, arte {arte})")
    return rw, rh, rec


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    os.makedirs(os.path.join(OSC, "img"), exist_ok=True)
    os.makedirs(os.path.join(OSC, "icons"), exist_ok=True)

    lw, lh, _ = processar(sys.argv[1], os.path.join(OSC, "img", "agoramed-logo.png"), "logomarca")
    sw, sh, spx = processar(sys.argv[2], os.path.join(OSC, "img", "agoramed-simbolo.png"), "símbolo")

    # símbolo branco (para fundos escuros, como o gradiente da tela de login)
    branco = pintar_de_branco(sw, sh, spx)
    escrever_png(os.path.join(OSC, "img", "agoramed-simbolo-branco.png"), sw, sh, branco)
    print(f"símbolo branco: {sw}x{sh}")

    # ícones do PWA
    for tam in (192, 512):
        tw, th, tpx = icone_quadrado(sw, sh, spx, tam)
        escrever_png(os.path.join(OSC, "icons", f"icon-{tam}.png"), tw, th, tpx)
        print(f"ícone {tam}x{tam} gerado")
