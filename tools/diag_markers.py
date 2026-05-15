"""Diagnose why certain question markers aren't being found."""
import fitz, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

doc = fitz.open(r"c:\Users\vinit\Desktop\TesJEE\QuestionPaper\WBJEE-2024 Mathematics, Phy & Chem Q+Sol (Dt 28-04-24).pdf")

# Missing maths Qs: 15, 16, 25, 48, 53, 57, 61, 62, 63
# Missing phy+chem Qs: 6, 7, 59, 76, 77, 79
# Map number to which subject and pages
TARGET_MATHS = {15, 16, 25, 48, 53, 57, 61, 62, 63}
TARGET_PHYCHEM = {6, 7, 59, 76, 77, 79}

# Search all pages for blocks where text contains "N." for these N values
def scan(page_indices, targets, label):
    print(f"\n--- {label} ---")
    for p in page_indices:
        page = doc[p]
        for b in page.get_text("blocks"):
            x0, y0, x1, y1, text, blk_no, blk_type = b
            first = text.strip().split('\n')[0].strip()
            m = re.match(r'^(\d+)\.', first)
            if m:
                n = int(m.group(1))
                if n in targets:
                    print(f"Page {p+1}  x0={x0:.1f} y0={y0:.1f}  first_line={first!r}  block_text_first_80={text[:80]!r}")

scan(range(1, 25), TARGET_MATHS, "MATHS missing")
scan(range(26, 56), TARGET_PHYCHEM, "PHY+CHEM missing")
