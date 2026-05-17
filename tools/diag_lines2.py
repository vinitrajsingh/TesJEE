"""Look at ALL drawing types on a page to understand question box borders."""
import fitz, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

doc = fitz.open(r"c:\Users\vinit\Desktop\TesJEE\QuestionPaper\WBJEE-2024 Mathematics, Phy & Chem Q+Sol (Dt 28-04-24).pdf")

# Render page 18 visually first to see what's there
page = doc[17]
print(f"Page 18 width={page.rect.width:.1f} height={page.rect.height:.1f}")
print(f"\nAll drawing rects on page:")
for i, d in enumerate(page.get_drawings()):
    r = d.get("rect")
    if r is None:
        continue
    w = r.x1 - r.x0
    h = r.y1 - r.y0
    if w > 50 or h > 50:
        # Significant drawings
        n_items = len(d.get("items", []))
        types = set(item[0] for item in d.get("items", []) if item)
        print(f"  draw[{i}] rect=({r.x0:.0f},{r.y0:.0f})-({r.x1:.0f},{r.y1:.0f})  w={w:.0f} h={h:.0f}  items={n_items}  types={types}")
