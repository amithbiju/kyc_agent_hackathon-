"""
Flask Aadhaar OCR (single-file)
Extracts ONLY: name, dob, aadhar_number

Requirements:
pip install flask flask-cors pillow pytesseract opencv-python

Ensure Tesseract is installed (system package).
On Ubuntu: sudo apt install tesseract-ocr
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile, os, re, unicodedata
from PIL import Image
import pytesseract
import cv2

app = Flask(__name__)
CORS(app)


# ------------------- Image helpers -------------------

def preprocess_image(image_path):
    """Grayscale, denoise and adaptive threshold. Returns temp path."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Cannot read image at: " + image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    th = cv2.adaptiveThreshold(gray, 255,
                               cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                               cv2.THRESH_BINARY, 11, 2)
    fd, tmp = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    cv2.imwrite(tmp, th)
    return tmp


def crop_name_dob_region(image_path):
    """
    Crop region containing name + DOB.
    This version captures a taller vertical range (fix for DOB=null).
    """
    img = cv2.imread(image_path)
    if img is None:
        return None
    h, w = img.shape[:2]

    # FIXED: increased vertical area to include DOB line
    x1, y1 = int(0.18 * w), int(0.04 * h)
    x2, y2 = int(0.97 * w), int(0.45 * h)   # ← increased y2

    crop = img[y1:y2, x1:x2]
    fd, tmp = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    cv2.imwrite(tmp, crop)
    return tmp



def ocr(path, psm=6):
    """Run pytesseract on path and return normalized text."""
    img = Image.open(path)
    config = f"--oem 3 --psm {psm}"
    text = pytesseract.image_to_string(img, config=config)
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\r", "")
    # collapse repeated blank lines
    text = re.sub(r"\n{2,}", "\n", text).strip()
    return text


# ------------------- Field extractors -------------------

def extract_aadhar(text):
    """Find 12-digit Aadhaar and format as '#### #### ####'."""
    m = re.search(r"(\d{4}\s?\d{4}\s?\d{4})", text)
    if not m:
        return None
    digits = re.sub(r"\s+", "", m.group(1))
    if len(digits) != 12:
        return None
    return f"{digits[0:4]} {digits[4:8]} {digits[8:12]}"


def extract_dob(text):
    """Find common DOB patterns like DD/MM/YYYY or DD-MM-YYYY."""
    m = re.search(r"(\d{2}[\/\-]\d{2}[\/\-]\d{4})", text)
    return m.group(1) if m else None


def clean_extracted_name(raw_name):
    """Clean OCR name candidate to remove artifacts and normalize casing."""
    if not raw_name:
        return None
    s = raw_name.strip()
    # drop leading non-letter characters (digits, punctuation)
    s = re.sub(r"^[^A-Za-z\u0900-\u097F]+", "", s)
    # remove labels accidentally captured
    s = re.sub(r"\b(Name|NAME|नाम|नाव|DOB|Date of Birth|DOB:)\b[:\s\-]*", "", s, flags=re.IGNORECASE)
    # split and drop 1-2 letter garbage tokens at start (like 'oN' or 'jo')
    parts = s.split()
    if len(parts) > 1 and re.fullmatch(r"[A-Za-z]{1,2}", parts[0]):
        parts = parts[1:]
    s = " ".join(parts)
    # strip trailing tokens that look like other fields
    s = re.sub(r"\b(MALE|FEMALE|VID|Aadhaar|AADHAAR|UID)\b.*$", "", s, flags=re.IGNORECASE).strip()
    # keep only letters, spaces, dots, apostrophes, hyphens, and Devanagari range
    s = re.sub(r"[^A-Za-z\u0900-\u097F\s\.\'\-]", " ", s)
    s = re.sub(r"\s{2,}", " ", s).strip()
    if not s:
        return None
    # Title-case Latin tokens, keep Devanagari tokens as-is
    out_tokens = []
    for tok in s.split():
        if re.search(r"[A-Za-z]", tok):
            if re.fullmatch(r"[A-Za-z]\.", tok):  # initial like 'K.'
                out_tokens.append(tok.upper())
            else:
                out_tokens.append(tok.title())
        else:
            out_tokens.append(tok)
    res = " ".join(out_tokens)
    # sanity check: name should have at least 2 words
    if len(res.split()) < 2:
        return None
    return res


def extract_name(text, text_crop=None):
    """
    Heuristic:
      1) If crop text is provided, try to find name in crop first (line above DOB).
      2) Otherwise use full text: find line above DOB.
      3) Fallback: look for the first two-word alphabetic line (allows leading digits like '3 Pankaj Khanna').
    """
    def find_by_dob_block(t):
        lines = [l.strip() for l in t.splitlines() if l.strip()]
        for i, line in enumerate(lines):
            if re.search(r"\d{2}[\/\-]\d{2}[\/\-]\d{4}", line):
                if i > 0:
                    cand = lines[i - 1]
                    # remove leading digits and punctuation
                    cand = re.sub(r"^[^\w\u0900-\u097F]+", "", cand)
                    # remove number prefix like '3 Pankaj Khanna' -> 'Pankaj Khanna'
                    cand = re.sub(r"^\d+\s+", "", cand)
                    cleaned = clean_extracted_name(cand)
                    if cleaned:
                        return cleaned
        return None

    # 1) try crop first
    if text_crop:
        name_from_crop = find_by_dob_block(text_crop)
        if name_from_crop:
            return name_from_crop

        # if not found, try two-word line in crop
        for line in [l.strip() for l in text_crop.splitlines() if l.strip()]:
            m = re.match(r"(?:\d+\s*)?([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F'\-\.]{1,})\s+([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F'\-\.]{1,})", line)
            if m:
                cand = m.group(0)
                cand = re.sub(r"^\d+\s+", "", cand)
                cleaned = clean_extracted_name(cand)
                if cleaned:
                    return cleaned

    # 2) try full text by DOB
    name_from_full = find_by_dob_block(text)
    if name_from_full:
        return name_from_full

    # 3) fallback: first good two-word candidate in full text
    for line in [l.strip() for l in text.splitlines() if l.strip()]:
        m = re.match(r"(?:\d+\s*)?([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F'\-\.]{1,})\s+([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F'\-\.]{1,})", line)
        if m:
            cand = m.group(0)
            cand = re.sub(r"^\d+\s+", "", cand)
            cleaned = clean_extracted_name(cand)
            if cleaned:
                return cleaned
    return None


# ------------------- Flask endpoint -------------------

@app.route('/extract', methods=['POST'])
def extract():
    if 'image' not in request.files:
        return jsonify({'error': "no image file part (name it 'image')"}), 400
    f = request.files['image']
    if f.filename == '':
        return jsonify({'error': 'empty filename'}), 400

    # save uploaded file to temp
    fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(f.filename)[1] or '.jpg')
    os.close(fd)
    f.save(temp_path)

    processed = None
    crop_path = None
    try:
        processed = preprocess_image(temp_path)
        # full OCR
        text_full = ocr(processed, psm=6)

        # crop OCR for name/dob area and OCR that separately
        crop_path = crop_name_dob_region(temp_path)
        text_crop = ocr(crop_path, psm=6) if crop_path else None

        aadhar = extract_aadhar(text_full)
        dob = extract_dob(text_crop or text_full)
        name = extract_name(text_full, text_crop=text_crop)

        # return only the requested fields
        return jsonify({
            "name": name,
            "dob": dob,
            "aadhar_number": aadhar
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # cleanup
        try:
            os.remove(temp_path)
        except Exception:
            pass
        try:
            if processed and os.path.exists(processed):
                os.remove(processed)
        except Exception:
            pass
        try:
            if crop_path and os.path.exists(crop_path):
                os.remove(crop_path)
        except Exception:
            pass


@app.route('/health')
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    # Quick local test using the uploaded file (this path is available in your session)
    # The developer-provided path to the uploaded file is:
    TEST_IMAGE = "/mnt/data/8e4dc1e3-6cda-491d-98f9-bb5bfb9256f3.png"

    # If you want to run a quick local test, uncomment the lines below:
    # import requests, json
    # r = requests.post("http://127.0.0.1:5000/extract", files={"image": open(TEST_IMAGE,"rb")})
    # print(r.json())

    app.run(host="0.0.0.0", port=5000, debug=True)
