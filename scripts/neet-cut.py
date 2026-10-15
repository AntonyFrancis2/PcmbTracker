# Cuts a two-column NEET booklet PDF into one PNG per question (see README). Needs pymupdf and rapidocr-onnxruntime.
"""Cut a two-column NEET booklet into one image per question.
usage: python3 -I cut.py <pdf> <first_page> <last_page> <expected> <outdir> <prefix> [--debug]
Question numbers sit alone at the left edge of each column (hanging indent), so any line of ink in
that narrow strip marks a question start. Pieces that run into the next column/page are stitched.
"""
import sys, os
import numpy as np, pymupdf, re
from rapidocr_onnxruntime import RapidOCR
OCR = RapidOCR()
from PIL import Image
pdf, p0, p1, expected, outdir, prefix = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5], sys.argv[6]
DEBUG = '--debug' in sys.argv
MARGIN = next((float(a.split('=')[1]) for a in sys.argv if a.startswith('--margin=')), .03)
BOT = next((float(a.split('=')[1]) for a in sys.argv if a.startswith('--bot=')), .935)
DPI = 200
HEADER_SKIP = 0  # set per page below
os.makedirs(outdir, exist_ok=True)
doc = pymupdf.open(pdf)

def page_img(i):
    pix = doc[i].get_pixmap(dpi=DPI, colorspace=pymupdf.csGRAY)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)

segments = []  # (page, img, x0, x1, ytop, ybot, starts[])
for i in range(p0, p1 + 1):
    a = page_img(i)
    h, w = a.shape
    ink = a < 140
    # Body band: drop header/footer lines (first/last text rows near the edges).
    rows = np.where(ink[:, int(w * .06):int(w * .94)].sum(1) > 2)[0]
    if len(rows) == 0: continue
    top_band, bot_band = int(h * .085), int(h * BOT)
    # Column split: darkest vertical line near the middle, else the middle.
    mid = slice(int(w * .44), int(w * .56))
    colsum = ink[top_band:bot_band, mid].sum(0)
    split = int(w * .44) + int(np.argmax(colsum)) if colsum.max() > (bot_band - top_band) * .5 else w // 2
    for cx0, cx1 in ((int(w * .04), split - 6), (split + 6, int(w * .97))):
        body = ink[top_band:bot_band, cx0:cx1]
        cs = body.sum(0)
        cols_with_ink = np.where((cs > 3) & (cs < body.shape[0] * .12))[0]   # ignore the column rule
        # Skip any x before a rule that sits at the very start of the column.
        rule = np.where(cs >= body.shape[0] * .12)[0]
        if len(rule) and rule[0] < DPI * .2:
            cols_with_ink = cols_with_ink[cols_with_ink > rule.max() + 3]
        rws = np.where(body.sum(1) > 0)[0]
        if len(cols_with_ink) == 0 or len(rws) == 0: continue
        left = cx0 + cols_with_ink[0]
        zone = ink[top_band:bot_band, left:left + int(DPI * .16)]   # ~4 mm strip
        prof = zone.sum(1) > 0
        starts, y = [], 0
        while y < len(prof):
            if prof[y]:
                y2 = y
                while y2 < len(prof) and prof[y2]: y2 += 1
                hgt = y2 - y
                # A number is one text line tall and is followed by text to its right on that line.
                if hgt >= DPI * .07:
                    starts.append((top_band + y, top_band + min(y2, y + int(DPI * .2)), left))
                y = y2
            y += 1
        segments.append([i, a, cx0, cx1, top_band + rws[0], top_band + rws[-1], starts, top_band])

def read_num(a, y0, y1, left):
    crop = a[max(y0 - 6, 0):y1 + 6, max(left - 2, 0):left + int(DPI * .36)]
    crop = np.pad(crop, 20, constant_values=255)
    res, _ = OCR(np.stack([crop] * 3, -1), use_det=False, use_cls=False, use_rec=True)
    txt = (res[0][0] if res else '').strip().replace(' ', '')
    m = re.match(r'(\d{1,3})(?:[.:,;]|$)', txt.replace('。', '.').replace('，', ',').replace('O', '0').replace('o', '0').replace('l', '1').replace('I', '1'))
    return (int(m.group(1)) if m else None), txt

# Keep only margin labels that are question numbers. Candidates are read by OCR; a reading that
# isn't the expected number is kept only if the following candidate reads as the number after it.
cands = []
for si, seg in enumerate(segments):
    for (y0, y1, left) in seg[6]:
        if y0 < seg[7] + DPI * .15: continue          # header line
        n, txt = read_num(seg[1], y0, y1, left)
        t = txt.lstrip('|一-_丨 I[]!')
        if not re.match(r'\d', t): continue            # '(1)' options, 'E1' footer, etc.
        cands.append((si, y0, n, txt))
    seg[6] = []
def same(n, want):
    if n is None: return False
    a, b = str(n), str(want)
    return a == b or a.replace('8', '3') == b.replace('8', '3')
want, log, k = 1, [], 0
MISSING = []
while k < len(cands):
    si, y0, n, txt = cands[k]
    ok = same(n, want)
    if not ok:
        nxt = [c[2] for c in cands[k + 1:k + 3]]
        ok = any(same(x, want + 1) for x in nxt[:1]) and not any(same(x, want) for x in nxt[:1])
        log.append(('CHECK', segments[si][0], txt, want, 'kept' if ok else 'dropped'))
    if not ok and n is not None and want < n <= want + 2 and k + 1 < len(cands) and same(cands[k + 1][2], n + 1):
        print('MISSING', list(range(want, n)), 'before page', segments[si][0])
        MISSING.extend(range(want, n)); want = n; ok = True
    if ok:
        segments[si][6].append((y0, want)); want += 1
    k += 1
for l in log: print(l)
marks = [(si, s[0], s[1]) for si, seg in enumerate(segments) for s in seg[6]]
print('found', len(marks), 'expected', expected, 'missing', MISSING)
if DEBUG:
    for si, seg in enumerate(segments): print('page', seg[0], 'col x', seg[2], 'starts', len(seg[6]))
if len(marks) + len(MISSING) != expected and not DEBUG:
    sys.exit('count mismatch')
for q, (si, y, qn) in enumerate(marks):
    nxt = marks[q + 1] if q + 1 < len(marks) else None
    pieces = []
    cur_si, cur_y = si, y - int(DPI * MARGIN)
    while True:
        p, a, x0, x1, yt, yb, _, _ = segments[cur_si]
        end = (nxt[1] - int(DPI * MARGIN)) if nxt and nxt[0] == cur_si else yb + int(DPI * .03)
        pieces.append(a[max(cur_y, 0):end, x0:x1])
        if nxt is None or nxt[0] == cur_si: break
        # Continue into the next column only if that column has content above its first number.
        cur_si += 1
        if cur_si >= len(segments): break
        nseg = segments[cur_si]
        first = nseg[6][0][0] if nseg[6] else nseg[5]
        if first - nseg[4] < DPI * .12: break
        cur_y = nseg[4] - int(DPI * .03)
    wmax = max(pc.shape[1] for pc in pieces)
    out = np.vstack([np.pad(pc, ((0, 0), (0, wmax - pc.shape[1])), constant_values=255) for pc in pieces])
    # Trim blank margins.
    inkr = np.where((out < 140).sum(1) > 0)[0]; inkc = np.where((out < 140).sum(0) > 0)[0]
    out = out[max(inkr[0] - 8, 0):inkr[-1] + 9, max(inkc[0] - 8, 0):inkc[-1] + 9]
    Image.fromarray(out).save(os.path.join(outdir, f'{prefix}{qn:03d}.png'))
print('written', len(marks))
