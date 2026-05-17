"""Look at the geometry around Q49 vs Q11."""
import fitz, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

doc = fitz.open(r"c:\Users\vinit\Desktop\TesJEE\QuestionPaper\WBJEE-2024 Mathematics, Phy & Chem Q+Sol (Dt 28-04-24).pdf")

def find_qline(page, n):
    """Find line bbox of '<n>.' marker."""
    d = page.get_text("dict")
    for blk in d.get("blocks", []):
        if blk.get("type") != 0: continue
        for line in blk.get("lines", []):
            spans = line.get("spans", [])
            text = ''.join(s['text'] for s in spans).strip()
            m = re.match(rf'^{n}\.\s*$', text)
            if m and line['bbox'][0] < 60:
                return line['bbox']
    return None

# Show neighbor content for Q49 (around page 18 0-indexed -> page 17)
for page_idx in range(1, 25):
    page = doc[page_idx]
    for target_n in [11, 49]:
        bb = find_qline(page, target_n)
        if bb:
            print(f"\nQ{target_n} on page {page_idx+1}: line bbox={bb}")
            # Show all spans within 50px above q line
            y0 = bb[1]
            print(f"  Spans 50px ABOVE Q{target_n}.y0={y0:.1f}:")
            d = page.get_text("dict")
            spans = []
            for blk in d.get("blocks", []):
                if blk.get("type") != 0: continue
                for line in blk.get("lines", []):
                    for sp in line.get("spans", []):
                        b = sp.get("bbox")
                        if not b: continue
                        if b[1] < y0 and b[3] > y0 - 50:
                            spans.append((b, sp.get("text","")))
            spans.sort(key=lambda x: -x[0][1])  # closest first
            for b, t in spans[:10]:
                print(f"    y0={b[1]:.1f}-{b[3]:.1f}  text={t!r}")
            # Also drawings
            try:
                drs = page.get_drawings()
                for d in drs:
                    r = d.get("rect")
                    if not r: continue
                    if r.y1 > y0 - 50 and r.y0 < y0:
                        print(f"    DRAWING y0={r.y0:.1f}-{r.y1:.1f}")
            except: pass
