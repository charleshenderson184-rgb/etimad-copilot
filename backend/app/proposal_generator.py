"""Generates technical and financial proposal sections using prompt caching.

Architecture:
  All 6 proposal calls (3 sections × 2 languages) share the same input context:
    RFP summary + Company profile + Requirements + Company knowledge.

  We put that shared context in the SYSTEM block with cache_control so Anthropic
  caches it. Per-call cost = ~10% of input + full output. With 6 calls per
  proposal, total input cost drops ~75-85%.

  Cache TTL is 5 minutes (ephemeral). All 6 calls complete in ~60-120s so
  they all hit the cache after the first write.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import anthropic

from .config import settings

logger = logging.getLogger(__name__)


# ─── Section instructions (small, per-call, NOT cached) ────────

EXECUTIVE_INSTRUCTIONS = """Write a compelling **executive summary** (300–500 words) for this tender response.

The summary must:
- Open with a strong value proposition matched to the buyer's stated needs
- Reference the project objectives explicitly
- Highlight the company's most relevant capabilities and past wins
- Emphasize compliance with mandatory criteria (especially LCGPA, Saudization)
- Close with a confident commitment statement

Return ONLY the executive summary text in the target language, formatted in Markdown.
No preamble, no translation, no other language."""


TECHNICAL_INSTRUCTIONS = """Generate a complete **technical proposal** that responds to every technical, LCGPA, legal, and administrative requirement.

Structure with these sections (use Markdown headings):

## 1. Understanding of Requirements
Restate the buyer's needs in your own words, demonstrating deep comprehension.

## 2. Proposed Approach
Step-by-step methodology for delivering the work.

## 3. Compliance with Mandatory Requirements
For EVERY mandatory requirement in the context, provide a direct response showing how the company complies. Use a "Requirement → Response" format. Reference specific company capabilities, certifications, or past experience.

## 4. Project Team and Saudization
Describe the proposed team structure, key personnel, and Saudization percentage commitment.

## 5. LCGPA Local Content Commitment
Explicitly address local content (المحتوى المحلي) — sourcing, hiring, and value creation in KSA.

## 6. Delivery Timeline and Milestones
Realistic schedule aligned with any deadlines.

## 7. Quality Assurance and Risk Management
How you'll ensure quality and mitigate risks.

## 8. Past Performance
Reference 2–3 most relevant past projects from the company knowledge base.

Be thorough — every mandatory requirement must have a clear response. Return only Markdown in the target language."""


FINANCIAL_INSTRUCTIONS = """Generate a complete **financial proposal** with structured pricing.

Structure:

## 1. Pricing Summary
Total bid amount in SAR, broken into key cost categories.

## 2. Detailed Cost Breakdown
Markdown table with columns: Item / Description / Quantity / Unit Price (SAR) / Total (SAR).
Each commercial requirement from the context must be addressed. Note any assumptions clearly.

## 3. Payment Terms
Proposed payment schedule aligned with the RFP.

## 4. Validity Period
Bid validity (typically 90–120 days for Saudi government tenders).

## 5. Bid Bond / Financial Guarantee
Confirm capacity to provide the required bid bond (typically 1–2% of bid value).

## 6. Assumptions and Exclusions
Clearly list any assumptions made in pricing and what is explicitly excluded.

Also return a structured JSON pricing object at the very end inside a ```json``` code block with this shape:
{
  "total_sar": number,
  "currency": "SAR",
  "line_items": [
    {"description": str, "quantity": number, "unit_price": number, "total": number}
  ],
  "payment_terms": str,
  "validity_days": number,
  "bid_bond_pct": number
}

Return the financial proposal in Markdown in the target language."""


# ─── Language blocks ───────────────────────────────────

LANGUAGE_INSTRUCTIONS = {
    "en": (
        "Write the entire document in **professional business English** suitable for a "
        "Saudi government tender. Do not include Arabic translations or transliterations. "
        "Use English headings, English tables, English numerals."
    ),
    "ar": (
        "اكتب الوثيقة بالكامل باللغة العربية الفصحى المعيارية الحديثة المناسبة لتقديمها "
        "لجهة حكومية سعودية. لا تضمّن أي ترجمات إنجليزية أو حروف لاتينية. استخدم "
        "العناوين والجداول والأرقام باللغة العربية. اكتب من اليمين إلى اليسار."
    ),
}

LANGUAGE_LABELS = {
    "en": "English",
    "ar": "Arabic (العربية)",
}


# ─── Helpers ───────────────────────────────────────────

def _format_requirements(requirements: list[dict], category_filter: Optional[list[str]] = None) -> str:
    lines: list[str] = []
    for r in requirements:
        if category_filter and r.get("category") not in category_filter:
            continue
        marker = "[MANDATORY]" if r.get("is_mandatory") else "[Optional]"
        cat = r.get("category", "general").upper()
        text = r.get("requirement_text", "")
        text_en = r.get("requirement_text_en")
        weight = r.get("scoring_weight")
        notes = r.get("notes")

        line = f"- {marker} [{cat}] {text}"
        if text_en and text_en != text:
            line += f"\n  EN: {text_en}"
        if weight:
            line += f"\n  Weight: {weight}%"
        if notes:
            line += f"\n  Notes: {notes}"
        lines.append(line)

    return "\n".join(lines) if lines else "(No requirements in this category)"


def _format_company_profile(profile: Optional[dict]) -> str:
    if not profile:
        return "(No company profile provided — generate a generic but credible response.)"

    fields = []
    if profile.get("company_name"):
        fields.append(f"Name: {profile['company_name']}")
    if profile.get("company_name_ar"):
        fields.append(f"Name (AR): {profile['company_name_ar']}")
    if profile.get("description"):
        fields.append(f"Description: {profile['description']}")
    if profile.get("services"):
        fields.append(f"Services: {profile['services']}")
    if profile.get("industries"):
        fields.append(f"Industries: {profile['industries']}")
    if profile.get("team_size"):
        fields.append(f"Team Size: {profile['team_size']}")
    if profile.get("saudization_pct") is not None:
        fields.append(f"Saudization: {profile['saudization_pct']}%")
    if profile.get("cr_number"):
        fields.append(f"CR Number: {profile['cr_number']}")
    if profile.get("lcgpa_certificate"):
        fields.append(f"LCGPA Certificate: {profile['lcgpa_certificate']}")
    if profile.get("iso_certifications"):
        fields.append(f"ISO Certifications: {profile['iso_certifications']}")
    if profile.get("saudi_address"):
        fields.append(f"Saudi Office: {profile['saudi_address']}")

    return "\n".join(fields)


def _format_company_knowledge(documents: list[dict]) -> str:
    if not documents:
        return "(No prior company documents uploaded.)"

    sections: list[str] = []
    for doc in documents[:10]:
        title = f"### {doc.get('filename')} ({doc.get('document_type', 'document')})"
        summary = doc.get("summary") or (doc.get("extracted_text") or "")[:2000]
        sections.append(f"{title}\n{summary}")

    return "\n\n".join(sections)


def build_shared_context(
    rfp_summary: str,
    requirements: list[dict],
    company_profile: Optional[dict],
    company_documents: list[dict],
) -> str:
    """Builds the shared context block that's CACHED across all 6 generation calls."""
    return f"""You are an expert Saudi government tender proposal writer with 15+ years of experience drafting bids for KSA ministries and agencies. You know LCGPA scoring, Saudization rules, Etimad submission requirements, and the formal register expected by KSA government evaluators in both Arabic and English.

# RFP Document Summary
{rfp_summary[:10000]}

# All Extracted Requirements
{_format_requirements(requirements)[:18000]}

# Company Profile
{_format_company_profile(company_profile)}

# Company Knowledge Base (past wins, capabilities, certifications, team)
{_format_company_knowledge(company_documents)}
"""


# ─── Unified generator with caching ───────────────────

async def _generate_cached(
    shared_context: str,
    section_instructions: str,
    language: str,
    max_tokens: int = 8192,
) -> str:
    """Single Claude call with prompt caching.

    The shared_context is cached (cache_control ephemeral). The user message
    is the per-call section instructions + target language — these change
    per call but are tiny (~200 tokens).
    """
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    lang = language if language in LANGUAGE_INSTRUCTIONS else "en"
    lang_label = LANGUAGE_LABELS[lang]
    lang_block = LANGUAGE_INSTRUCTIONS[lang]

    user_message = f"""**Target language: {lang_label}**

{lang_block}

---

**Your task:**

{section_instructions}"""

    try:
        response = await client.messages.create(
            model=settings.claude_model,
            max_tokens=max_tokens,
            system=[
                {
                    "type": "text",
                    "text": shared_context,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_message}],
        )

        # Log cache stats for observability
        usage = getattr(response, "usage", None)
        if usage:
            cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
            cache_write = getattr(usage, "cache_creation_input_tokens", 0) or 0
            regular_in = getattr(usage, "input_tokens", 0) or 0
            out = getattr(usage, "output_tokens", 0) or 0
            logger.info(
                "Claude usage — in: %d, cache_read: %d, cache_write: %d, out: %d",
                regular_in, cache_read, cache_write, out,
            )

        return response.content[0].text.strip()
    except anthropic.APIError as e:
        # Fall back gracefully without caching if the model rejects the cache block
        logger.warning("Cached call failed (%s) — retrying without cache_control", e)
        response = await client.messages.create(
            model=settings.claude_model,
            max_tokens=max_tokens,
            system=shared_context,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text.strip()


# ─── Public API — same signatures as before ───────────

async def generate_executive_summary(
    rfp_summary: str,
    requirements: list[dict],
    company_profile: Optional[dict],
    company_documents: list[dict],
    language: str = "en",
) -> str:
    shared = build_shared_context(rfp_summary, requirements, company_profile, company_documents)
    return await _generate_cached(shared, EXECUTIVE_INSTRUCTIONS, language, max_tokens=2048)


async def generate_technical_proposal(
    rfp_summary: str,
    requirements: list[dict],
    company_profile: Optional[dict],
    company_documents: list[dict],
    language: str = "en",
) -> str:
    shared = build_shared_context(rfp_summary, requirements, company_profile, company_documents)
    return await _generate_cached(shared, TECHNICAL_INSTRUCTIONS, language, max_tokens=8192)


async def generate_financial_proposal(
    rfp_summary: str,
    requirements: list[dict],
    company_profile: Optional[dict],
    language: str = "en",
) -> tuple[str, Optional[dict]]:
    """Financial proposal — also extracts the JSON pricing block at the end."""
    # Financial uses an empty documents list (knowledge less relevant for pricing)
    shared = build_shared_context(rfp_summary, requirements, company_profile, [])
    text = await _generate_cached(shared, FINANCIAL_INSTRUCTIONS, language, max_tokens=4096)

    # Extract structured pricing JSON if present
    pricing_data: Optional[dict] = None
    if "```json" in text:
        try:
            json_block = text.split("```json", 1)[1].split("```", 1)[0].strip()
            pricing_data = json.loads(json_block)
        except (json.JSONDecodeError, IndexError):
            logger.warning("Failed to parse pricing JSON from financial proposal")

    return text, pricing_data


# ─── Document summarization (separate flow, no caching needed) ───

async def summarize_company_document(text: str, document_type: str) -> str:
    """Generate a short summary of an uploaded company document for retrieval."""
    if len(text) < 500:
        return text

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    prompt = f"""Summarize this {document_type} document in 200–400 words.
Focus on capabilities, project scope, technologies, team roles, results, certifications, or any facts that would be useful when writing future tender proposals.

Document:
{text[:15000]}

Return only the summary, no preamble."""

    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    return response.content[0].text.strip()
