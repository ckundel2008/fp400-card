"""Generate our own simple radar icon, with no vendor logo or household data."""
from pathlib import Path
import math
import struct
import zlib

size = 256
pixels = bytearray()
for y in range(size):
    pixels.append(0)
    for x in range(size):
        dx, dy = x - 128, y - 128
        distance = math.hypot(dx, dy)
        ring = any(abs(distance - radius) < 2.5 for radius in (32, 64, 96))
        axis = (abs(dx) < 1.5 or abs(dy) < 1.5) and distance < 99
        sweep = abs(dy + dx) < 3 and dx >= 0 and distance < 99
        dot = math.hypot(x - 174, y - 83) < 8 or distance < 6
        color = (114, 234, 179) if dot or sweep else (45, 112, 92) if ring or axis else (15, 35, 31)
        pixels.extend(color)

def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))

target = Path(__file__).resolve().parents[1] / 'custom_components/aqara_fp400/brand/icon.png'
target.parent.mkdir(exist_ok=True)
target.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(bytes(pixels))) + chunk(b'IEND', b''))
