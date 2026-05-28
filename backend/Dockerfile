# Etimad Copilot backend — production image
# Build: docker build -t etimad-backend ./backend
# Run:   docker run -p 8000:8000 --env-file .env etimad-backend

FROM python:3.11-slim AS base

# System dependencies:
# - tesseract-ocr + Arabic + English language packs (for OCR on scanned PDFs)
# - libgl1, libglib2.0-0 — required by some PyMuPDF / image libs
# - poppler-utils — used as a fallback for PDF rendering
# - build-essential for any wheels that need to compile (psycopg2 wants this on slim)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-ara \
        tesseract-ocr-eng \
        libgl1 \
        libglib2.0-0 \
        poppler-utils \
        build-essential \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (cached layer)
COPY requirements.txt ./
RUN pip install -r requirements.txt

# App code
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY scripts ./scripts

# Uploads & runtime dirs
RUN mkdir -p /app/uploads/company_docs
ENV UPLOAD_DIR=/app/uploads

# Health check — Railway / Fly will hit this
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:${PORT:-8000}/health || exit 1

EXPOSE 8000

# Run migrations on startup, then serve.
# Railway/Fly inject $PORT; respect it.
CMD ["sh", "-c", "python scripts/bootstrap_db.py && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
