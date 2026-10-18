#!/usr/bin/env python3
"""Gera os ícones PNG do PWA (sem dependências externas)."""
import zlib, struct, os

def png(path, size):
    # fundo azul-petróleo #4A7784 com cruz médica branca centralizada
    bg = (0x4A, 0x77, 0x84)
    fg = (255, 255, 255)
    rows = []
    bar = size * 0.18          # espessura da cruz
    ext = size * 0.58          # comprimento de cada braço
    c = size / 2
    lo, hi = c - ext / 2, c + ext / 2
    bl, bh = c - bar / 2, c + bar / 2
    for y in range(size):
        row = bytearray()
        for x in range(size):
            dentro_h = lo <= x <= hi and bl <= y <= bh
            dentro_v = bl <= x <= bh and lo <= y <= hi
            row += bytes(fg if (dentro_h or dentro_v) else bg)
        rows.append(bytes(row))
    raw = b''.join(b'\x00' + r for r in rows)

    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    data = (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(data)

os.makedirs('icons', exist_ok=True)
png('icons/icon-192.png', 192)
png('icons/icon-512.png', 512)
print('Ícones gerados: icons/icon-192.png, icons/icon-512.png')
