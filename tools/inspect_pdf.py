import fitz
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

pdf_path = r"c:\Users\vinit\Desktop\TesJEE\QuestionPaper\WBJEE-2024 Mathematics, Phy & Chem Q+Sol (Dt 28-04-24).pdf"
doc = fitz.open(pdf_path)
print(f"Pages: {len(doc)}")

with open(r"c:\Users\vinit\Desktop\TesJEE\tools\pdf_dump.txt", "w", encoding="utf-8") as f:
    for i in range(len(doc)):
        page = doc[i]
        f.write(f"\n\n========== PAGE {i+1} ==========\n")
        text = page.get_text()
        f.write(text)
        images = page.get_images(full=True)
        f.write(f"\n[Images on page: {len(images)}]\n")

print("Dump written to tools/pdf_dump.txt")
