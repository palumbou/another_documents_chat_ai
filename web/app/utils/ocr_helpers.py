"""
OCR text extraction utilities.
"""

import tempfile
from typing import List
import pytesseract
from PIL import Image
from pdf2image import convert_from_path

from app.config import OCR_DPI, OCR_LANGUAGES, OCR_CONFIG

def extract_text_from_image(image_path: str) -> str:
    """Extract text from an image using OCR."""
    try:
        image = Image.open(image_path)
        text = pytesseract.image_to_string(
            image,
            lang=OCR_LANGUAGES,
            config=OCR_CONFIG
        )
        return text.strip()
    except Exception as e:
        print(f"OCR error on image {image_path}: {e}")
        return f"[OCR Error: {str(e)}]"

def pdf_to_images(pdf_path: str, max_pages: int = None) -> List[Image.Image]:
    """Convert PDF pages to images for OCR processing."""
    try:
        print(f"Converting PDF to images (max {max_pages} pages)...")
        images = convert_from_path(
            pdf_path,
            first_page=1,
            last_page=max_pages,
            dpi=OCR_DPI,
            fmt='jpeg'
        )
        return images
    except Exception as e:
        print(f"Error converting PDF to images: {e}")
        return []

def is_tesseract_available() -> bool:
    """Check if Tesseract OCR is available."""
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False

def get_available_languages() -> List[str]:
    """Get list of available OCR languages."""
    try:
        return pytesseract.get_languages()
    except Exception as e:
        print(f"Error getting OCR languages: {e}")
        return ['eng']  # Fallback to English
