FROM python:3.10-slim

# Accept build arguments for user/group IDs
ARG USER_ID=1000
ARG GROUP_ID=1000

WORKDIR /app

# Install system dependencies for OCR and PDF processing
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-ita \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Create user with specified UID/GID
RUN groupadd -g ${GROUP_ID} appuser && \
    useradd -u ${USER_ID} -g ${GROUP_ID} -d /app -s /bin/bash appuser

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Ensure app directory and subdirectories have correct ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port and start app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]