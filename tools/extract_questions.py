"""
Extract WBJEE 2024 questions from PDF.
For each question:
  - Locate question N start on the page (left-margin marker like "1.")
  - Locate the following "Ans :" line
  - Crop the rect [question_start_y .. ans_y - margin] as a high-DPI PNG
  - Parse inline answer "(X)" or "(A, B, D)" for the canonical correct option(s)
Emit one PNG per question and two JSON files (paper1=Maths, paper2=Phy+Chem).
"""

import fitz
import json
import os
import re
import sys
import io
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

PDF_PATH = r"c:\Users\vinit\Desktop\TesJEE\QuestionPaper\WBJEE-2024 Mathematics, Phy & Chem Q+Sol (Dt 28-04-24).pdf"
APP_DIR = r"c:\Users\vinit\Desktop\TesJEE\app"
IMG_DIR = os.path.join(APP_DIR, "questions", "2024")
DATA_DIR = os.path.join(APP_DIR, "data")
DPI = 200
ZOOM = DPI / 72.0
HEADER_CUTOFF_Y = 70  # skip top header on continuation pages
FOOTER_CUTOFF_Y = 50  # skip bottom footer
ANS_MARGIN = 4  # crop a tiny bit above the Ans : line

os.makedirs(IMG_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

doc = fitz.open(PDF_PATH)
print(f"Opened PDF: {len(doc)} pages")

# --------------------------------------------------------------------------
# 0-indexed page ranges
# Page 0: Maths answer key
# Pages 1..24: Maths questions
# Page 25: Phy+Chem answer key
# Pages 26..55: Phy+Chem questions
# --------------------------------------------------------------------------

MATHS_PAGES = list(range(1, 25))          # pages 2..25 in 1-indexed
PHYCHEM_PAGES = list(range(26, 56))       # pages 27..56 in 1-indexed


def extract_lines(page_indices):
    """Get all text lines with bboxes across pages, in reading order."""
    items = []
    for p in page_indices:
        page = doc[p]
        d = page.get_text("dict")
        for blk in d.get("blocks", []):
            if blk.get("type") != 0:
                continue
            for line in blk.get("lines", []):
                spans = line.get("spans", [])
                text = ''.join(s['text'] for s in spans)
                bbox = line.get("bbox", (0, 0, 0, 0))
                items.append({
                    'page': p, 'x0': bbox[0], 'y0': bbox[1],
                    'x1': bbox[2], 'y1': bbox[3],
                    'text': text
                })
    items.sort(key=lambda it: (it['page'], it['y0']))
    return items


def find_question_markers(lines, max_q):
    """
    Find left-margin lines like '1.', '2.', ..., 'max_q.' indicating question starts.
    A marker is a line whose text starts with N. (optionally followed by question text).
    Must be at left margin (x0 < 60).
    Returns dict: {q_num: {'page', 'y0', 'x0'}}
    """
    markers = {}
    for ln in lines:
        text = ln['text'].strip()
        # Match either "N." standalone or "N. <rest>"
        m = re.match(r'^(\d+)\.(?:\s|$)', text)
        if not m:
            continue
        q_num = int(m.group(1))
        if not (1 <= q_num <= max_q):
            continue
        if ln['x0'] > 60:  # must be left-margin
            continue
        if q_num in markers:
            continue
        markers[q_num] = {'page': ln['page'], 'y0': ln['y0'], 'x0': ln['x0']}
    return markers


def find_ans_markers(lines):
    """Find lines containing 'Ans :' or 'Ans:'. Returns list of (page, y0, text)."""
    out = []
    for ln in lines:
        if re.search(r'\bAns\s*:', ln['text']):
            out.append({'page': ln['page'], 'y0': ln['y0'], 'text': ln['text']})
    return out


def find_next_ans(ans_list, page, y0):
    """Find the first Ans marker AFTER position (page, y0)."""
    for a in ans_list:
        if (a['page'], a['y0']) > (page, y0):
            return a
    return None


def parse_answer(text):
    """
    From a block text containing 'Ans : (X)' or 'Ans: (A, B, C)' or 'Ans : (BD)'.
    Return list of letters like ['A'] or ['A','B','D'].
    """
    # Find content within first parens after 'Ans'
    m = re.search(r'Ans\s*:\s*\(([^)]*)\)', text)
    if not m:
        # Sometimes it might be 'Ans : A' without parens. Be permissive.
        m = re.search(r'Ans\s*:\s*([A-Da-d](?:\s*,\s*[A-Da-d])*)', text)
        if not m:
            return []
        inside = m.group(1)
    else:
        inside = m.group(1)
    # Extract A-D letters
    letters = re.findall(r'[A-Da-d]', inside)
    # Preserve order, drop dupes
    seen = []
    for c in letters:
        c = c.upper()
        if c not in seen:
            seen.append(c)
    return seen


def crop_question(q_num, q_start, q_end, out_path, label):
    """
    Crop region between q_start (page, y0) and q_end (page, y0).
    If multi-page, stitch using PIL.
    """
    parts = []
    p1 = q_start['page']
    p2 = q_end['page']
    y_start = q_start['y0'] - 2  # tiny margin above the number
    y_end = q_end['y0'] - ANS_MARGIN

    if p1 == p2:
        page = doc[p1]
        rect = fitz.Rect(0, max(0, y_start), page.rect.width, y_end)
        pix = page.get_pixmap(clip=rect, matrix=fitz.Matrix(ZOOM, ZOOM), alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        parts.append(img)
    else:
        # Part 1: from q_start.y to bottom of p1
        page1 = doc[p1]
        rect1 = fitz.Rect(0, max(0, y_start), page1.rect.width,
                          page1.rect.height - FOOTER_CUTOFF_Y)
        pix1 = page1.get_pixmap(clip=rect1, matrix=fitz.Matrix(ZOOM, ZOOM), alpha=False)
        parts.append(Image.open(io.BytesIO(pix1.tobytes("png"))))

        # Middle full pages (rare, but handle)
        for p_mid in range(p1 + 1, p2):
            pmid = doc[p_mid]
            rectm = fitz.Rect(0, HEADER_CUTOFF_Y, pmid.rect.width,
                              pmid.rect.height - FOOTER_CUTOFF_Y)
            pixm = pmid.get_pixmap(clip=rectm, matrix=fitz.Matrix(ZOOM, ZOOM), alpha=False)
            parts.append(Image.open(io.BytesIO(pixm.tobytes("png"))))

        # Part 2: from header_cutoff of p2 down to q_end.y
        page2 = doc[p2]
        rect2 = fitz.Rect(0, HEADER_CUTOFF_Y, page2.rect.width, y_end)
        pix2 = page2.get_pixmap(clip=rect2, matrix=fitz.Matrix(ZOOM, ZOOM), alpha=False)
        parts.append(Image.open(io.BytesIO(pix2.tobytes("png"))))

    # Stitch
    if len(parts) == 1:
        final = parts[0]
    else:
        widths = [p.width for p in parts]
        heights = [p.height for p in parts]
        W = max(widths)
        H = sum(heights)
        final = Image.new("RGB", (W, H), "white")
        y_off = 0
        for p in parts:
            final.paste(p, (0, y_off))
            y_off += p.height

    final.save(out_path, "PNG", optimize=True)
    return final.size


# Subject definitions
# Each subject: (page_range, max_q_num, q_num_offset_for_filename, category_rules)
# category_rules: function q_num -> category 1/2/3

def maths_category(q):
    if q <= 50:  return 1
    if q <= 65:  return 2
    return 3

def physics_category(q):
    if q <= 30:  return 1
    if q <= 35:  return 2
    return 3

def chemistry_category(q):
    if q <= 70:  return 1   # Q41..70 are Cat 1
    if q <= 75:  return 2
    return 3


def extract_paper(page_indices, max_q, out_prefix, category_func, subject_func):
    """
    Extract questions whose numbers run 1..max_q across `page_indices`.
    `subject_func(q_num)` returns subject name string.
    """
    lines = extract_lines(page_indices)
    markers = find_question_markers(lines, max_q)
    ans_list = find_ans_markers(lines)

    print(f"\n--- Extract {out_prefix} ---")
    print(f"Pages: {page_indices[0]+1}..{page_indices[-1]+1}  Markers: {len(markers)}/{max_q}  Ans blocks: {len(ans_list)}")

    missing = [q for q in range(1, max_q + 1) if q not in markers]
    if missing:
        print(f"  ! Missing markers: {missing}")

    questions = []
    for q in range(1, max_q + 1):
        if q not in markers:
            print(f"  ! Q{q} marker not found, skipping")
            continue
        q_start = markers[q]
        # End is the next Ans marker after q_start
        ans = find_next_ans(ans_list, q_start['page'], q_start['y0'])
        if not ans:
            print(f"  ! Q{q} no following Ans, skipping")
            continue
        # Crop image
        subj = subject_func(q)
        filename = f"{subj.lower()}_q{q}.png"
        out_path = os.path.join(IMG_DIR, filename)
        try:
            w, h = crop_question(q, q_start, ans, out_path, label=f"{subj} Q{q}")
        except Exception as e:
            print(f"  ! Q{q} crop failed: {e}")
            continue
        # Parse answer
        correct = parse_answer(ans['text'])
        if not correct:
            print(f"  ! Q{q} couldn't parse answer from: {ans['text'][:120]!r}")
        cat = category_func(q)
        multi = (cat == 3)
        marks_correct = 1 if cat == 1 else 2
        marks_wrong = -0.25 if cat == 1 else (-0.5 if cat == 2 else 0)
        questions.append({
            "id": f"q{q}",
            "number": q,
            "subject": subj,
            "category": cat,
            "image": f"questions/2024/{filename}",
            "options": ["A", "B", "C", "D"],
            "correct": correct,
            "multi_correct": multi,
            "marks_correct": marks_correct,
            "marks_wrong": marks_wrong,
            "img_size": [w, h]
        })
        print(f"  Q{q:>2} cat={cat} ans={correct}  {w}x{h}px  -> {filename}")

    return questions


# --- MATHS (Paper 1) ---
maths_qs = extract_paper(
    MATHS_PAGES, 75, "MATHS",
    maths_category,
    lambda q: "Mathematics"
)

paper1 = {
    "year": 2024,
    "paper": 1,
    "paper_title": "Mathematics",
    "duration_minutes": 120,
    "total_questions": 75,
    "total_marks": 100,
    "category_rules": {
        "1": {"marks_correct": 1,  "marks_wrong": -0.25, "type": "single",   "range": [1, 50]},
        "2": {"marks_correct": 2,  "marks_wrong": -0.5,  "type": "single",   "range": [51, 65]},
        "3": {"marks_correct": 2,  "marks_wrong": 0,     "type": "multi",    "range": [66, 75]}
    },
    "questions": maths_qs
}
with open(os.path.join(DATA_DIR, "2024_paper1.json"), "w", encoding="utf-8") as f:
    json.dump(paper1, f, indent=2, ensure_ascii=False)
print(f"\nSaved paper1: {len(maths_qs)} questions")


# --- PHYSICS + CHEMISTRY (Paper 2) ---
def phychem_subject(q):
    return "Physics" if q <= 40 else "Chemistry"

def phychem_category(q):
    if q <= 40:
        return physics_category(q)
    return chemistry_category(q)

phychem_qs = extract_paper(
    PHYCHEM_PAGES, 80, "PHY+CHEM",
    phychem_category,
    phychem_subject
)

paper2 = {
    "year": 2024,
    "paper": 2,
    "paper_title": "Physics & Chemistry",
    "duration_minutes": 120,
    "total_questions": 80,
    "total_marks": 100,
    "category_rules_physics": {
        "1": {"marks_correct": 1,  "marks_wrong": -0.25, "type": "single",   "range": [1, 30]},
        "2": {"marks_correct": 2,  "marks_wrong": -0.5,  "type": "single",   "range": [31, 35]},
        "3": {"marks_correct": 2,  "marks_wrong": 0,     "type": "multi",    "range": [36, 40]}
    },
    "category_rules_chemistry": {
        "1": {"marks_correct": 1,  "marks_wrong": -0.25, "type": "single",   "range": [41, 70]},
        "2": {"marks_correct": 2,  "marks_wrong": -0.5,  "type": "single",   "range": [71, 75]},
        "3": {"marks_correct": 2,  "marks_wrong": 0,     "type": "multi",    "range": [76, 80]}
    },
    "questions": phychem_qs
}
with open(os.path.join(DATA_DIR, "2024_paper2.json"), "w", encoding="utf-8") as f:
    json.dump(paper2, f, indent=2, ensure_ascii=False)
print(f"Saved paper2: {len(phychem_qs)} questions")

print("\nDone.")
