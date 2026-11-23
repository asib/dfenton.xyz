#!/usr/bin/env python3
"""Export the bitmaps the drawer-labels page draws with, and the test fixtures.

  public/misc/drawer-labels/label-data.json
      Glyphs of Liberation Sans Bold at 20 and 14 px, rendered one-bit by
      FreeType with hinting, with advances and kerning in 1/64 px; and the
      isometric head icons, 32 dots tall.
  tests/fixtures/drawer-labels.json
      Labels and a strip raster made by a Python copy of the page's renderer,
      so the JavaScript can be checked against it.

The icons come from the PT-D410 label scripts (render_inventory_labels.py and
render_head_catalog.py), which aren't in this repository. The heat-set insert
isn't among their icons; it is modelled here and drawn by their renderer.

  python3 scripts/export-drawer-labels.py --label-scripts ~/ptouch-labels/outputs

Needs Pillow.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[1]
FONT = REPO / 'public/fonts/liberation-sans-bold.ttf'
DATA = REPO / 'public/misc/drawer-labels/label-data.json'
FIXTURES = REPO / 'tests/fixtures/drawer-labels.json'
CHARS = [chr(c) for c in range(32, 127)] + ['×', '°']
SIZES = (20, 14)
ICONS = ('hex', 'socket', 'button', 'flat-socket', 'flat-phillips', 'combo', 'nut', 'washer', 'insert')


def ink_points(im):
    return [(x, y) for y in range(im.height) for x in range(im.width) if im.getpixel((x, y)) == 0]


def bitmap_rows(points, x0, y0, w, h):
    """Rows of hex, most significant bit first, padded to whole bytes."""
    grid = [[0] * ((w + 7) // 8 * 8) for _ in range(h)]
    for x, y in points:
        grid[y - y0][x - x0] = 1
    return [bytes(int(''.join(map(str, row[i:i + 8])), 2) for i in range(0, len(row), 8)).hex()
            for row in grid]


def export_font(size):
    font = ImageFont.truetype(str(FONT), size)
    glyphs = {}
    for c in CHARS:
        # Pen at an integer point on the baseline, so every copy of a glyph
        # is the same bitmap wherever it lands in a string.
        im = Image.new('1', (100, 100), 1)
        ImageDraw.Draw(im).text((30, 70), c, font=font, fill=0, anchor='ls')
        points = [(x - 30, y - 70) for x, y in ink_points(im)]
        glyph = {'advance': round(font.getlength(c) * 64)}
        if points:
            x0 = min(x for x, _ in points)
            y0 = min(y for _, y in points)
            w = max(x for x, _ in points) - x0 + 1
            h = max(y for _, y in points) - y0 + 1
            glyph.update(x=x0, y=y0, width=w, rows=bitmap_rows(points, x0, y0, w, h))
        glyphs[c] = glyph
    lengths = {c: font.getlength(c) for c in CHARS}
    kerning = {}
    for a in CHARS:
        for b in CHARS:
            k = round((font.getlength(a + b) - lengths[a] - lengths[b]) * 64)
            if k:
                kerning[a + b] = k
    return {'glyphs': glyphs, 'kerning': kerning}


def insert_model(Model, height=1.6, bore=.52, knurls=10, twist=.5):
    """A heat-set insert: a tapered lead-in, a diamond-knurled body, a bore on top."""
    profile = [(0, 0), (.80, 0), (.84, .28), (1, .34), (1, height - .08), (.93, height), (0, height)]
    model = Model()
    model.lathe(profile, sides=64, angle=math.pi / 64)
    model.profile = profile
    for sign in (1, -1):
        for i in range(knurls):
            a = 2 * math.pi * i / knurls
            b = a + sign * twist
            model.lines.append(((1.003 * math.cos(a), 1.003 * math.sin(a), .34),
                                (1.003 * math.cos(b), 1.003 * math.sin(b), height - .08)))
    model.drive = ('bore', height, bore)
    return model


def flatten_tips(im, ink_box):
    """A shape as tall as the icon has the top and bottom of its outline on a
    pixel centre, which leaves one dot above a gap; put the dot in the gap."""
    box = ink_box(im)
    for edge, inner in ((box[1], box[1] + 1), (box[3] - 1, box[3] - 2)):
        xs = [x for x in range(im.width) if im.getpixel((x, edge)) == 0]
        if len(xs) == 1 and im.getpixel((xs[0], inner)) != 0:
            im.putpixel((xs[0], edge), 1)
            im.putpixel((xs[0], inner), 0)
    return im


def export_icons(label_scripts):
    sys.path.insert(0, str(label_scripts))
    from render_head_catalog import Model, profile_model, rasterize
    from render_inventory_labels import icon, ink_box
    icons = {}
    for kind in ICONS:
        if kind == 'washer':  # as in prepare_wood_labels.py
            model = profile_model([(0, 0), (1, 0), (1, .14), (0, .14)], edges=(1, 2), neck=False)
            model.drive = ('bore', .14, .50)
            im = rasterize(model)
        elif kind == 'insert':
            im = flatten_tips(rasterize(insert_model(Model)), ink_box)
        else:
            im = icon(kind)
        box = ink_box(im)
        im = im.crop((box[0], 0, box[2], 32))
        assert im.height == 32
        icons[kind] = {'width': im.width, 'rows': bitmap_rows(ink_points(im), 0, 0, im.width, 32)}
    return icons, ink_box


# A Python copy of labels.js, for the fixtures.

def unpack(rows, width):
    return [[(int(row, 16) >> (len(row) * 4 - 1 - x)) & 1 for x in range(width)] for row in rows]


def text_bitmap(font, text):
    pen, points = 0, []
    for i, c in enumerate(text):
        if i:
            pen += font['kerning'].get(text[i - 1] + c, 0)
        g = font['glyphs'][c]
        if 'rows' in g:
            px = (pen + 32) // 64
            for y, row in enumerate(unpack(g['rows'], g['width'])):
                points += [(px + g['x'] + x, g['y'] + y) for x, bit in enumerate(row) if bit]
        pen += g['advance']
    x0, y0 = min(p[0] for p in points), min(p[1] for p in points)
    w, h = max(p[0] for p in points) - x0 + 1, max(p[1] for p in points) - y0 + 1
    grid = [[0] * w for _ in range(h)]
    for x, y in points:
        grid[y - y0][x - x0] = 1
    return grid


def render_label(data, kind, top, bottom=None):
    lines = [text_bitmap(data['fonts']['20'], top)]
    if bottom:
        lines.append(text_bitmap(data['fonts']['14'], bottom))
    text_w = max(len(line[0]) for line in lines)
    text_h = sum(len(line) for line in lines) + 3 * (len(lines) - 1)
    head = None if kind == 'none' else unpack(data['icons'][kind]['rows'], data['icons'][kind]['width'])
    x = 7 + (len(head[0]) + 6 if head else 0)
    width = x + text_w + 7
    grid = [[0] * width for _ in range(32)]
    if head:
        for y, row in enumerate(head):
            grid[y][7:7 + len(row)] = row
    y = (32 - text_h) // 2
    for line in lines:
        lx = x + (text_w - len(line[0])) // 2
        for dy, row in enumerate(line):
            for dx, bit in enumerate(row):
                grid[y + dy][lx + dx] |= bit
        y += len(line) + 3
    return grid


def to_image(grid):
    im = Image.new('1', (len(grid[0]), len(grid)), 1)
    for y, row in enumerate(grid):
        for x, bit in enumerate(row):
            if bit:
                im.putpixel((x, y), 0)
    return im


CASES = [
    ('hex', '1/4-20×1"', None),
    ('hex', '1/4-20×1-1/4"', None),
    ('nut', '#12-24', None),
    ('socket', 'M4×35mm', None),
    ('button', 'M4×40mm', None),
    ('flat-socket', 'M4×12mm', None),
    ('flat-phillips', '#6×3/8"', 'WOOD'),
    ('combo', '#12-24×1"', None),
    ('washer', '5/16"', 'FLAT WASHER'),
    ('insert', 'M3×5.7mm', 'HEAT-SET'),
    ('none', 'M8', 'SPARE'),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--label-scripts', type=Path, required=True,
                        help='folder holding render_inventory_labels.py')
    args = parser.parse_args()
    icons, ink_box = export_icons(args.label_scripts.resolve())
    data = {'font': 'Liberation Sans Bold', 'dpi': 180, 'height': 32,
            'fonts': {str(size): export_font(size) for size in SIZES}, 'icons': icons}
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')

    from render_batch import encode_columns
    labels = []
    for kind, top, bottom in CASES:
        grid = render_label(data, kind, top, bottom)
        im = to_image(grid)
        box = ink_box(im)
        assert box[0] == 7 and im.width - box[2] == 7, (top, box)
        labels.append({'icon': kind, 'top': top, 'bottom': bottom, 'width': im.width,
                       'rows': [''.join(map(str, row)) for row in grid]})
    # The strip as the launcher builds it: labels end to end, ticks at each boundary.
    guides = [0]
    for label in labels:
        guides.append(guides[-1] + label['width'])
    strip = Image.new('1', (guides[-1] + 1, 32), 1)
    for x, label in zip(guides, labels):
        strip.paste(to_image([[int(b) for b in row] for row in label['rows']]), (x, 0))
    draw = ImageDraw.Draw(strip)
    for x in guides:
        draw.line((x, 0, x, 1), fill=0)
        draw.line((x, 30, x, 31), fill=0)
    raster = encode_columns(strip)
    FIXTURES.parent.mkdir(parents=True, exist_ok=True)
    FIXTURES.write_text(json.dumps({'labels': labels, 'strip': {
        'guides': guides, 'columns': strip.width, 'raster_sha256': hashlib.sha256(raster).hexdigest()}},
        ensure_ascii=False, indent=1) + '\n')
    print(f'{DATA.relative_to(REPO)}: {DATA.stat().st_size} bytes; '
          f'{FIXTURES.relative_to(REPO)}: {len(labels)} labels, strip {strip.width} dots')


if __name__ == '__main__':
    main()
