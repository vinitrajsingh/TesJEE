"""Use line-level extraction to find question markers."""
import fitz, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

doc = fitz.open(r"c:\Users\vinit\Desktop\TesJEE\QuestionPaper\WBJEE-2024 Mathematics, Phy & Chem Q+Sol (Dt 28-04-24).pdf")

TARGETS_M = {48, 57, 62, 63}
TARGETS_PC = {6, 7, 59, 76, 77}

def scan_lines(page_indices, targets, label):
    print(f"\n--- {label} ---")
    for p in page_indices:
        page = doc[p]
        dictdata = page.get_text("dict")
        for blk in dictdata.get("blocks", []):
            if blk.get("type") != 0:
                continue
            for line in blk.get("lines", []):
                # Build line text
                texts = [span['text'] for span in line.get('spans', [])]
                line_text = ''.join(texts).strip()
                m = re.match(r'^(\d+)\.\s*$', line_text)
                if m:
                    n = int(m.group(1))
                    if n in targets:
                        bbox = line.get('bbox', (0,0,0,0))
                        spans = line.get('spans', [])
                        first_span_x = spans[0]['bbox'][0] if spans else 0
                        print(f"Page {p+1} bbox={bbox} line_text={line_text!r} spans={len(spans)} first_span_x={first_span_x:.1f}")

scan_lines(range(1, 25), TARGETS_M, "MATHS")
scan_lines(range(26, 56), TARGETS_PC, "PHY+CHEM")
