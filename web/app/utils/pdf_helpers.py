"""
PDF text extraction utilities with multiple fallback strategies.
"""

import tempfile
from typing import Tuple
from PyPDF2 import PdfReader
import pdfplumber
import pytesseract
from PIL import Image
from pdf2image import convert_from_path

from app.config import (
    MAX_CHARS_PER_PAGE, MAX_TOTAL_CHARS, MAX_PAGES_LARGE_FILES, 
    MAX_PAGES_OCR, OCR_DPI, OCR_LANGUAGES, OCR_CONFIG
)

def extract_pdf_text_optimized(path: str, file_size: int) -> str:
    """
    Optimized PDF text extraction with multiple fallback strategies.
    Tries PyPDF2 first, then pdfplumber, then OCR if no text is found.
    """
    try:
        # First attempt with PyPDF2 (faster for simple PDFs)
        text_pypdf2 = extract_with_pypdf2(path, file_size)
        if text_pypdf2 and len(text_pypdf2.strip()) > 100:  # If we got substantial text
            print(f"PyPDF2 extraction successful: {len(text_pypdf2)} characters")
            return text_pypdf2
        
        print("PyPDF2 extracted minimal text, trying pdfplumber...")
        
        # Fallback to pdfplumber (more robust for complex PDFs)
        text_pdfplumber = extract_with_pdfplumber(path, file_size)
        if text_pdfplumber and len(text_pdfplumber.strip()) > 50:
            print(f"pdfplumber extraction successful: {len(text_pdfplumber)} characters")
            return text_pdfplumber
        
        print("Both PyPDF2 and pdfplumber extracted minimal text, trying OCR...")
        
        # Final fallback to OCR (for scanned PDFs)
        text_ocr = extract_with_ocr(path, file_size)
        if text_ocr and len(text_ocr.strip()) > 50:
            print(f"OCR extraction successful: {len(text_ocr)} characters")
            return text_ocr
        
        # If all methods fail
        print("All extraction methods yielded minimal text")
        return f"[Warning: Could not extract readable text from PDF. This might be a scanned document with poor quality or image-based PDF that requires manual processing. File has {get_page_count(path)} pages but no extractable text.]"
        
    except Exception as e:
        print(f"Error reading PDF {path}: {e}")
        return f"[Error reading PDF: {str(e)}]"

def extract_with_pypdf2(path: str, file_size: int) -> str:
    """Extract text using PyPDF2 (original method)."""
    try:
        reader = PdfReader(path)
        total_pages = len(reader.pages)
        print(f"PDF has {total_pages} pages (PyPDF2)")
        
        # For very large files, limit the number of pages we process
        max_pages = MAX_PAGES_LARGE_FILES if file_size > 10 * 1024 * 1024 else total_pages  # 10MB limit
        
        texts = []
        total_chars = 0
        
        for i, page in enumerate(reader.pages[:max_pages]):
            if total_chars >= MAX_TOTAL_CHARS:
                texts.append(f"\n[... Truncated after {i} pages due to size limit ...]")
                break
                
            try:
                page_text = page.extract_text() or ""
                # Limit characters per page
                if len(page_text) > MAX_CHARS_PER_PAGE:
                    page_text = page_text[:MAX_CHARS_PER_PAGE] + f"\n[... Page {i+1} truncated ...]"
                
                if page_text.strip():
                    texts.append(f"--- Page {i+1} ---\n{page_text}")
                    total_chars += len(page_text)
                    
            except Exception as e:
                print(f"Error extracting page {i+1} with PyPDF2: {e}")
                texts.append(f"--- Page {i+1} ---\n[Error extracting page: {str(e)}]")
        
        result = "\n\n".join(texts)
        print(f"PyPDF2 extracted {len(result)} characters from {len(texts)} pages")
        return result
        
    except Exception as e:
        print(f"PyPDF2 error: {e}")
        return ""

def extract_with_pdfplumber(path: str, file_size: int) -> str:
    """Extract text using pdfplumber (more robust method)."""
    try:
        texts = []
        total_chars = 0
        max_pages = MAX_PAGES_LARGE_FILES if file_size > 10 * 1024 * 1024 else None  # 10MB limit
        
        with pdfplumber.open(path) as pdf:
            total_pages = len(pdf.pages)
            pages_to_process = min(max_pages or total_pages, total_pages)
            print(f"PDF has {total_pages} pages, processing {pages_to_process} (pdfplumber)")
            
            for i, page in enumerate(pdf.pages[:pages_to_process]):
                if total_chars >= MAX_TOTAL_CHARS:
                    texts.append(f"\n[... Truncated after {i} pages due to size limit ...]")
                    break
                    
                try:
                    # Extract text with pdfplumber
                    page_text = page.extract_text()
                    
                    if page_text and page_text.strip():
                        # Clean up the text
                        page_text = page_text.strip()
                        
                        # Limit characters per page
                        if len(page_text) > 6000:  # Increased limit for pdfplumber
                            page_text = page_text[:6000] + f"\n[... Page {i+1} truncated ...]"
                        
                        texts.append(f"--- Page {i+1} ---\n{page_text}")
                        total_chars += len(page_text)
                        
                except Exception as e:
                    print(f"Error extracting page {i+1} with pdfplumber: {e}")
                    texts.append(f"--- Page {i+1} ---\n[Error extracting page: {str(e)}]")
            
            result = "\n\n".join(texts)
            print(f"pdfplumber extracted {len(result)} characters from {len(texts)} pages")
            return result
            
    except Exception as e:
        print(f"pdfplumber error: {e}")
        return ""

def extract_with_ocr(path: str, file_size: int) -> str:
    """Extract text using OCR (for scanned PDFs)."""
    try:
        print("Starting OCR extraction for scanned PDF...")
        
        # Convert PDF to images first
        with tempfile.TemporaryDirectory() as temp_dir:
            # Limit pages for large files
            max_pages = MAX_PAGES_OCR if file_size > 10 * 1024 * 1024 else 50
            
            print(f"Converting PDF to images (max {max_pages} pages)...")
            images = convert_from_path(
                path, 
                first_page=1, 
                last_page=max_pages,
                dpi=OCR_DPI,
                fmt='jpeg'
            )
            
            texts = []
            total_chars = 0
            max_total_chars = 500000  # OCR can be very verbose
            
            for i, image in enumerate(images):
                if total_chars >= max_total_chars:
                    texts.append(f"\n[... Truncated after {i} pages due to size limit ...]")
                    break
                
                try:
                    print(f"Running OCR on page {i+1}...")
                    
                    # Run OCR on the image
                    page_text = pytesseract.image_to_string(
                        image, 
                        lang=OCR_LANGUAGES,
                        config=OCR_CONFIG
                    )
                    
                    if page_text and page_text.strip():
                        # Clean up OCR text
                        page_text = clean_ocr_text(page_text)
                        
                        # Limit characters per page
                        if len(page_text) > 8000:  # Increased limit for better OCR text extraction
                            page_text = page_text[:8000] + f"\n[... Page {i+1} truncated ...]"
                        
                        if len(page_text.strip()) > 10:  # Only add if we got meaningful text
                            texts.append(f"--- Page {i+1} (OCR) ---\n{page_text}")
                            total_chars += len(page_text)
                    
                except Exception as e:
                    print(f"Error running OCR on page {i+1}: {e}")
                    texts.append(f"--- Page {i+1} ---\n[OCR Error: {str(e)}]")
            
            result = "\n\n".join(texts)
            print(f"OCR extracted {len(result)} characters from {len(texts)} pages")
            return result
            
    except Exception as e:
        print(f"OCR error: {e}")
        return f"[OCR Error: {str(e)}]"

def clean_ocr_text(text: str) -> str:
    """Clean up OCR text by removing excessive whitespace and common errors."""
    import re
    
    # Strip whitespace
    text = text.strip()
    
    # Remove excessive whitespace and clean up common OCR errors
    text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)  # Multiple newlines
    text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces/tabs
    
    return text

def get_page_count(path: str) -> int:
    """Get page count safely."""
    try:
        reader = PdfReader(path)
        return len(reader.pages)
    except:
        return 0

def get_pdf_metadata(path: str) -> dict:
    """Get PDF metadata for debugging."""
    try:
        reader = PdfReader(path)
        return {
            "total_pages": len(reader.pages),
            "is_encrypted": reader.is_encrypted,
            "metadata": reader.metadata
        }
    except Exception as e:
        return {"error": str(e)}
