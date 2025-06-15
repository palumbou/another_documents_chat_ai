"""
Debug router.
Handles PDF extraction debugging and analysis endpoints.
"""

import os
from PyPDF2 import PdfReader

from fastapi import APIRouter, HTTPException

from app.config import DOCS_DIR
from app.schemas import DebugPDFInfo, DebugExtractionResponse
from app.utils.pdf_helpers import extract_with_pypdf2, extract_with_pdfplumber, extract_with_ocr
from app.utils.file_helpers import get_file_size_mb

router = APIRouter()

@router.get("/debug/pdf/{filename}", response_model=DebugPDFInfo)
async def debug_pdf_extraction(filename: str):
    """
    Debug endpoint to analyze PDF text extraction issues.
    """
    file_path = os.path.join(DOCS_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File {filename} not found")
    
    if not filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        reader = PdfReader(file_path)
        file_size_mb = get_file_size_mb(file_path)
        
        debug_info = {
            "filename": filename,
            "file_size_mb": file_size_mb,
            "total_pages": len(reader.pages),
            "is_encrypted": reader.is_encrypted,
            "pages_analysis": []
        }
        
        # Analyze first 5 pages in detail
        for i, page in enumerate(reader.pages[:5]):
            try:
                text = page.extract_text() or ""
                page_info = {
                    "page_number": i + 1,
                    "text_length": len(text),
                    "has_text": len(text.strip()) > 0,
                    "text_preview": text[:200] + "..." if len(text) > 200 else text,
                    "annotations": len(page.annotations) if hasattr(page, 'annotations') and page.annotations else 0
                }
                
                # Check if page has images
                if hasattr(page, '/Resources') and page['/Resources']:
                    resources = page['/Resources']
                    if '/XObject' in resources:
                        xobjects = resources['/XObject'].get_object()
                        page_info["images_count"] = len([k for k, v in xobjects.items() if v.get('/Subtype') == '/Image'])
                    else:
                        page_info["images_count"] = 0
                else:
                    page_info["images_count"] = 0
                    
                debug_info["pages_analysis"].append(page_info)
                
            except Exception as e:
                debug_info["pages_analysis"].append({
                    "page_number": i + 1,
                    "error": str(e)
                })
        
        return debug_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing PDF: {str(e)}")

@router.get("/debug/pdf-plumber/{filename}", response_model=DebugExtractionResponse)
async def debug_pdf_plumber_extraction(filename: str):
    """
    Test pdfplumber extraction on a specific PDF.
    """
    file_path = os.path.join(DOCS_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File {filename} not found")
    
    if not filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        file_size = int(get_file_size_mb(file_path) * 1024 * 1024)
        
        debug_info = {
            "filename": filename,
            "file_size_mb": get_file_size_mb(file_path),
            "extraction_methods": {}
        }
        
        # Test PyPDF2 extraction
        try:
            pypdf2_text = extract_with_pypdf2(file_path, file_size)
            debug_info["extraction_methods"]["pypdf2"] = {
                "success": True,
                "text_length": len(pypdf2_text),
                "has_text": len(pypdf2_text.strip()) > 100,
                "preview": pypdf2_text[:300] + "..." if len(pypdf2_text) > 300 else pypdf2_text
            }
        except Exception as e:
            debug_info["extraction_methods"]["pypdf2"] = {
                "success": False,
                "error": str(e)
            }
        
        # Test pdfplumber extraction
        try:
            pdfplumber_text = extract_with_pdfplumber(file_path, file_size)
            debug_info["extraction_methods"]["pdfplumber"] = {
                "success": True,
                "text_length": len(pdfplumber_text),
                "has_text": len(pdfplumber_text.strip()) > 50,
                "preview": pdfplumber_text[:300] + "..." if len(pdfplumber_text) > 300 else pdfplumber_text
            }
        except Exception as e:
            debug_info["extraction_methods"]["pdfplumber"] = {
                "success": False,
                "error": str(e)
            }
        
        return debug_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing PDF extraction: {str(e)}")

@router.get("/debug/pdf-ocr/{filename}", response_model=DebugExtractionResponse)
async def debug_pdf_ocr_extraction(filename: str):
    """
    Test OCR extraction on a specific PDF.
    """
    file_path = os.path.join(DOCS_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File {filename} not found")
    
    if not filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        file_size = int(get_file_size_mb(file_path) * 1024 * 1024)
        
        debug_info = {
            "filename": filename,
            "file_size_mb": get_file_size_mb(file_path),
            "extraction_methods": {}
        }
        
        # Test all three extraction methods
        try:
            pypdf2_text = extract_with_pypdf2(file_path, file_size)
            debug_info["extraction_methods"]["pypdf2"] = {
                "success": True,
                "text_length": len(pypdf2_text),
                "has_text": len(pypdf2_text.strip()) > 100,
                "preview": pypdf2_text[:300] + "..." if len(pypdf2_text) > 300 else pypdf2_text
            }
        except Exception as e:
            debug_info["extraction_methods"]["pypdf2"] = {
                "success": False,
                "error": str(e)
            }
        
        try:
            pdfplumber_text = extract_with_pdfplumber(file_path, file_size)
            debug_info["extraction_methods"]["pdfplumber"] = {
                "success": True,
                "text_length": len(pdfplumber_text),
                "has_text": len(pdfplumber_text.strip()) > 50,
                "preview": pdfplumber_text[:300] + "..." if len(pdfplumber_text) > 300 else pdfplumber_text
            }
        except Exception as e:
            debug_info["extraction_methods"]["pdfplumber"] = {
                "success": False,
                "error": str(e)
            }
        
        # Test OCR extraction
        try:
            ocr_text = extract_with_ocr(file_path, file_size)
            debug_info["extraction_methods"]["ocr"] = {
                "success": True,
                "text_length": len(ocr_text),
                "has_text": len(ocr_text.strip()) > 50,
                "preview": ocr_text[:500] + "..." if len(ocr_text) > 500 else ocr_text
            }
        except Exception as e:
            debug_info["extraction_methods"]["ocr"] = {
                "success": False,
                "error": str(e)
            }
        
        return debug_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing PDF extraction: {str(e)}")
