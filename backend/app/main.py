import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlmodel import Session, SQLModel, create_engine, select

from .analyzer import analyze_gaps, extract_metadata, extract_requirements
from .auth import CurrentUser, CurrentUserOptional
from .activity import log as log_activity, router as activity_router
from .billing import router as billing_router
from .comments import router as comments_router
from . import storage
from .teams import router as teams_router, _ensure_personal_team
from .config import settings
from .email import send_deadline_alert, send_proposal_ready, send_status_won, send_welcome
from .document_export import render_proposal_to_docx, render_proposal_to_pdf
from .document_parser import is_supported, parse_document
from .discovery import match_tender
from .models import (
    CompanyDocument,
    CompanyDocumentResponse,
    CompanyProfile,
    CompanyProfileCreate,
    CompanyProfileResponse,
    DiscoveredTender,
    DiscoveredTenderCreate,
    DiscoveredTenderResponse,
    Proposal,
    ProposalResponse,
    ProposalReview,
    ProposalReviewCreate,
    ProposalReviewResponse,
    ProposalSection,
    WinTheme,
    WinThemeCreate,
    WinThemeResponse,
    Requirement,
    RequirementResponse,
    RFP,
    RFPResponse,
    RFPUpdate,
    User,
    UserResponse,
)
from .pdf_processor import (
    detect_document_language,
    extract_text_from_pdf,
    get_full_text,
)
from .proposal_generator import (
    generate_executive_summary,
    generate_financial_proposal,
    generate_technical_proposal,
    summarize_company_document,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Etimad Copilot API", version="0.2.0")

# CORS — explicit origins from env. Defaults safe for local dev.
# Set CORS_ORIGINS to a comma-separated list of exact origins in production
# (e.g. "https://app.example.com,https://www.example.com").
# CORS_ORIGIN_REGEX lets you allow ephemeral Vercel preview URLs:
#   CORS_ORIGIN_REGEX=https://etimad-.*\.vercel\.app
_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()]
_origin_regex = os.getenv("CORS_ORIGIN_REGEX")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stripe billing — checkout, webhook, customer portal
app.include_router(billing_router)

# Multi-user teams — members, invites, role management
app.include_router(teams_router)

# Activity log — audit trail
app.include_router(activity_router)

# Comments + Notifications
app.include_router(comments_router)

engine = create_engine(settings.database_url, echo=False)


@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(os.path.join(settings.upload_dir, "company_docs"), exist_ok=True)


# ─── Health checks ──────────────────────────────────────────

@app.get("/health")
def health():
    """Lightweight liveness probe for Railway/Fly/k8s. No DB hit."""
    return {"status": "ok"}


@app.get("/health/ready")
def health_ready():
    """Readiness probe — verifies the DB is reachable."""
    try:
        with Session(engine) as session:
            session.exec(select(User).limit(1)).first()
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB not ready: {e}")


# ─── Current user ────────────────────────────────────────────

def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        company_name=user.company_name,
        plan=user.plan,
        plan_status=user.plan_status,
        trial_ends_at=user.trial_ends_at,
        plan_renews_at=user.plan_renews_at,
        rfps_this_period=user.rfps_this_period,
        proposals_this_period=user.proposals_this_period,
        period_resets_at=user.period_resets_at,
        created_at=user.created_at,
    )


@app.get("/api/me", response_model=UserResponse)
async def get_me(user: User = CurrentUser):
    """Returns the current authenticated user. 401 if not logged in."""
    return _user_to_response(user)


# ─── RFP Processing ──────────────────────────────────────────

async def process_rfp(rfp_id: str, storage_key: str):
    try:
        with storage.open_path(storage_key) as pdf_path:
            pages = extract_text_from_pdf(pdf_path)
        full_text = get_full_text(pages)
        doc_language = detect_document_language(pages)

        with Session(engine) as session:
            rfp = session.get(RFP, rfp_id)
            rfp.page_count = len(pages)
            rfp.language = doc_language
            rfp.raw_text = full_text
            session.add(rfp)
            session.commit()

        # Extract top-level metadata (title, buyer, deadline)
        try:
            metadata = await extract_metadata(full_text)
            with Session(engine) as session:
                rfp = session.get(RFP, rfp_id)
                rfp.title = metadata.get("title")
                rfp.title_ar = metadata.get("title_ar")
                rfp.buyer = metadata.get("buyer")
                deadline_str = metadata.get("submission_deadline")
                if deadline_str:
                    try:
                        rfp.submission_deadline = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
                    except (ValueError, AttributeError):
                        pass
                est_value = metadata.get("estimated_value_sar")
                if est_value:
                    try:
                        rfp.estimated_value_sar = float(est_value)
                    except (TypeError, ValueError):
                        pass
                session.add(rfp)
                session.commit()
        except Exception:
            logger.warning("Metadata extraction failed for %s, continuing", rfp_id)

        raw_requirements = await extract_requirements(full_text)
        requirements_with_gaps = await analyze_gaps(raw_requirements)

        with Session(engine) as session:
            for req_data in requirements_with_gaps:
                req = Requirement(
                    rfp_id=rfp_id,
                    requirement_text=req_data.get("requirement_text", ""),
                    requirement_text_en=req_data.get("requirement_text_en"),
                    category=req_data.get("category", "technical"),
                    is_mandatory=req_data.get("is_mandatory", True),
                    source_page=req_data.get("source_page"),
                    scoring_weight=req_data.get("scoring_weight"),
                    compliance_status="pending",
                    notes=req_data.get("notes"),
                )
                session.add(req)

            rfp = session.get(RFP, rfp_id)
            rfp.status = "completed"
            session.add(rfp)
            session.commit()

    except Exception as e:
        logger.exception("Failed to process RFP %s", rfp_id)
        with Session(engine) as session:
            rfp = session.get(RFP, rfp_id)
            if rfp:
                rfp.status = "error"
                rfp.error_message = str(e)
                session.add(rfp)
                session.commit()


def _team_id_for(session: Session, user: User) -> str:
    """Returns the team_id scope for the current user, lazy-provisioning if needed."""
    team = _ensure_personal_team(session, user)
    return team.id


def _require_owned_rfp(session: Session, rfp_id: str, user: User) -> RFP:
    """Loads an RFP and verifies it belongs to the current user's team. 404 otherwise."""
    rfp = session.get(RFP, rfp_id)
    if not rfp:
        raise HTTPException(status_code=404, detail="RFP not found")
    team_id = _team_id_for(session, user)
    # Team-scoped access: any teammate can see RFPs in their team
    if rfp.team_id and rfp.team_id != team_id:
        raise HTTPException(status_code=404, detail="RFP not found")
    # Legacy unscoped rows: only the creator can see them
    if not rfp.team_id and rfp.user_id and rfp.user_id != user.id:
        raise HTTPException(status_code=404, detail="RFP not found")
    return rfp


@app.post("/api/rfp/upload", response_model=RFPResponse)
async def upload_rfp(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    user: User = CurrentUser,
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted for RFPs")

    content = await file.read()
    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_file_size_mb}MB limit")

    rfp_id = str(uuid.uuid4())
    pdf_key = storage.rfp_pdf_key(rfp_id)
    storage.save_bytes(pdf_key, content, content_type="application/pdf")

    with Session(engine) as session:
        team_id = _team_id_for(session, user)
        rfp = RFP(id=rfp_id, filename=file.filename, user_id=user.id, team_id=team_id)
        session.add(rfp)
        # Bump usage counter
        u = session.get(User, user.id)
        u.rfps_this_period = (u.rfps_this_period or 0) + 1
        session.add(u)
        session.commit()
        session.refresh(rfp)
        log_activity(
            session,
            team_id=team_id,
            actor=user,
            action="rfp.uploaded",
            entity_type="rfp",
            entity_id=rfp.id,
            entity_label=file.filename,
        )

    background_tasks.add_task(process_rfp, rfp_id, pdf_key)

    with Session(engine) as session:
        rfp_fresh = session.get(RFP, rfp_id)
        return _rfp_to_response(session, rfp_fresh)


def _rfp_to_response(session: Session, rfp: RFP) -> RFPResponse:
    req_count = len(
        session.exec(select(Requirement).where(Requirement.rfp_id == rfp.id)).all()
    )
    prop_count = len(
        session.exec(select(Proposal).where(Proposal.rfp_id == rfp.id)).all()
    )
    return RFPResponse(
        id=rfp.id,
        filename=rfp.filename,
        upload_time=rfp.upload_time,
        status=rfp.status,
        page_count=rfp.page_count,
        language=rfp.language,
        error_message=rfp.error_message,
        requirement_count=req_count,
        title=rfp.title,
        title_ar=rfp.title_ar,
        buyer=rfp.buyer,
        submission_deadline=rfp.submission_deadline,
        estimated_value_sar=rfp.estimated_value_sar,
        tender_status=rfp.tender_status,
        proposal_count=prop_count,
    )


@app.get("/api/rfps", response_model=list[RFPResponse])
async def list_rfps(
    status: Optional[str] = None,
    tender_status: Optional[str] = None,
    user: User = CurrentUser,
):
    """List all RFPs visible to the current user's team, newest first."""
    with Session(engine) as session:
        team_id = _team_id_for(session, user)
        # Team rows + legacy rows owned by this user (pre-migration)
        query = (
            select(RFP)
            .where(
                ((RFP.team_id == team_id))
                | ((RFP.team_id == None) & (RFP.user_id == user.id))  # noqa: E711
            )
            .order_by(RFP.upload_time.desc())
        )
        if status:
            query = query.where(RFP.status == status)
        if tender_status:
            query = query.where(RFP.tender_status == tender_status)
        rfps = session.exec(query).all()
        return [_rfp_to_response(session, r) for r in rfps]


@app.get("/api/rfp/{rfp_id}", response_model=RFPResponse)
async def get_rfp(rfp_id: str, user: User = CurrentUser):
    with Session(engine) as session:
        rfp = _require_owned_rfp(session, rfp_id, user)
        return _rfp_to_response(session, rfp)


@app.patch("/api/rfp/{rfp_id}", response_model=RFPResponse)
async def update_rfp(rfp_id: str, payload: RFPUpdate, user: User = CurrentUser):
    """Update editable RFP metadata (title, buyer, deadline, tender status)."""
    with Session(engine) as session:
        rfp = _require_owned_rfp(session, rfp_id, user)
        prev_status = rfp.tender_status
        for field, value in payload.dict(exclude_unset=True).items():
            setattr(rfp, field, value)
        session.add(rfp)
        session.commit()
        session.refresh(rfp)

        if prev_status != rfp.tender_status and rfp.team_id:
            log_activity(
                session,
                team_id=rfp.team_id,
                actor=user,
                action=f"rfp.status_changed.{rfp.tender_status}",
                entity_type="rfp",
                entity_id=rfp.id,
                entity_label=rfp.title or rfp.filename,
                extra={"from": prev_status, "to": rfp.tender_status},
            )

        # Email side-effect: transitioned to won
        if prev_status != "won" and rfp.tender_status == "won" and user.email:
            try:
                send_status_won(
                    to=user.email,
                    name=user.name or user.email,
                    rfp_title=rfp.title or rfp.filename,
                    value_sar=rfp.estimated_value_sar,
                )
            except Exception:
                logger.exception("Failed to send status_won email")

        return _rfp_to_response(session, rfp)


@app.delete("/api/rfp/{rfp_id}")
async def delete_rfp(rfp_id: str, user: User = CurrentUser):
    with Session(engine) as session:
        rfp = _require_owned_rfp(session, rfp_id, user)
        for req in session.exec(select(Requirement).where(Requirement.rfp_id == rfp_id)).all():
            session.delete(req)
        for prop in session.exec(select(Proposal).where(Proposal.rfp_id == rfp_id)).all():
            for sec in session.exec(select(ProposalSection).where(ProposalSection.proposal_id == prop.id)).all():
                session.delete(sec)
            session.delete(prop)
        session.delete(rfp)
        session.commit()
    # Best-effort: drop the stored PDF too
    storage.delete(storage.rfp_pdf_key(rfp_id))
    return {"status": "deleted"}


@app.get("/api/rfp/{rfp_id}/requirements", response_model=list[RequirementResponse])
async def get_requirements(rfp_id: str):
    with Session(engine) as session:
        rfp = session.get(RFP, rfp_id)
        if not rfp:
            raise HTTPException(status_code=404, detail="RFP not found")

        requirements = session.exec(
            select(Requirement).where(Requirement.rfp_id == rfp_id)
        ).all()

        return [
            RequirementResponse(
                id=r.id,
                requirement_text=r.requirement_text,
                requirement_text_en=r.requirement_text_en,
                category=r.category,
                is_mandatory=r.is_mandatory,
                source_page=r.source_page,
                scoring_weight=r.scoring_weight,
                compliance_status=r.compliance_status,
                notes=r.notes,
            )
            for r in requirements
        ]


@app.patch("/api/rfp/{rfp_id}/requirements/{req_id}")
async def update_requirement(rfp_id: str, req_id: str, compliance_status: str, notes: Optional[str] = None):
    valid_statuses = {"pending", "compliant", "gap", "unclear"}
    if compliance_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")

    with Session(engine) as session:
        req = session.get(Requirement, req_id)
        if not req or req.rfp_id != rfp_id:
            raise HTTPException(status_code=404, detail="Requirement not found")

        req.compliance_status = compliance_status
        if notes is not None:
            req.notes = notes
        session.add(req)
        session.commit()

    return {"status": "updated"}


# ─── Company Profile ────────────────────────────────────────

@app.post("/api/profile", response_model=CompanyProfileResponse)
async def create_or_update_profile(payload: CompanyProfileCreate, user: User = CurrentUser):
    with Session(engine) as session:
        team_id = _team_id_for(session, user)
        existing = session.exec(
            select(CompanyProfile).where(
                (CompanyProfile.team_id == team_id)
                | ((CompanyProfile.team_id == None) & (CompanyProfile.user_id == user.id))  # noqa: E711
            )
        ).first()

        if existing:
            for field, value in payload.dict(exclude_unset=True).items():
                setattr(existing, field, value)
            existing.updated_at = datetime.now(timezone.utc)
            # Heal legacy rows missing team_id
            if not existing.team_id:
                existing.team_id = team_id
            profile = existing
        else:
            profile = CompanyProfile(**payload.dict(), user_id=user.id, team_id=team_id)

        session.add(profile)
        session.commit()
        session.refresh(profile)

        doc_count = len(
            session.exec(select(CompanyDocument).where(CompanyDocument.profile_id == profile.id)).all()
        )

        return CompanyProfileResponse(
            **profile.dict(),
            document_count=doc_count,
        )


@app.get("/api/profile", response_model=Optional[CompanyProfileResponse])
async def get_profile(user: User = CurrentUser):
    with Session(engine) as session:
        team_id = _team_id_for(session, user)
        profile = session.exec(
            select(CompanyProfile).where(
                (CompanyProfile.team_id == team_id)
                | ((CompanyProfile.team_id == None) & (CompanyProfile.user_id == user.id))  # noqa: E711
            )
        ).first()
        if not profile:
            return None

        doc_count = len(
            session.exec(select(CompanyDocument).where(CompanyDocument.profile_id == profile.id)).all()
        )

        return CompanyProfileResponse(
            **profile.dict(),
            document_count=doc_count,
        )


async def process_company_document(doc_id: str, storage_key: str, doc_type: str):
    try:
        with storage.open_path(storage_key) as file_path:
            parsed = parse_document(file_path)
        summary = await summarize_company_document(parsed.full_text, doc_type)

        with Session(engine) as session:
            doc = session.get(CompanyDocument, doc_id)
            doc.extracted_text = parsed.full_text
            doc.summary = summary
            session.add(doc)
            session.commit()
    except Exception as e:
        logger.exception("Failed to process company document %s", doc_id)


@app.post("/api/profile/documents", response_model=CompanyDocumentResponse)
async def upload_company_document(
    file: UploadFile,
    document_type: str,
    background_tasks: BackgroundTasks,
):
    if not file.filename or not is_supported(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Allowed: PDF, DOCX, XLSX, PNG, JPG, TXT",
        )

    valid_doc_types = {"past_proposal", "capability_statement", "cv", "certificate", "other"}
    if document_type not in valid_doc_types:
        raise HTTPException(status_code=400, detail=f"document_type must be one of: {valid_doc_types}")

    content = await file.read()
    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_file_size_mb}MB limit")

    with Session(engine) as session:
        profile = session.exec(select(CompanyProfile)).first()
        if not profile:
            raise HTTPException(status_code=400, detail="Create a company profile first")

        doc_id = str(uuid.uuid4())
        ext = os.path.splitext(file.filename)[1]
        doc_key = storage.company_doc_key(doc_id, ext)
        storage.save_bytes(doc_key, content)

        from .document_parser import get_file_type
        doc = CompanyDocument(
            id=doc_id,
            profile_id=profile.id,
            filename=file.filename,
            document_type=document_type,
            file_type=get_file_type(file.filename),
        )
        session.add(doc)
        session.commit()
        session.refresh(doc)

        background_tasks.add_task(process_company_document, doc_id, doc_key, document_type)

        return CompanyDocumentResponse(
            id=doc.id,
            filename=doc.filename,
            document_type=doc.document_type,
            file_type=doc.file_type,
            summary=doc.summary,
            upload_time=doc.upload_time,
        )


@app.get("/api/profile/documents", response_model=list[CompanyDocumentResponse])
async def list_company_documents():
    with Session(engine) as session:
        profile = session.exec(select(CompanyProfile)).first()
        if not profile:
            return []

        docs = session.exec(
            select(CompanyDocument).where(CompanyDocument.profile_id == profile.id)
        ).all()

        return [
            CompanyDocumentResponse(
                id=d.id,
                filename=d.filename,
                document_type=d.document_type,
                file_type=d.file_type,
                summary=d.summary,
                upload_time=d.upload_time,
            )
            for d in docs
        ]


@app.delete("/api/profile/documents/{doc_id}")
async def delete_company_document(doc_id: str):
    with Session(engine) as session:
        doc = session.get(CompanyDocument, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        session.delete(doc)
        session.commit()
    return {"status": "deleted"}


# ─── Proposal Generation ────────────────────────────────────

def _proposal_to_response(proposal: Proposal, section_count: int = 0) -> ProposalResponse:
    return ProposalResponse(
        id=proposal.id,
        rfp_id=proposal.rfp_id,
        status=proposal.status,
        language=proposal.language,
        executive_summary_en=proposal.executive_summary_en,
        executive_summary_ar=proposal.executive_summary_ar,
        technical_proposal_en=proposal.technical_proposal_en,
        technical_proposal_ar=proposal.technical_proposal_ar,
        financial_proposal_en=proposal.financial_proposal_en,
        financial_proposal_ar=proposal.financial_proposal_ar,
        executive_summary=proposal.executive_summary,
        technical_proposal=proposal.technical_proposal,
        financial_proposal=proposal.financial_proposal,
        pricing_data=proposal.pricing_data,
        error_message=proposal.error_message,
        created_at=proposal.created_at,
        completed_at=proposal.completed_at,
        section_count=section_count,
    )


async def generate_proposal_task(proposal_id: str):
    """Generates a complete proposal as TWO separate documents — one English, one Arabic.

    KSA government tenders require both as distinct, standalone documents. We call
    Claude separately for each language and store them in their own fields.
    """
    try:
        with Session(engine) as session:
            proposal = session.get(Proposal, proposal_id)
            rfp = session.get(RFP, proposal.rfp_id)
            requirements = session.exec(
                select(Requirement).where(Requirement.rfp_id == rfp.id)
            ).all()
            profile = session.exec(select(CompanyProfile)).first()
            documents = session.exec(
                select(CompanyDocument).where(
                    CompanyDocument.profile_id == profile.id if profile else None
                )
            ).all() if profile else []

            rfp_summary = (rfp.raw_text or "")[:10000]
            req_dicts = [r.dict() for r in requirements]
            profile_dict = profile.dict() if profile else None
            doc_dicts = [d.dict() for d in documents]
            requested = proposal.language or "bilingual"

        # Which languages to produce
        languages: list[str] = (
            ["en", "ar"] if requested in ("bilingual", "both") else [requested]
        )

        # ─── Executive summary (per language) ─────────────
        for lang in languages:
            content = await generate_executive_summary(
                rfp_summary, req_dicts, profile_dict, doc_dicts, lang
            )
            with Session(engine) as session:
                proposal = session.get(Proposal, proposal_id)
                if lang == "en":
                    proposal.executive_summary_en = content
                else:
                    proposal.executive_summary_ar = content
                # Legacy mirror — keep the first language populated for backwards compat
                if not proposal.executive_summary:
                    proposal.executive_summary = content
                session.add(proposal)
                session.commit()

        # ─── Technical proposal (per language) ────────────
        for lang in languages:
            content = await generate_technical_proposal(
                rfp_summary, req_dicts, profile_dict, doc_dicts, lang
            )
            with Session(engine) as session:
                proposal = session.get(Proposal, proposal_id)
                if lang == "en":
                    proposal.technical_proposal_en = content
                else:
                    proposal.technical_proposal_ar = content
                if not proposal.technical_proposal:
                    proposal.technical_proposal = content
                session.add(proposal)
                session.commit()

        # ─── Financial proposal (per language) ────────────
        for lang in languages:
            content, pricing = await generate_financial_proposal(
                rfp_summary, req_dicts, profile_dict, lang
            )
            with Session(engine) as session:
                proposal = session.get(Proposal, proposal_id)
                if lang == "en":
                    proposal.financial_proposal_en = content
                else:
                    proposal.financial_proposal_ar = content
                if not proposal.financial_proposal:
                    proposal.financial_proposal = content
                # Pricing JSON is language-neutral — only set once (English run)
                if pricing and not proposal.pricing_data:
                    proposal.pricing_data = json.dumps(pricing, ensure_ascii=False)
                session.add(proposal)
                session.commit()

        with Session(engine) as session:
            proposal = session.get(Proposal, proposal_id)
            proposal.status = "completed"
            proposal.completed_at = datetime.now(timezone.utc)
            session.add(proposal)
            session.commit()

            # Send "proposal ready" email to the owner + log activity
            try:
                rfp = session.get(RFP, proposal.rfp_id)
                owner = session.get(User, rfp.user_id) if rfp and rfp.user_id else None
                if rfp and rfp.team_id:
                    log_activity(
                        session,
                        team_id=rfp.team_id,
                        actor=owner,
                        action="proposal.generated",
                        entity_type="proposal",
                        entity_id=proposal.id,
                        entity_label=rfp.title or rfp.filename,
                        extra={"language": proposal.language, "rfp_id": rfp.id},
                    )
                if owner and owner.email:
                    send_proposal_ready(
                        to=owner.email,
                        rfp_title=rfp.title or rfp.filename,
                        proposal_id=proposal.id,
                    )
            except Exception:
                logger.exception("Failed to send proposal-ready email or log activity")

    except Exception as e:
        logger.exception("Failed to generate proposal %s", proposal_id)
        with Session(engine) as session:
            proposal = session.get(Proposal, proposal_id)
            if proposal:
                proposal.status = "error"
                proposal.error_message = str(e)
                session.add(proposal)
                session.commit()


@app.post("/api/rfp/{rfp_id}/proposal", response_model=ProposalResponse)
async def create_proposal(rfp_id: str, background_tasks: BackgroundTasks, language: str = "bilingual"):
    if language not in {"ar", "en", "bilingual"}:
        raise HTTPException(status_code=400, detail="language must be ar, en, or bilingual")

    with Session(engine) as session:
        rfp = session.get(RFP, rfp_id)
        if not rfp:
            raise HTTPException(status_code=404, detail="RFP not found")
        if rfp.status != "completed":
            raise HTTPException(status_code=400, detail="RFP analysis must be complete before generating a proposal")

        profile = session.exec(select(CompanyProfile)).first()

        proposal = Proposal(
            rfp_id=rfp_id,
            profile_id=profile.id if profile else None,
            language=language,
            status="generating",
        )
        session.add(proposal)
        session.commit()
        session.refresh(proposal)

        background_tasks.add_task(generate_proposal_task, proposal.id)

        return _proposal_to_response(proposal)


@app.get("/api/proposal/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(proposal_id: str):
    with Session(engine) as session:
        proposal = session.get(Proposal, proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        section_count = len(
            session.exec(select(ProposalSection).where(ProposalSection.proposal_id == proposal_id)).all()
        )

        return _proposal_to_response(proposal, section_count)


async def regenerate_section_task(proposal_id: str, section: str, language: str = "both"):
    """Regenerate one section. By default regenerates BOTH languages."""
    try:
        with Session(engine) as session:
            proposal = session.get(Proposal, proposal_id)
            rfp = session.get(RFP, proposal.rfp_id)
            requirements = session.exec(
                select(Requirement).where(Requirement.rfp_id == rfp.id)
            ).all()
            profile = session.exec(select(CompanyProfile)).first()
            documents = (
                session.exec(
                    select(CompanyDocument).where(CompanyDocument.profile_id == profile.id)
                ).all()
                if profile
                else []
            )

            rfp_summary = (rfp.raw_text or "")[:10000]
            req_dicts = [r.dict() for r in requirements]
            profile_dict = profile.dict() if profile else None
            doc_dicts = [d.dict() for d in documents]

        langs = ["en", "ar"] if language in ("both", "bilingual") else [language]

        for lang in langs:
            if section == "executive":
                content = await generate_executive_summary(
                    rfp_summary, req_dicts, profile_dict, doc_dicts, lang
                )
                with Session(engine) as session:
                    proposal = session.get(Proposal, proposal_id)
                    if lang == "en":
                        proposal.executive_summary_en = content
                    else:
                        proposal.executive_summary_ar = content
                    proposal.executive_summary = content  # legacy mirror
                    session.add(proposal)
                    session.commit()
            elif section == "technical":
                content = await generate_technical_proposal(
                    rfp_summary, req_dicts, profile_dict, doc_dicts, lang
                )
                with Session(engine) as session:
                    proposal = session.get(Proposal, proposal_id)
                    if lang == "en":
                        proposal.technical_proposal_en = content
                    else:
                        proposal.technical_proposal_ar = content
                    proposal.technical_proposal = content
                    session.add(proposal)
                    session.commit()
            elif section == "financial":
                content, pricing = await generate_financial_proposal(
                    rfp_summary, req_dicts, profile_dict, lang
                )
                with Session(engine) as session:
                    proposal = session.get(Proposal, proposal_id)
                    if lang == "en":
                        proposal.financial_proposal_en = content
                    else:
                        proposal.financial_proposal_ar = content
                    proposal.financial_proposal = content
                    if pricing and lang == "en":
                        proposal.pricing_data = json.dumps(pricing, ensure_ascii=False)
                    session.add(proposal)
                    session.commit()
            else:
                raise ValueError(f"Unknown section: {section}")

        with Session(engine) as session:
            proposal = session.get(Proposal, proposal_id)
            proposal.status = "completed"
            session.add(proposal)
            session.commit()

    except Exception as e:
        logger.exception("Failed to regenerate %s for proposal %s", section, proposal_id)
        with Session(engine) as session:
            proposal = session.get(Proposal, proposal_id)
            if proposal:
                proposal.status = "error"
                proposal.error_message = str(e)
                session.add(proposal)
                session.commit()


@app.post("/api/proposal/{proposal_id}/regenerate", response_model=ProposalResponse)
async def regenerate_section(
    proposal_id: str,
    section: str,
    background_tasks: BackgroundTasks,
    language: str = "both",
):
    """Regenerate a single section. language=both regenerates EN + AR (default)."""
    valid_sections = {"executive", "technical", "financial"}
    if section not in valid_sections:
        raise HTTPException(
            status_code=400,
            detail=f"section must be one of: {sorted(valid_sections)}",
        )
    if language not in {"en", "ar", "both", "bilingual"}:
        raise HTTPException(
            status_code=400, detail="language must be en, ar, or both"
        )

    with Session(engine) as session:
        proposal = session.get(Proposal, proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        # Clear the section(s) being regenerated and mark proposal as generating
        proposal.status = "generating"
        clear_langs = ["en", "ar"] if language in ("both", "bilingual") else [language]
        for lang in clear_langs:
            if section == "executive":
                if lang == "en":
                    proposal.executive_summary_en = None
                else:
                    proposal.executive_summary_ar = None
            elif section == "technical":
                if lang == "en":
                    proposal.technical_proposal_en = None
                else:
                    proposal.technical_proposal_ar = None
            elif section == "financial":
                if lang == "en":
                    proposal.financial_proposal_en = None
                else:
                    proposal.financial_proposal_ar = None
                if lang == "en":
                    proposal.pricing_data = None
        session.add(proposal)
        session.commit()
        session.refresh(proposal)

        background_tasks.add_task(regenerate_section_task, proposal_id, section, language)

        section_count = len(
            session.exec(select(ProposalSection).where(ProposalSection.proposal_id == proposal_id)).all()
        )

        return _proposal_to_response(proposal, section_count)


@app.get("/api/proposal/{proposal_id}/download")
async def download_proposal(proposal_id: str, format: str = "docx", language: str = "en"):
    if format not in {"docx", "pdf"}:
        raise HTTPException(status_code=400, detail="format must be docx or pdf")

    with Session(engine) as session:
        proposal = session.get(Proposal, proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        if proposal.status != "completed":
            raise HTTPException(status_code=400, detail="Proposal is not ready yet")

        rfp = session.get(RFP, proposal.rfp_id)
        profile = session.exec(select(CompanyProfile)).first()

    company_name = profile.company_name if profile else "Your Company"
    rfp_filename = rfp.filename if rfp else "RFP"

    if language not in {"en", "ar"}:
        raise HTTPException(status_code=400, detail="language must be 'en' or 'ar'")

    # Choose the right language-specific fields, fall back to legacy if missing
    if language == "en":
        exec_text = proposal.executive_summary_en or proposal.executive_summary
        tech_text = proposal.technical_proposal_en or proposal.technical_proposal
        fin_text = proposal.financial_proposal_en or proposal.financial_proposal
    else:
        exec_text = proposal.executive_summary_ar or proposal.executive_summary
        tech_text = proposal.technical_proposal_ar or proposal.technical_proposal
        fin_text = proposal.financial_proposal_ar or proposal.financial_proposal

    docx_bytes = render_proposal_to_docx(
        company_name=company_name,
        rfp_filename=rfp_filename,
        executive_summary=exec_text,
        technical_proposal=tech_text,
        financial_proposal=fin_text,
        language=language,
    )

    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in (rfp_filename.rsplit(".", 1)[0]))[:80]
    lang_suffix = "EN" if language == "en" else "AR"

    if format == "pdf":
        pdf_bytes = render_proposal_to_pdf(docx_bytes)
        if pdf_bytes is None:
            raise HTTPException(
                status_code=503,
                detail="PDF conversion unavailable (docx2pdf requires LibreOffice or MS Word). Download as DOCX instead.",
            )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Proposal_{lang_suffix}_{safe_name}.pdf"',
            },
        )

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="Proposal_{lang_suffix}_{safe_name}.docx"',
        },
    )


@app.get("/api/rfp/{rfp_id}/proposals", response_model=list[ProposalResponse])
async def list_proposals(rfp_id: str):
    with Session(engine) as session:
        proposals = session.exec(
            select(Proposal).where(Proposal.rfp_id == rfp_id)
        ).all()

        return [_proposal_to_response(p) for p in proposals]


# ─── Color Team Reviews ───────────────────────────────────

VALID_TEAMS = {"blue", "pink", "red", "gold"}
VALID_REVIEW_STATUSES = {"not_started", "in_progress", "passed", "failed"}


def _review_to_response(review: ProposalReview) -> ProposalReviewResponse:
    overall = None
    if review.scores:
        try:
            scores = json.loads(review.scores)
            nums = [v for v in scores.values() if isinstance(v, (int, float))]
            if nums:
                overall = round(sum(nums) / len(nums), 2)
        except json.JSONDecodeError:
            pass
    return ProposalReviewResponse(
        id=review.id,
        proposal_id=review.proposal_id,
        team_color=review.team_color,
        status=review.status,
        reviewer_name=review.reviewer_name,
        reviewer_email=review.reviewer_email,
        scores=review.scores,
        notes=review.notes,
        recommendation=review.recommendation,
        win_probability=review.win_probability,
        created_at=review.created_at,
        completed_at=review.completed_at,
        overall_score=overall,
    )


@app.get("/api/proposal/{proposal_id}/reviews", response_model=list[ProposalReviewResponse])
async def list_reviews(proposal_id: str):
    with Session(engine) as session:
        reviews = session.exec(
            select(ProposalReview).where(ProposalReview.proposal_id == proposal_id)
        ).all()
        # Order: blue, pink, red, gold
        order = {"blue": 0, "pink": 1, "red": 2, "gold": 3}
        reviews.sort(key=lambda r: order.get(r.team_color, 99))
        return [_review_to_response(r) for r in reviews]


@app.post("/api/proposal/{proposal_id}/reviews", response_model=ProposalReviewResponse)
async def create_review(proposal_id: str, payload: ProposalReviewCreate):
    if payload.team_color not in VALID_TEAMS:
        raise HTTPException(
            status_code=400, detail=f"team_color must be one of: {sorted(VALID_TEAMS)}"
        )
    with Session(engine) as session:
        proposal = session.get(Proposal, proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        review = ProposalReview(
            proposal_id=proposal_id,
            **payload.dict(),
        )
        session.add(review)
        session.commit()
        session.refresh(review)
        return _review_to_response(review)


@app.patch("/api/proposal/{proposal_id}/reviews/{review_id}", response_model=ProposalReviewResponse)
async def update_review(proposal_id: str, review_id: str, payload: ProposalReviewCreate):
    with Session(engine) as session:
        review = session.get(ProposalReview, review_id)
        if not review or review.proposal_id != proposal_id:
            raise HTTPException(status_code=404, detail="Review not found")
        update_data = payload.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(review, field, value)
        if review.status in {"passed", "failed"} and not review.completed_at:
            review.completed_at = datetime.now(timezone.utc)
        session.add(review)
        session.commit()
        session.refresh(review)
        return _review_to_response(review)


@app.delete("/api/proposal/{proposal_id}/reviews/{review_id}")
async def delete_review(proposal_id: str, review_id: str):
    with Session(engine) as session:
        review = session.get(ProposalReview, review_id)
        if not review or review.proposal_id != proposal_id:
            raise HTTPException(status_code=404, detail="Review not found")
        session.delete(review)
        session.commit()
    return {"status": "deleted"}


# ─── Win Themes / Discriminators / Ghost Themes ──────

VALID_THEME_TYPES = {"win_theme", "discriminator", "ghost"}


def _theme_to_response(t: WinTheme) -> WinThemeResponse:
    return WinThemeResponse(
        id=t.id,
        proposal_id=t.proposal_id,
        theme_type=t.theme_type,
        title=t.title,
        description=t.description,
        evidence=t.evidence,
        order_index=t.order_index,
        created_at=t.created_at,
    )


@app.get("/api/proposal/{proposal_id}/themes", response_model=list[WinThemeResponse])
async def list_themes(proposal_id: str):
    with Session(engine) as session:
        themes = session.exec(
            select(WinTheme)
            .where(WinTheme.proposal_id == proposal_id)
            .order_by(WinTheme.theme_type, WinTheme.order_index)
        ).all()
        return [_theme_to_response(t) for t in themes]


@app.post("/api/proposal/{proposal_id}/themes", response_model=WinThemeResponse)
async def create_theme(proposal_id: str, payload: WinThemeCreate):
    if payload.theme_type not in VALID_THEME_TYPES:
        raise HTTPException(
            status_code=400, detail=f"theme_type must be one of: {sorted(VALID_THEME_TYPES)}"
        )
    with Session(engine) as session:
        proposal = session.get(Proposal, proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        theme = WinTheme(proposal_id=proposal_id, **payload.dict())
        session.add(theme)
        session.commit()
        session.refresh(theme)
        return _theme_to_response(theme)


@app.patch("/api/proposal/{proposal_id}/themes/{theme_id}", response_model=WinThemeResponse)
async def update_theme(proposal_id: str, theme_id: str, payload: WinThemeCreate):
    with Session(engine) as session:
        theme = session.get(WinTheme, theme_id)
        if not theme or theme.proposal_id != proposal_id:
            raise HTTPException(status_code=404, detail="Theme not found")
        for field, value in payload.dict(exclude_unset=True).items():
            setattr(theme, field, value)
        session.add(theme)
        session.commit()
        session.refresh(theme)
        return _theme_to_response(theme)


@app.delete("/api/proposal/{proposal_id}/themes/{theme_id}")
async def delete_theme(proposal_id: str, theme_id: str):
    with Session(engine) as session:
        theme = session.get(WinTheme, theme_id)
        if not theme or theme.proposal_id != proposal_id:
            raise HTTPException(status_code=404, detail="Theme not found")
        session.delete(theme)
        session.commit()
    return {"status": "deleted"}


# ─── Tender Discovery ──────────────────────────────────────

def _discovered_to_response(
    tender: DiscoveredTender, profile: Optional[CompanyProfile]
) -> DiscoveredTenderResponse:
    match = match_tender(tender, profile)
    days_left = None
    if tender.submission_deadline:
        dl = tender.submission_deadline
        if dl.tzinfo is None:
            dl = dl.replace(tzinfo=timezone.utc)
        days_left = (dl - datetime.now(timezone.utc)).days
    return DiscoveredTenderResponse(
        id=tender.id,
        source=tender.source,
        external_id=tender.external_id,
        title=tender.title,
        title_ar=tender.title_ar,
        buyer=tender.buyer,
        buyer_ar=tender.buyer_ar,
        industry=tender.industry,
        description=tender.description,
        estimated_value_sar=tender.estimated_value_sar,
        submission_deadline=tender.submission_deadline,
        published_date=tender.published_date,
        source_url=tender.source_url,
        lcgpa_min_score=tender.lcgpa_min_score,
        saudization_min=tender.saudization_min,
        discovered_at=tender.discovered_at,
        dismissed=tender.dismissed,
        saved_as_rfp_id=tender.saved_as_rfp_id,
        added_by=tender.added_by,
        notes=tender.notes,
        match_score=match.score,
        match_reasons=match.reasons,
        days_until_deadline=days_left,
    )


@app.get("/api/discover", response_model=list[DiscoveredTenderResponse])
async def list_discovered(
    min_score: int = 0,
    include_dismissed: bool = False,
    include_saved: bool = False,
    limit: int = 50,
):
    """List discovered tenders ranked by match score against the company profile."""
    with Session(engine) as session:
        profile = session.exec(select(CompanyProfile)).first()

        query = select(DiscoveredTender)
        if not include_dismissed:
            query = query.where(DiscoveredTender.dismissed == False)  # noqa: E712
        if not include_saved:
            query = query.where(DiscoveredTender.saved_as_rfp_id == None)  # noqa: E711

        tenders = session.exec(query).all()
        responses = [_discovered_to_response(t, profile) for t in tenders]

    responses = [r for r in responses if r.match_score >= min_score]
    responses.sort(key=lambda r: (-r.match_score, r.days_until_deadline or 9999))
    return responses[:limit]


@app.get("/api/discover/{tender_id}", response_model=DiscoveredTenderResponse)
async def get_discovered(tender_id: str):
    with Session(engine) as session:
        tender = session.get(DiscoveredTender, tender_id)
        if not tender:
            raise HTTPException(status_code=404, detail="Tender not found")
        profile = session.exec(select(CompanyProfile)).first()
        return _discovered_to_response(tender, profile)


@app.post("/api/discover/manual", response_model=DiscoveredTenderResponse)
async def add_manual_tender(payload: DiscoveredTenderCreate):
    """Manually add a tender (user-paste or admin curator). Legally clean alternative to scraping."""
    valid_sources = {"manual", "user_paste", "curator", "admin"}
    if payload.source not in valid_sources:
        raise HTTPException(
            status_code=400,
            detail=f"source must be one of: {sorted(valid_sources)}",
        )

    with Session(engine) as session:
        # Check for existing tender by external_id to avoid duplicates
        if payload.external_id:
            existing = session.exec(
                select(DiscoveredTender).where(
                    DiscoveredTender.external_id == payload.external_id
                )
            ).first()
            if existing:
                raise HTTPException(
                    status_code=409,
                    detail=f"Tender with external_id {payload.external_id} already exists",
                )

        tender = DiscoveredTender(
            **payload.dict(),
            discovered_at=datetime.now(timezone.utc),
        )
        session.add(tender)
        session.commit()
        session.refresh(tender)

        profile = session.exec(select(CompanyProfile)).first()
        return _discovered_to_response(tender, profile)


@app.post("/api/discover/{tender_id}/save", response_model=RFPResponse)
async def save_discovered_as_rfp(tender_id: str):
    """Convert a discovered tender into an RFP entry in the user's pipeline."""
    with Session(engine) as session:
        tender = session.get(DiscoveredTender, tender_id)
        if not tender:
            raise HTTPException(status_code=404, detail="Tender not found")
        if tender.saved_as_rfp_id:
            existing = session.get(RFP, tender.saved_as_rfp_id)
            if existing:
                return _rfp_to_response(session, existing)

        rfp = RFP(
            filename=f"{tender.source}_{tender.external_id or tender.id[:8]}.pdf",
            status="completed",  # No PDF analysis done yet — placeholder
            title=tender.title,
            title_ar=tender.title_ar,
            buyer=tender.buyer,
            submission_deadline=tender.submission_deadline,
            estimated_value_sar=tender.estimated_value_sar,
            tender_status="draft",
        )
        session.add(rfp)
        session.commit()
        session.refresh(rfp)

        tender.saved_as_rfp_id = rfp.id
        session.add(tender)
        session.commit()

        return _rfp_to_response(session, rfp)


@app.post("/api/discover/{tender_id}/dismiss")
async def dismiss_discovered(tender_id: str):
    with Session(engine) as session:
        tender = session.get(DiscoveredTender, tender_id)
        if not tender:
            raise HTTPException(status_code=404, detail="Tender not found")
        tender.dismissed = True
        session.add(tender)
        session.commit()
    return {"status": "dismissed"}


@app.post("/api/discover/{tender_id}/restore")
async def restore_discovered(tender_id: str):
    with Session(engine) as session:
        tender = session.get(DiscoveredTender, tender_id)
        if not tender:
            raise HTTPException(status_code=404, detail="Tender not found")
        tender.dismissed = False
        session.add(tender)
        session.commit()
    return {"status": "restored"}


@app.post("/api/admin/scrape-etimad")
async def trigger_etimad_scrape(max_pages: int = 3):
    """Manually trigger an Etimad scrape. Requires ETIMAD_SCRAPER_ENABLED=true."""
    if not settings.etimad_scraper_enabled:
        raise HTTPException(
            status_code=403,
            detail=(
                "Etimad scraper disabled. Set ETIMAD_SCRAPER_ENABLED=true in env "
                "after reviewing Etimad ToS."
            ),
        )
    from .etimad_scraper import EtimadScraper

    scraper = EtimadScraper()
    result = await scraper.run(max_pages=max_pages)
    return {
        "summary": result.summary(),
        "listings_seen": result.listings_seen,
        "new_tenders": result.new_tenders,
        "updated_tenders": result.updated_tenders,
        "requests_made": result.requests_made,
        "errors": result.errors,
    }


@app.get("/api/admin/scraper-status")
async def scraper_status():
    return {
        "enabled": settings.etimad_scraper_enabled,
        "base_url": settings.etimad_base_url,
        "request_delay_s": settings.etimad_request_delay_s,
        "max_requests_per_run": settings.etimad_max_requests_per_run,
        "respect_robots": settings.etimad_respect_robots,
        "user_agent": settings.etimad_user_agent,
    }


# ─── PDF page rendering ─────────────────────────────────────

@app.get("/api/rfp/{rfp_id}/page/{page_num}.png")
async def render_rfp_page(rfp_id: str, page_num: int, dpi: int = 144):
    """Render a single PDF page of an RFP as PNG. Used by the compliance-matrix
    slide-out to show the source page for a requirement."""
    if dpi < 72 or dpi > 300:
        raise HTTPException(status_code=400, detail="dpi must be 72-300")

    pdf_key = storage.rfp_pdf_key(rfp_id)
    if not storage.exists(pdf_key):
        raise HTTPException(status_code=404, detail="PDF not available for this RFP")

    try:
        import fitz  # PyMuPDF
        with storage.open_path(pdf_key) as pdf_path:
            doc = fitz.open(pdf_path)
            try:
                if page_num < 1 or page_num > doc.page_count:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Page {page_num} out of range (1-{doc.page_count})",
                    )
                page = doc.load_page(page_num - 1)
                # Scale matrix so the rendered PNG hits the requested DPI
                zoom = dpi / 72
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                png_bytes = pix.tobytes("png")
            finally:
                doc.close()

        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Disposition": f'inline; filename="rfp_{rfp_id}_p{page_num}.png"',
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to render page %d for RFP %s", page_num, rfp_id)
        raise HTTPException(status_code=500, detail=f"Render failed: {e}")


# ─── Health ─────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.2.0"}
