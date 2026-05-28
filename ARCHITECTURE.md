# Etimad Copilot — Architecture

## Overview

A tool that ingests KSA government tender (RFP) PDFs from Etimad (منافسات), extracts every mandatory requirement, and generates a structured compliance matrix. MVP scope: **upload PDF → get compliance checklist.**

## System Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐
│   Next.js Frontend  │────▶│   FastAPI Backend         │
│   (Vercel)          │◀────│   (Railway)               │
│                     │     │                            │
│  - Upload PDF       │     │  - POST /api/rfp/upload    │
│  - View matrix      │     │  - POST /api/rfp/analyze   │
│  - Arabic/English   │     │  - GET  /api/rfp/{id}      │
│    RTL support      │     │                            │
└─────────────────────┘     │  ┌──────────────────────┐ │
                            │  │ PDF Processing        │ │
                            │  │ - PyMuPDF (text)      │ │
                            │  │ - Tesseract (OCR)     │ │
                            │  │ - Language detection   │ │
                            │  └──────────┬───────────┘ │
                            │             │              │
                            │  ┌──────────▼───────────┐ │
                            │  │ Claude API            │ │
                            │  │ - Requirement extract  │ │
                            │  │ - Classification       │ │
                            │  │ - Gap detection        │ │
                            │  └──────────────────────┘ │
                            │                            │
                            │  ┌──────────────────────┐ │
                            │  │ SQLite (MVP)          │ │
                            │  │ - RFPs + results      │ │
                            │  └──────────────────────┘ │
                            └──────────────────────────┘
```

## Tech Stack

### Frontend (Next.js on Vercel)
- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui** for components
- **RTL support** via `dir="rtl"` and Tailwind RTL plugin
- **React PDF viewer** for side-by-side RFP display

### Backend (FastAPI on Railway)
- **Python 3.12** + **FastAPI**
- **PyMuPDF (fitz)** — fast PDF text extraction
- **Tesseract OCR** via pytesseract — fallback for scanned PDFs
- **langdetect** — detect Arabic vs English sections
- **Anthropic Python SDK** — Claude API for requirement extraction
- **SQLite** via SQLModel — MVP database (swap to PostgreSQL later)

## Data Flow

### 1. PDF Upload
```
User drops PDF → Next.js uploads to /api/rfp/upload
→ Backend saves file, returns rfp_id
→ Triggers async processing
```

### 2. Text Extraction
```
PyMuPDF extracts text per page
→ If text is empty/sparse → Tesseract OCR (Arabic + English)
→ Language detection per section
→ Structured output: [{page, text, language, is_ocr}]
```

### 3. Compliance Matrix Generation
```
Extracted text → Claude API prompt
→ Extract: mandatory requirements, submission deadlines,
   disqualifying criteria, scoring weights, LCGPA requirements
→ Structured JSON output → stored in DB
```

### 4. Results Display
```
Frontend polls /api/rfp/{id} for status
→ On completion: render compliance matrix table
→ Columns: requirement, category, mandatory/optional,
   compliance status, notes, source page
```

## Database Schema (MVP)

```sql
-- RFP documents
CREATE TABLE rfps (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'processing', -- processing | completed | error
    page_count INTEGER,
    language TEXT, -- ar | en | mixed
    raw_text TEXT,
    error_message TEXT
);

-- Extracted requirements
CREATE TABLE requirements (
    id TEXT PRIMARY KEY,
    rfp_id TEXT REFERENCES rfps(id),
    requirement_text TEXT NOT NULL,
    requirement_text_en TEXT, -- English translation if original is Arabic
    category TEXT, -- technical | commercial | legal | lcgpa | administrative
    is_mandatory BOOLEAN DEFAULT TRUE,
    source_page INTEGER,
    scoring_weight REAL,
    compliance_status TEXT DEFAULT 'pending', -- pending | compliant | gap | unclear
    notes TEXT
);
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/rfp/upload` | Upload PDF, returns `rfp_id` |
| GET | `/api/rfp/{id}` | Get RFP status + results |
| POST | `/api/rfp/{id}/analyze` | Re-trigger analysis |
| GET | `/api/rfp/{id}/requirements` | Get compliance matrix |
| PATCH | `/api/rfp/{id}/requirements/{req_id}` | Update compliance status |
| GET | `/api/health` | Health check |

## Claude API Prompt Strategy

The extraction uses a two-pass approach:

**Pass 1 — Requirement Extraction:**
Send extracted text to Claude with instructions to identify every requirement, classify by category (technical/commercial/legal/LCGPA/administrative), mark mandatory vs optional, note scoring weights, and flag disqualifying criteria.

**Pass 2 — Gap Analysis:**
For each requirement, Claude assesses clarity and flags items that are ambiguous, contradictory, or likely to cause disqualification if missed.

Output format: structured JSON array matching the `requirements` table schema.

## Project Structure

```
etimad-copilot/
├── frontend/                 # Next.js app
│   ├── app/
│   │   ├── layout.tsx        # RTL-aware root layout
│   │   ├── page.tsx          # Landing/upload page
│   │   └── rfp/
│   │       └── [id]/
│   │           └── page.tsx  # Results view
│   ├── components/
│   │   ├── pdf-upload.tsx    # Drag-and-drop uploader
│   │   ├── compliance-matrix.tsx
│   │   └── requirement-row.tsx
│   ├── lib/
│   │   └── api.ts            # Backend API client
│   └── package.json
│
├── backend/                  # FastAPI app
│   ├── app/
│   │   ├── main.py           # FastAPI app + routes
│   │   ├── models.py         # SQLModel schemas
│   │   ├── pdf_processor.py  # PDF text extraction + OCR
│   │   ├── analyzer.py       # Claude API compliance extraction
│   │   └── config.py         # Settings
│   ├── requirements.txt
│   └── Dockerfile
│
├── CLAUDE.md
├── ARCHITECTURE.md
└── README.md
```

## Key Decisions

1. **SQLite for MVP** — No need for PostgreSQL yet. Single-file DB, zero config. Swap when you need concurrent writes or >10 users.

2. **PyMuPDF over pdfplumber** — Faster, handles Arabic text better, and works on scanned PDFs with Tesseract fallback.

3. **Two-pass Claude extraction** — First pass gets the requirements, second pass does gap analysis. Splitting keeps prompts focused and output quality high.

4. **Async processing** — PDF analysis takes 10-30 seconds. Upload returns immediately, frontend polls for completion.

5. **No auth for MVP** — Add Supabase Auth when you're ready for multi-tenant.

## Future (Post-MVP)

- LCGPA template auto-fill
- Proposal drafting (technical + commercial sections)
- Past-win library with RAG retrieval
- Multi-user with Supabase Auth
- PostgreSQL + pgvector for semantic search
- Etimad API integration (if available)
- Export to Word/PDF
