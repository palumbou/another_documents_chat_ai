"""
Text processing and chunking utilities.
"""

import re
from typing import List, Dict

def split_content_intelligently(content: str, chunk_size: int) -> List[str]:
    """
    Split content into chunks at intelligent breakpoints (sentences, paragraphs).
    """
    if len(content) <= chunk_size:
        return [content]
    
    chunks = []
    current_chunk = ""
    
    # Split by paragraphs first (double newlines)
    paragraphs = content.split('\n\n')
    
    for paragraph in paragraphs:
        # If adding this paragraph would exceed chunk size
        if len(current_chunk) + len(paragraph) + 2 > chunk_size:
            if current_chunk:
                # Save current chunk
                chunks.append(current_chunk.strip())
                current_chunk = ""
            
            # If single paragraph is too large, split by sentences
            if len(paragraph) > chunk_size:
                sentences = split_by_sentences(paragraph)
                temp_chunk = ""
                
                for sentence in sentences:
                    if len(temp_chunk) + len(sentence) + 1 > chunk_size:
                        if temp_chunk:
                            chunks.append(temp_chunk.strip())
                            temp_chunk = ""
                        
                        # If single sentence is too large, split by words
                        if len(sentence) > chunk_size:
                            word_chunks = split_by_words(sentence, chunk_size)
                            chunks.extend(word_chunks)
                        else:
                            temp_chunk = sentence
                    else:
                        temp_chunk += (" " if temp_chunk else "") + sentence
                
                if temp_chunk:
                    current_chunk = temp_chunk
            else:
                current_chunk = paragraph
        else:
            # Add paragraph to current chunk
            current_chunk += ("\n\n" if current_chunk else "") + paragraph
    
    # Add remaining content
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def split_by_sentences(text: str) -> List[str]:
    """Split text by sentences using regex."""
    # Split on sentence endings but keep the delimiter
    sentences = re.split(r'([.!?]+\s+)', text)
    result = []
    
    for i in range(0, len(sentences) - 1, 2):
        sentence = sentences[i]
        if i + 1 < len(sentences):
            sentence += sentences[i + 1]
        if sentence.strip():
            result.append(sentence.strip())
    
    return result

def split_by_words(text: str, max_size: int) -> List[str]:
    """Split text by words when other methods fail."""
    words = text.split()
    chunks = []
    current_chunk = ""
    
    for word in words:
        if len(current_chunk) + len(word) + 1 > max_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""
        
        current_chunk += (" " if current_chunk else "") + word
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def clean_text(text: str) -> str:
    """Clean and normalize text content."""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    
    # Remove control characters except newlines and tabs
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    
    return text.strip()

def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
    """Extract potential keywords from text for better search relevance."""
    # Remove common stop words and extract meaningful words
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
        'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    }
    
    # Extract words, normalize case, filter
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    keywords = [word for word in words if word not in stop_words]
    
    # Count frequency and return most common
    from collections import Counter
    word_counts = Counter(keywords)
    
    return [word for word, count in word_counts.most_common(max_keywords)]

def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calculate simple text similarity based on common words."""
    words1 = set(re.findall(r'\b\w+\b', text1.lower()))
    words2 = set(re.findall(r'\b\w+\b', text2.lower()))
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    return len(intersection) / len(union) if union else 0.0
