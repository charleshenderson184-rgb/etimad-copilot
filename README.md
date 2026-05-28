# Etimad Copilot — مساعد المنافسات

AI-powered government tender compliance analysis for KSA's Etimad platform.

Upload an RFP PDF (Arabic, English, or mixed) and get an instant compliance matrix with every mandatory requirement extracted, classified, and gap-analyzed.

## Quick Start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your ANTHROPIC_API_KEY
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000 and upload a tender PDF.

## Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS
- **Backend:** Python, FastAPI, PyMuPDF, Tesseract OCR
- **AI:** Claude API (Anthropic) for requirement extraction and gap analysis
- **Database:** SQLite (MVP)
