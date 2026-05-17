"""Render full page 18 to PNG so we can see the layout."""
import fitz, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

doc = fitz.open(r"c:\Users\vinit\Desktop\TesJEE\QuestionPaper\WBJEE-2024 Mathematics, Phy & Chem Q+Sol (Dt 28-04-24).pdf")
page = doc[17]
pix = page.get_pixmap(dpi=140, alpha=False)
pix.save(r"c:\Users\vinit\Desktop\TesJEE\tools\page18.png")
print("Saved page18.png")
print(f"Size: {pix.width}x{pix.height}")
