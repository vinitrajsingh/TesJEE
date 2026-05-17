"""Find horizontal separator lines on each page (the question box borders)."""
import fitz, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

doc = fitz.open(r"c:\Users\vinit\Desktop\TesJEE\QuestionPaper\WBJEE-2024 Mathematics, Phy & Chem Q+Sol (Dt 28-04-24).pdf")

# Look at page 18 (Q49 page) and page 6 (Q11 page)
for page_idx in [5, 17]:
    page = doc[page_idx]
    print(f"\n===== Page {page_idx+1} drawings (page width={page.rect.width:.0f}) =====")
    long_h_lines = []
    for d in page.get_drawings():
        for item in d.get("items", []):
            try:
                if item[0] == "l":
                    p1, p2 = item[1], item[2]
                    if abs(p1.y - p2.y) < 1.0 and abs(p1.x - p2.x) > 400:
                        long_h_lines.append((min(p1.x, p2.x), p1.y, max(p1.x, p2.x), p2.y))
                elif item[0] == "re":
                    r = item[1]
                    if r.x1 - r.x0 > 400:
                        # Top and bottom edges of rect are horizontal lines
                        long_h_lines.append((r.x0, r.y0, r.x1, r.y0))
                        long_h_lines.append((r.x0, r.y1, r.x1, r.y1))
            except Exception as e:
                pass
    # Dedupe by y (within 2px)
    long_h_lines.sort(key=lambda l: l[1])
    print(f"Long horizontal lines (>400 points wide):")
    last_y = -10
    for x0, y0, x1, y1 in long_h_lines:
        if abs(y0 - last_y) < 2: continue
        print(f"  y={y0:.1f}  x=[{x0:.1f}, {x1:.1f}]  width={x1-x0:.1f}")
        last_y = y0
