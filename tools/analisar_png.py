#!/usr/bin/env python3
"""Analisa um PNG (leitor em Python puro, sem dependências externas).

Uso: python3 tools/analisar_png.py arquivo.png

Informa: dimensões, tipo de cor, se o fundo é transparente, a cor de fundo,
a caixa delimitadora do conteúdo (bbox) e as cores dominantes.
Também pode salvar um recorte (--recortar destino.png) e/ou tornar o fundo
transparente a partir das bordas (--fundo-transparente).
"""
import struct, sys, zlib
from collections import Counter


def ler_png(caminho):
    with open(caminho, "rb") as f:
        dados = f.read()
    if dados[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("não é PNG")
    pos, idat, ihdr = 8, b"", None
    while pos < len(dados):
        tam = struct.unpack(">I", dados[pos:pos + 4])[0]
        tipo = dados[pos + 4:pos + 8]
        corpo = dados[pos + 8:pos + 8 + tam]
        if tipo == b"IHDR":
            ihdr = struct.unpack(">IIBBBBB", corpo)
        elif tipo == b"IDAT":
            idat += corpo
        elif tipo == b"IEND":
            break
        pos += 12 + tam

    largura, altura, bits, tipo_cor, comp, filtro, entrelacado = ihdr
    if bits != 8:
        raise ValueError(f"apenas 8 bits por canal (recebido {bits})")
    if entrelacado:
        raise ValueError("PNG entrelaçado não suportado")
    canais = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[tipo_cor]

    bruto = zlib.decompress(idat)
    passo = largura * canais
    linhas, anterior = [], bytearray(passo)
    pos = 0
    for _ in range(altura):
        f = bruto[pos]; pos += 1
        linha = bytearray(bruto[pos:pos + passo]); pos += passo
        if f == 1:      # Sub
            for i in range(canais, passo):
                linha[i] = (linha[i] + linha[i - canais]) & 0xFF
        elif f == 2:    # Up
            for i in range(passo):
                linha[i] = (linha[i] + anterior[i]) & 0xFF
        elif f == 3:    # Average
            for i in range(passo):
                a = linha[i - canais] if i >= canais else 0
                linha[i] = (linha[i] + ((a + anterior[i]) >> 1)) & 0xFF
        elif f == 4:    # Paeth
            for i in range(passo):
                a = linha[i - canais] if i >= canais else 0
                b = anterior[i]
                c = anterior[i - canais] if i >= canais else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pred = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                linha[i] = (linha[i] + pred) & 0xFF
        linhas.append(bytes(linha))
        anterior = linha
    return largura, altura, canais, linhas


def para_rgba(largura, altura, canais, linhas):
    px = bytearray(largura * altura * 4)
    for y in range(altura):
        linha = linhas[y]
        for x in range(largura):
            i = x * canais
            o = (y * largura + x) * 4
            if canais == 4:
                px[o:o + 4] = linha[i:i + 4]
            elif canais == 3:
                px[o:o + 3] = linha[i:i + 3]; px[o + 3] = 255
            elif canais == 1:
                v = linha[i]; px[o] = px[o + 1] = px[o + 2] = v; px[o + 3] = 255
            elif canais == 2:
                v = linha[i]; px[o] = px[o + 1] = px[o + 2] = v; px[o + 3] = linha[i + 1]
    return px


def escrever_png(caminho, largura, altura, px):
    linhas = b"".join(b"\x00" + bytes(px[y * largura * 4:(y + 1) * largura * 4]) for y in range(altura))

    def chunk(tipo, dados):
        return (struct.pack(">I", len(dados)) + tipo + dados
                + struct.pack(">I", zlib.crc32(tipo + dados) & 0xFFFFFFFF))

    with open(caminho, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n"
                + chunk(b"IHDR", struct.pack(">IIBBBBB", largura, altura, 8, 6, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(linhas, 9))
                + chunk(b"IEND", b""))


def hexcor(p):
    return "#%02X%02X%02X" % (p[0], p[1], p[2]) + ("" if p[3] == 255 else " (alpha %d)" % p[3])


def main():
    caminho = sys.argv[1]
    largura, altura, canais, linhas = ler_png(caminho)
    px = para_rgba(largura, altura, canais, linhas)

    def pixel(x, y):
        o = (y * largura + x) * 4
        return (px[o], px[o + 1], px[o + 2], px[o + 3])

    cantos = [pixel(0, 0), pixel(largura - 1, 0), pixel(0, altura - 1), pixel(largura - 1, altura - 1)]
    fundo = Counter(cantos).most_common(1)[0][0]
    fundo_transparente = fundo[3] == 0

    def eh_fundo(p):
        if fundo_transparente:
            return p[3] < 8
        return (abs(p[0] - fundo[0]) < 12 and abs(p[1] - fundo[1]) < 12
                and abs(p[2] - fundo[2]) < 12 and p[3] > 8)

    xs, ys = [], []
    for y in range(altura):
        for x in range(largura):
            if not eh_fundo(pixel(x, y)):
                xs.append(x); ys.append(y)

    print(f"arquivo: {caminho}")
    print(f"dimensões: {largura} x {altura}  (proporção {largura / altura:.2f}:1)")
    print(f"canais: {canais} — fundo dos cantos: {hexcor(fundo)}")
    print(f"fundo transparente: {'SIM' if fundo_transparente else 'NÃO'}")
    if not xs:
        print("conteúdo: nenhum pixel diferente do fundo (imagem vazia?)")
        return
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    print(f"caixa do conteúdo: x {x0}..{x1}  y {y0}..{y1}  "
          f"({x1 - x0 + 1} x {y1 - y0 + 1})")
    print(f"margens vazias: esquerda {x0}, direita {largura - 1 - x1}, "
          f"topo {y0}, base {altura - 1 - y1}")

    amostra = Counter()
    for y in range(y0, y1 + 1, max(1, (y1 - y0) // 120)):
        for x in range(x0, x1 + 1, max(1, (x1 - x0) // 120)):
            p = pixel(x, y)
            if p[3] > 200:
                amostra[(p[0] // 16 * 16, p[1] // 16 * 16, p[2] // 16 * 16)] += 1
    print("cores dominantes do conteúdo:")
    for cor, n in amostra.most_common(6):
        print(f"   #{cor[0]:02X}{cor[1]:02X}{cor[2]:02X}  ({n} amostras)")

    if "--recortar" in sys.argv:
        destino = sys.argv[sys.argv.index("--recortar") + 1]
        margem = max(4, int(max(x1 - x0, y1 - y0) * 0.02))
        rx0, ry0 = max(0, x0 - margem), max(0, y0 - margem)
        rx1, ry1 = min(largura - 1, x1 + margem), min(altura - 1, y1 + margem)
        rw, rh = rx1 - rx0 + 1, ry1 - ry0 + 1
        saida = bytearray(rw * rh * 4)
        for y in range(rh):
            for x in range(rw):
                o = ((y + ry0) * largura + (x + rx0)) * 4
                d = (y * rw + x) * 4
                saida[d:d + 4] = px[o:o + 4]
        escrever_png(destino, rw, rh, saida)
        print(f"recorte salvo: {destino} ({rw} x {rh})")


if __name__ == "__main__":
    main()
