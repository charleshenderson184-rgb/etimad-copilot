import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


# ─── Users (identity + subscription state) ──────────────────

class Team(SQLModel, table=True):
    """A multi-user workspace. The billing entity owns this table, not individual users.

    Subscription state moves to the team — every member shares plan + usage caps.
    """
    __tablename__ = "teams"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    slug: str = Field(index=True, unique=True)
    owner_user_id: str = Field(foreign_key="users.id")
    # Subscription state lives here — every member inherits
    plan: str = "trial"
    plan_status: str = "active"
    stripe_customer_id: Optional[str] = Field(default=None, index=True)
    stripe_subscription_id: Optional[str] = None
    trial_ends_at: Optional[datetime] = None
    plan_renews_at: Optional[datetime] = None
    rfps_this_period: int = 0
    proposals_this_period: int = 0
    period_resets_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TeamMember(SQLModel, table=True):
    """User membership in a team with a role."""
    __tablename__ = "team_members"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    team_id: str = Field(foreign_key="teams.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    role: str = "editor"  # owner | admin | editor | viewer
    invited_by_user_id: Optional[str] = Field(default=None, foreign_key="users.id")
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TeamInvite(SQLModel, table=True):
    """Pending invite to join a team."""
    __tablename__ = "team_invites"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    team_id: str = Field(foreign_key="teams.id", index=True)
    email: str = Field(index=True)
    role: str = "editor"  # admin | editor | viewer
    token: str = Field(unique=True, index=True)
    invited_by_user_id: str = Field(foreign_key="users.id")
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class User(SQLModel, table=True):
    """The platform's user identity. Linked to Supabase auth via auth_provider_id.

    Note: subscription state has migrated to Team for multi-user support, but we
    keep the duplicate fields here for backwards compatibility with single-user
    flows during the team-rollout transition.
    """
    __tablename__ = "users"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    # Supabase auth.users.id (sub claim from JWT) — null until first login
    auth_provider_id: Optional[str] = Field(default=None, index=True)
    email: str = Field(index=True)
    name: Optional[str] = None
    company_name: Optional[str] = None

    # Current active team — defaults to user's own personal team
    current_team_id: Optional[str] = Field(default=None, foreign_key="teams.id")

    # Subscription state — driven by Stripe webhooks
    plan: str = "trial"  # trial | starter | growth | enterprise
    plan_status: str = "active"  # active | past_due | canceled | paused
    stripe_customer_id: Optional[str] = Field(default=None, index=True)
    stripe_subscription_id: Optional[str] = None
    trial_ends_at: Optional[datetime] = None
    plan_renews_at: Optional[datetime] = None

    # Usage counters (reset monthly via cron)
    rfps_this_period: int = 0
    proposals_this_period: int = 0
    period_resets_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login_at: Optional[datetime] = None


class UserResponse(SQLModel):
    id: str
    email: str
    name: Optional[str]
    company_name: Optional[str]
    plan: str
    plan_status: str
    trial_ends_at: Optional[datetime]
    plan_renews_at: Optional[datetime]
    rfps_this_period: int
    proposals_this_period: int
    period_resets_at: Optional[datetime]
    created_at: datetime
    current_team_id: Optional[str] = None


class TeamResponse(SQLModel):
    id: str
    name: str
    slug: str
    owner_user_id: str
    plan: str
    plan_status: str
    trial_ends_at: Optional[datetime]
    plan_renews_at: Optional[datetime]
    rfps_this_period: int
    proposals_this_period: int
    member_count: int = 0
    pending_invites: int = 0
    created_at: datetime


class TeamMemberResponse(SQLModel):
    id: str
    user_id: str
    email: str
    name: Optional[str]
    role: str
    joined_at: datetime
    is_current_user: bool = False


class TeamInviteResponse(SQLModel):
    id: str
    email: str
    role: str
    invited_by_user_id: str
    expires_at: datetime
    accepted_at: Optional[datetime]
    created_at: datetime


class TeamInviteCreate(SQLModel):
    email: str
    role: str = "editor"


# ─── RFP & Requirements ──────────────────────────────────────

class RFP(SQLModel, table=True):
    __tablename__ = "rfps"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    team_id: Optional[str] = Field(default=None, foreign_key="teams.id", index=True)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)  # creator
    filename: str
    upload_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = Field(default="processing")  # processing | completed | error
    page_count: Optional[int] = None
    language: Optional[str] = None  # ar | en | mixed
    raw_text: Optional[str] = None
    error_message: Optional[str] = None
    # Optional metadata extracted during analysis
    title: Optional[str] = None
    title_ar: Optional[str] = None
    buyer: Optional[str] = None  # e.g. "Ministry of Health"
    submission_deadline: Optional[datetime] = None
    estimated_value_sar: Optional[float] = None
    tender_status: str = Field(default="draft")  # draft | in_progress | submitted | won | lost

    requirements: list["Requirement"] = Relationship(back_populates="rfp")
    proposals: list["Proposal"] = Relationship(back_populates="rfp")


class Requirement(SQLModel, table=True):
    __tablename__ = "requirements"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    rfp_id: str = Field(foreign_key="rfps.id")
    requirement_text: str
    requirement_text_en: Optional[str] = None
    category: str = "technical"  # technical | commercial | legal | lcgpa | administrative
    is_mandatory: bool = True
    source_page: Optional[int] = None
    scoring_weight: Optional[float] = None
    compliance_status: str = "pending"  # pending | compliant | gap | unclear
    notes: Optional[str] = None

    rfp: Optional[RFP] = Relationship(back_populates="requirements")


# ─── Company Profile & Knowledge Base ───────────────────────

class CompanyProfile(SQLModel, table=True):
    __tablename__ = "company_profiles"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    team_id: Optional[str] = Field(default=None, foreign_key="teams.id", index=True, unique=True)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)  # creator
    company_name: str
    company_name_ar: Optional[str] = None
    description: Optional[str] = None
    services: Optional[str] = None  # JSON list of service offerings
    industries: Optional[str] = None  # JSON list of industries served
    team_size: Optional[int] = None
    saudization_pct: Optional[float] = None
    cr_number: Optional[str] = None  # Commercial Registration number
    vat_number: Optional[str] = None
    lcgpa_certificate: Optional[str] = None
    iso_certifications: Optional[str] = None  # JSON list
    saudi_address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    documents: list["CompanyDocument"] = Relationship(back_populates="profile")


class CompanyDocument(SQLModel, table=True):
    """Uploaded company documents (past proposals, capabilities, CVs, certificates)."""
    __tablename__ = "company_documents"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    profile_id: str = Field(foreign_key="company_profiles.id")
    filename: str
    document_type: str  # past_proposal | capability_statement | cv | certificate | other
    file_type: str  # pdf | docx | xlsx | image | text
    extracted_text: Optional[str] = None
    summary: Optional[str] = None  # AI-generated summary for retrieval
    upload_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    profile: Optional[CompanyProfile] = Relationship(back_populates="documents")


# ─── Proposals ──────────────────────────────────────────────

class DiscoveredTender(SQLModel, table=True):
    """A tender scraped or sourced from Etimad before the user has engaged with it.

    Note: discovered tenders are GLOBAL — every user sees the same pool, and matching
    is per-user (computed at query time using each user's company profile). Only the
    'dismissed' state is per-user; we'll add a join-table for that later.
    """
    __tablename__ = "discovered_tenders"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    source: str = "etimad"  # etimad | manual | user_paste | curator
    external_id: Optional[str] = None
    title: str
    title_ar: Optional[str] = None
    buyer: str
    buyer_ar: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    estimated_value_sar: Optional[float] = None
    submission_deadline: Optional[datetime] = None
    published_date: Optional[datetime] = None
    source_url: Optional[str] = None
    lcgpa_min_score: Optional[float] = None
    saudization_min: Optional[float] = None
    discovered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Manual entry tracking
    added_by: Optional[str] = None  # email or "admin" or "scraper"
    notes: Optional[str] = None  # operator's free-text notes
    # User actions
    dismissed: bool = False
    saved_as_rfp_id: Optional[str] = Field(default=None, foreign_key="rfps.id")


class Proposal(SQLModel, table=True):
    __tablename__ = "proposals"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    rfp_id: str = Field(foreign_key="rfps.id")
    profile_id: Optional[str] = Field(default=None, foreign_key="company_profiles.id")
    status: str = "generating"  # generating | completed | error
    language: str = "bilingual"  # ar | en | bilingual (always generate both for KSA tenders)

    # Separate English and Arabic outputs — KSA tenders require both as distinct documents
    executive_summary_en: Optional[str] = None
    executive_summary_ar: Optional[str] = None
    technical_proposal_en: Optional[str] = None
    technical_proposal_ar: Optional[str] = None
    financial_proposal_en: Optional[str] = None
    financial_proposal_ar: Optional[str] = None

    # Legacy fields (deprecated, kept for backwards compat)
    executive_summary: Optional[str] = None
    technical_proposal: Optional[str] = None
    financial_proposal: Optional[str] = None

    pricing_data: Optional[str] = None  # JSON pricing structure
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

    rfp: Optional[RFP] = Relationship(back_populates="proposals")
    sections: list["ProposalSection"] = Relationship(back_populates="proposal")


class ProposalSection(SQLModel, table=True):
    """A single section of a generated proposal, mapped to one or more requirements."""
    __tablename__ = "proposal_sections"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    proposal_id: str = Field(foreign_key="proposals.id")
    requirement_id: Optional[str] = Field(default=None, foreign_key="requirements.id")
    section_type: str  # executive_summary | technical | financial | compliance_matrix | annex
    heading: str
    heading_ar: Optional[str] = None
    content: str
    order_index: int = 0

    proposal: Optional[Proposal] = Relationship(back_populates="sections")


# ─── Color Team Reviews ───────────────────────────

class ProposalReview(SQLModel, table=True):
    """A color-team review gate (Blue / Pink / Red / Gold)."""
    __tablename__ = "proposal_reviews"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    proposal_id: str = Field(foreign_key="proposals.id")
    team_color: str  # blue | pink | red | gold
    status: str = "not_started"  # not_started | in_progress | passed | failed
    reviewer_name: Optional[str] = None
    reviewer_email: Optional[str] = None
    scores: Optional[str] = None  # JSON object {criterion: 1-5}
    notes: Optional[str] = None
    recommendation: Optional[str] = None  # bid | no_bid | bid_with_changes (Blue) | go | hold | rework (Gold)
    win_probability: Optional[int] = None  # 0-100 (Red team primary output)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None


class WinTheme(SQLModel, table=True):
    """Win themes, discriminators, and ghost themes — the persuasive spine of a proposal."""
    __tablename__ = "win_themes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    proposal_id: str = Field(foreign_key="proposals.id")
    theme_type: str  # win_theme | discriminator | ghost
    title: str
    description: Optional[str] = None
    evidence: Optional[str] = None  # supporting facts/proof points
    order_index: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ─── Comments + Notifications ───────────────────────────────

class Comment(SQLModel, table=True):
    __tablename__ = "comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    team_id: str = Field(foreign_key="teams.id", index=True)
    author_user_id: str = Field(foreign_key="users.id", index=True)
    target_type: str = Field(index=True)  # rfp | proposal | requirement
    target_id: str = Field(index=True)
    body: str  # plain text, with @email mentions inline
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    team_id: str = Field(foreign_key="teams.id", index=True)
    kind: str = Field(index=True)  # mention | comment | invite | proposal_ready
    title: str
    body: Optional[str] = None
    link_url: Optional[str] = None  # in-app link
    actor_user_id: Optional[str] = Field(default=None, foreign_key="users.id")
    actor_email: Optional[str] = None
    actor_name: Optional[str] = None
    source_type: Optional[str] = None  # comment | rfp | ...
    source_id: Optional[str] = None
    read_at: Optional[datetime] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)


class CommentResponse(SQLModel):
    id: str
    author_user_id: str
    author_email: Optional[str] = None
    author_name: Optional[str] = None
    target_type: str
    target_id: str
    body: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    mentioned_user_ids: list[str] = []


class CommentCreate(SQLModel):
    target_type: str  # rfp | proposal | requirement
    target_id: str
    body: str


class NotificationResponse(SQLModel):
    id: str
    kind: str
    title: str
    body: Optional[str] = None
    link_url: Optional[str] = None
    actor_email: Optional[str] = None
    actor_name: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime


# ─── Activity Log ───────────────────────────────────────────

class ActivityEvent(SQLModel, table=True):
    __tablename__ = "activity_events"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    team_id: str = Field(foreign_key="teams.id", index=True)
    actor_user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    actor_email: Optional[str] = None  # snapshot for display even if user is later removed
    actor_name: Optional[str] = None
    action: str = Field(index=True)  # e.g. "rfp.uploaded", "proposal.generated", "member.invited"
    entity_type: Optional[str] = Field(default=None, index=True)  # rfp | proposal | team | invite | member
    entity_id: Optional[str] = Field(default=None, index=True)
    entity_label: Optional[str] = None  # snapshot label (RFP title, member email, etc.)
    extra: Optional[str] = None  # JSON-encoded extra context
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)


class ActivityEventResponse(SQLModel):
    id: str
    actor_user_id: Optional[str]
    actor_email: Optional[str]
    actor_name: Optional[str]
    action: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    entity_label: Optional[str]
    extra: Optional[dict] = None
    created_at: datetime


# ─── Response Schemas ──────────────────────────────────────

class RFPResponse(SQLModel):
    id: str
    filename: str
    upload_time: datetime
    status: str
    page_count: Optional[int]
    language: Optional[str]
    error_message: Optional[str]
    requirement_count: int = 0
    title: Optional[str] = None
    title_ar: Optional[str] = None
    buyer: Optional[str] = None
    submission_deadline: Optional[datetime] = None
    estimated_value_sar: Optional[float] = None
    tender_status: str = "draft"
    proposal_count: int = 0


class RFPUpdate(SQLModel):
    title: Optional[str] = None
    title_ar: Optional[str] = None
    buyer: Optional[str] = None
    submission_deadline: Optional[datetime] = None
    estimated_value_sar: Optional[float] = None
    tender_status: Optional[str] = None


class RequirementResponse(SQLModel):
    id: str
    requirement_text: str
    requirement_text_en: Optional[str]
    category: str
    is_mandatory: bool
    source_page: Optional[int]
    scoring_weight: Optional[float]
    compliance_status: str
    notes: Optional[str]


class CompanyProfileResponse(SQLModel):
    id: str
    company_name: str
    company_name_ar: Optional[str]
    description: Optional[str]
    services: Optional[str]
    industries: Optional[str]
    team_size: Optional[int]
    saudization_pct: Optional[float]
    cr_number: Optional[str]
    vat_number: Optional[str]
    lcgpa_certificate: Optional[str]
    iso_certifications: Optional[str]
    saudi_address: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    document_count: int = 0


class CompanyProfileCreate(SQLModel):
    company_name: str
    company_name_ar: Optional[str] = None
    description: Optional[str] = None
    services: Optional[str] = None
    industries: Optional[str] = None
    team_size: Optional[int] = None
    saudization_pct: Optional[float] = None
    cr_number: Optional[str] = None
    vat_number: Optional[str] = None
    lcgpa_certificate: Optional[str] = None
    iso_certifications: Optional[str] = None
    saudi_address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


class ProposalResponse(SQLModel):
    id: str
    rfp_id: str
    status: str
    language: str
    # Separate language outputs
    executive_summary_en: Optional[str] = None
    executive_summary_ar: Optional[str] = None
    technical_proposal_en: Optional[str] = None
    technical_proposal_ar: Optional[str] = None
    financial_proposal_en: Optional[str] = None
    financial_proposal_ar: Optional[str] = None
    # Legacy aggregate fields (kept for older proposals)
    executive_summary: Optional[str] = None
    technical_proposal: Optional[str] = None
    financial_proposal: Optional[str] = None
    pricing_data: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    section_count: int = 0


class MatchReason(SQLModel):
    label: str
    score: int  # 0..N points contributing
    detail: Optional[str] = None


class DiscoveredTenderCreate(SQLModel):
    """Payload for manually adding a tender (user-paste or admin curator)."""
    title: str
    title_ar: Optional[str] = None
    buyer: str
    buyer_ar: Optional[str] = None
    source: str = "manual"  # manual | user_paste | curator
    external_id: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    estimated_value_sar: Optional[float] = None
    submission_deadline: Optional[datetime] = None
    source_url: Optional[str] = None
    lcgpa_min_score: Optional[float] = None
    saudization_min: Optional[float] = None
    added_by: Optional[str] = None
    notes: Optional[str] = None


class DiscoveredTenderResponse(SQLModel):
    id: str
    source: str
    external_id: Optional[str]
    title: str
    title_ar: Optional[str]
    buyer: str
    buyer_ar: Optional[str]
    industry: Optional[str]
    description: Optional[str]
    estimated_value_sar: Optional[float]
    submission_deadline: Optional[datetime]
    published_date: Optional[datetime]
    source_url: Optional[str]
    lcgpa_min_score: Optional[float]
    saudization_min: Optional[float]
    discovered_at: datetime
    dismissed: bool
    saved_as_rfp_id: Optional[str]
    added_by: Optional[str] = None
    notes: Optional[str] = None
    # Computed
    match_score: int = 0
    match_reasons: list[MatchReason] = []
    days_until_deadline: Optional[int] = None


class CompanyDocumentResponse(SQLModel):
    id: str
    filename: str
    document_type: str
    file_type: str
    summary: Optional[str]
    upload_time: datetime


# ─── Reviews + Themes response/create schemas ─────────

class ProposalReviewResponse(SQLModel):
    id: str
    proposal_id: str
    team_color: str
    status: str
    reviewer_name: Optional[str]
    reviewer_email: Optional[str]
    scores: Optional[str]
    notes: Optional[str]
    recommendation: Optional[str]
    win_probability: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]
    # Computed
    overall_score: Optional[float] = None  # average of scores


class ProposalReviewCreate(SQLModel):
    team_color: str
    reviewer_name: Optional[str] = None
    reviewer_email: Optional[str] = None
    scores: Optional[str] = None  # JSON
    notes: Optional[str] = None
    recommendation: Optional[str] = None
    win_probability: Optional[int] = None
    status: str = "in_progress"


class WinThemeResponse(SQLModel):
    id: str
    proposal_id: str
    theme_type: str
    title: str
    description: Optional[str]
    evidence: Optional[str]
    order_index: int
    created_at: datetime


class WinThemeCreate(SQLModel):
    theme_type: str  # win_theme | discriminator | ghost
    title: str
    description: Optional[str] = None
    evidence: Optional[str] = None
    order_index: int = 0
