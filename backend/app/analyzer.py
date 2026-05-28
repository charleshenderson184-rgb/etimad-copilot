from __future__ import annotations

import json
import logging

import anthropic

from .config import settings

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """You are an expert in Saudi Arabian government procurement (Etimad/منافسات platform).

Analyze this RFP document and extract ALL requirements. For each requirement, provide:

1. requirement_text: The exact requirement text (in original language)
2. requirement_text_en: English translation (if original is Arabic)
3. category: One of: technical, commercial, legal, lcgpa, administrative
4. is_mandatory: true if this is a mandatory/disqualifying requirement
5. source_page: Page number where this requirement appears
6. scoring_weight: Scoring weight if mentioned (null otherwise)
7. notes: Any important context — deadlines, specific formats required, disqualification risks

Pay special attention to:
- LCGPA (هيئة المحتوى المحلي) local content requirements and scoring
- Saudization (توطين) workforce percentage requirements
- Submission deadlines and required document formats
- Financial guarantee / bid bond requirements
- Technical qualification minimums
- Disqualifying criteria (items that cause automatic rejection)

Return a JSON array of requirements. Nothing else — no markdown, no explanation.

Example format:
[
  {
    "requirement_text": "يجب أن يكون لدى المتقدم شهادة ISO 9001",
    "requirement_text_en": "Applicant must hold ISO 9001 certification",
    "category": "technical",
    "is_mandatory": true,
    "source_page": 3,
    "scoring_weight": null,
    "notes": "Disqualifying if not provided. Must be valid and issued within the last 3 years."
  }
]

RFP Document:
{document_text}"""

METADATA_PROMPT = """You are an expert in Saudi government procurement.

Read this RFP and extract its top-level metadata as a JSON object with these fields:

- title: The tender title in English (translate if Arabic-only)
- title_ar: The tender title in Arabic (translate if English-only)
- buyer: The contracting entity (ministry, agency, or organization name) in English
- submission_deadline: The bid submission deadline as ISO 8601 datetime (YYYY-MM-DDTHH:MM:SS). null if not found
- estimated_value_sar: Estimated tender value in SAR if mentioned, as a number. null if not found

Return ONLY the JSON object, no markdown, no explanation. Use null for missing fields.

RFP Document:
{document_text}"""


GAP_ANALYSIS_PROMPT = """You are an expert Saudi procurement advisor. Review these extracted requirements and flag risks.

For each requirement, assess:
1. Is the requirement clear and unambiguous?
2. Are there hidden dependencies or prerequisites?
3. What is the disqualification risk (high/medium/low)?
4. What common mistakes do bidders make on this type of requirement?

Update the notes field with your gap analysis. Return the updated JSON array.

Requirements:
{requirements_json}"""


async def extract_metadata(document_text: str) -> dict:
    """Extract RFP-level metadata: title, buyer, deadline, value."""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    prompt = METADATA_PROMPT.replace("{document_text}", document_text[:30000])

    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Failed to parse metadata JSON: %s", text[:200])
        return {}


async def extract_requirements(document_text: str) -> list[dict]:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    prompt = EXTRACTION_PROMPT.replace("{document_text}", document_text[:100000])

    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=8192,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        requirements = json.loads(text)
    except json.JSONDecodeError:
        logger.error("Failed to parse Claude response as JSON: %s", text[:500])
        raise ValueError("Failed to parse requirements from RFP. The document may be too complex or unclear.")

    return requirements


async def analyze_gaps(requirements: list[dict]) -> list[dict]:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    prompt = GAP_ANALYSIS_PROMPT.replace("{requirements_json}", json.dumps(requirements, ensure_ascii=False))

    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=8192,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        updated = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Gap analysis parse failed, returning original requirements")
        return requirements

    return updated
