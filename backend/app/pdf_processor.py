from __future__ import annotations

import os
from dataclasses import dataclass

import fitz  # PyMuPDF
from langdetect import detect

try:
    import pytesseract
    from PIL import Image

    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False


@dataclass
class PageContent:
    page_number: int
    text: str
    language: str  # ar | en | unknown
    is_ocr: bool


def detect_language(text: str) -> str:
    if not text or len(text.strip()) < 20:
        return "unknown"
    try:
        lang = detect(text)
        if lang == "ar":
            return "ar"
        if lang in ("en", "en-US", "en-GB"):
            return "en"
        return lang
    except Exception:
        return "unknown"


def extract_text_from_pdf(pdf_path: str) -> list[PageContent]:
    doc = fitz.open(pdf_path)
    pages: list[PageContent] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text").strip()

        is_ocr = False
        if len(text) < 50 and HAS_TESSERACT:
            pix = page.get_pixmap(dpi=300)
            img_path = f"/tmp/etimad_page_{page_num}.png"
            pix.save(img_path)
            try:
                img = Image.open(img_path)
                text = pytesseract.image_to_string(img, lang="ara+eng")
                is_ocr = True
            finally:
                os.remove(img_path)

        language = detect_language(text)
        pages.append(PageContent(
            page_number=page_num + 1,
            text=text,
            language=language,
            is_ocr=is_ocr,
        ))

    doc.close()
    return pages


def get_full_text(pages: list[PageContent]) -> str:
    return "\n\n".join(
        f"--- Page {p.page_number} ({p.language}) ---\n{p.text}"
        for p in pages
        if p.text.strip()
    )


def detect_document_language(pages: list[PageContent]) -> str:
    ar_chars = 0
    en_chars = 0
    for p in pages:
        for ch in p.text:
            if "؀" <= ch <= "ۿ" or "ݐ" <= ch <= "ݿ":
                ar_chars += 1
            elif ch.isascii() and ch.isalpha():
                en_chars += 1

    if ar_chars > en_chars * 2:
        return "ar"
    if en_chars > ar_chars * 2:
        return "en"
    return "mixed"
