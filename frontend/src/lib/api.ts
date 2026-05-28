import { getSupabase } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Fetch wrapper that attaches the Supabase access token when available. */
export async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return fetch(url, { ...init, headers });
}

export interface RFPResponse {
  id: string;
  filename: string;
  upload_time: string;
  status: "processing" | "completed" | "error";
  page_count: number | null;
  language: string | null;
  error_message: string | null;
  requirement_count: number;
  title: string | null;
  title_ar: string | null;
  buyer: string | null;
  submission_deadline: string | null;
  estimated_value_sar: number | null;
  tender_status: "draft" | "in_progress" | "submitted" | "won" | "lost";
  proposal_count: number;
}

export interface RFPUpdatePayload {
  title?: string;
  title_ar?: string;
  buyer?: string;
  submission_deadline?: string | null;
  estimated_value_sar?: number | null;
  tender_status?: RFPResponse["tender_status"];
}

export interface RequirementResponse {
  id: string;
  requirement_text: string;
  requirement_text_en: string | null;
  category: string;
  is_mandatory: boolean;
  source_page: number | null;
  scoring_weight: number | null;
  compliance_status: "pending" | "compliant" | "gap" | "unclear";
  notes: string | null;
}

export interface CompanyProfile {
  id?: string;
  company_name: string;
  company_name_ar?: string | null;
  description?: string | null;
  services?: string | null;
  industries?: string | null;
  team_size?: number | null;
  saudization_pct?: number | null;
  cr_number?: string | null;
  vat_number?: string | null;
  lcgpa_certificate?: string | null;
  iso_certifications?: string | null;
  saudi_address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  document_count?: number;
}

export interface CompanyDocument {
  id: string;
  filename: string;
  document_type: string;
  file_type: string;
  summary: string | null;
  upload_time: string;
}

export interface MatchReason {
  label: string;
  score: number;
  detail: string | null;
}

export interface DiscoveredTenderResponse {
  id: string;
  source: string;
  external_id: string | null;
  title: string;
  title_ar: string | null;
  buyer: string;
  buyer_ar: string | null;
  industry: string | null;
  description: string | null;
  estimated_value_sar: number | null;
  submission_deadline: string | null;
  published_date: string | null;
  source_url: string | null;
  lcgpa_min_score: number | null;
  saudization_min: number | null;
  discovered_at: string;
  dismissed: boolean;
  saved_as_rfp_id: string | null;
  match_score: number;
  match_reasons: MatchReason[];
  days_until_deadline: number | null;
}

export interface ProposalResponse {
  id: string;
  rfp_id: string;
  status: "generating" | "completed" | "error";
  language: string;
  // Separate language outputs (preferred for KSA government submissions)
  executive_summary_en: string | null;
  executive_summary_ar: string | null;
  technical_proposal_en: string | null;
  technical_proposal_ar: string | null;
  financial_proposal_en: string | null;
  financial_proposal_ar: string | null;
  // Legacy aggregate fields (fallback for older proposals)
  executive_summary: string | null;
  technical_proposal: string | null;
  financial_proposal: string | null;
  pricing_data: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  section_count: number;
}

// ─── RFP ──────────────────────────────────────────────────

export async function uploadRFP(file: File): Promise<RFPResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authedFetch(`${API_BASE}/api/rfp/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function getRFP(id: string): Promise<RFPResponse> {
  const res = await authedFetch(`${API_BASE}/api/rfp/${id}`);
  if (!res.ok) throw new Error("RFP not found");
  return res.json();
}

export async function listRFPs(filters?: {
  status?: string;
  tender_status?: string;
}): Promise<RFPResponse[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.tender_status) params.append("tender_status", filters.tender_status);
  const res = await authedFetch(
    `${API_BASE}/api/rfps${params.toString() ? `?${params}` : ""}`
  );
  if (!res.ok) return [];
  return res.json();
}

export async function updateRFP(
  id: string,
  payload: RFPUpdatePayload
): Promise<RFPResponse> {
  const res = await authedFetch(`${API_BASE}/api/rfp/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update RFP");
  return res.json();
}

export async function deleteRFP(id: string): Promise<void> {
  const res = await authedFetch(`${API_BASE}/api/rfp/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete RFP");
}

export function rfpPageImageUrl(rfpId: string, pageNum: number, dpi = 144): string {
  return `${API_BASE}/api/rfp/${rfpId}/page/${pageNum}.png?dpi=${dpi}`;
}

// ─── Billing (Stripe) ────────────────────────────────────

export async function createCheckoutSession(plan: "starter" | "growth" | "enterprise"): Promise<{ url: string; dev_mode?: boolean }> {
  const res = await authedFetch(`${API_BASE}/api/billing/checkout?plan=${plan}`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Checkout failed" }));
    throw new Error(err.detail || "Checkout failed");
  }
  return res.json();
}

export async function createBillingPortalSession(): Promise<{ url: string; dev_mode?: boolean }> {
  const res = await authedFetch(`${API_BASE}/api/billing/portal`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Portal failed" }));
    throw new Error(err.detail || "Portal failed");
  }
  return res.json();
}

export async function regenerateProposalSection(
  proposalId: string,
  section: "executive" | "technical" | "financial"
): Promise<ProposalResponse> {
  const res = await authedFetch(
    `${API_BASE}/api/proposal/${proposalId}/regenerate?section=${section}`,
    { method: "POST" }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Regenerate failed" }));
    throw new Error(err.detail || "Regenerate failed");
  }
  return res.json();
}

export async function getRequirements(
  rfpId: string
): Promise<RequirementResponse[]> {
  const res = await authedFetch(`${API_BASE}/api/rfp/${rfpId}/requirements`);
  if (!res.ok) throw new Error("Failed to fetch requirements");
  return res.json();
}

export async function updateRequirement(
  rfpId: string,
  reqId: string,
  status: string,
  notes?: string
): Promise<void> {
  const params = new URLSearchParams({ compliance_status: status });
  if (notes) params.append("notes", notes);
  const res = await authedFetch(
    `${API_BASE}/api/rfp/${rfpId}/requirements/${reqId}?${params}`,
    { method: "PATCH" }
  );
  if (!res.ok) throw new Error("Failed to update requirement");
}

// ─── Company Profile ─────────────────────────────────────

export async function getProfile(): Promise<CompanyProfile | null> {
  const res = await authedFetch(`${API_BASE}/api/profile`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveProfile(
  profile: Omit<CompanyProfile, "id" | "document_count">
): Promise<CompanyProfile> {
  const res = await authedFetch(`${API_BASE}/api/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Save failed" }));
    throw new Error(err.detail || "Save failed");
  }
  return res.json();
}

export async function uploadCompanyDocument(
  file: File,
  documentType: string
): Promise<CompanyDocument> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authedFetch(
    `${API_BASE}/api/profile/documents?document_type=${documentType}`,
    { method: "POST", body: formData }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function listCompanyDocuments(): Promise<CompanyDocument[]> {
  const res = await authedFetch(`${API_BASE}/api/profile/documents`);
  if (!res.ok) return [];
  return res.json();
}

export async function deleteCompanyDocument(docId: string): Promise<void> {
  const res = await authedFetch(`${API_BASE}/api/profile/documents/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
}

// ─── Proposals ───────────────────────────────────────────

export async function createProposal(
  rfpId: string,
  language: "en" | "ar" | "bilingual" = "en"
): Promise<ProposalResponse> {
  const res = await authedFetch(
    `${API_BASE}/api/rfp/${rfpId}/proposal?language=${language}`,
    { method: "POST" }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Generation failed" }));
    throw new Error(err.detail || "Generation failed");
  }
  return res.json();
}

export async function getProposal(proposalId: string): Promise<ProposalResponse> {
  const res = await authedFetch(`${API_BASE}/api/proposal/${proposalId}`);
  if (!res.ok) throw new Error("Proposal not found");
  return res.json();
}

export async function listProposals(rfpId: string): Promise<ProposalResponse[]> {
  const res = await authedFetch(`${API_BASE}/api/rfp/${rfpId}/proposals`);
  if (!res.ok) return [];
  return res.json();
}

export function downloadProposalUrl(
  proposalId: string,
  format: "docx" | "pdf" = "docx",
  language: "en" | "ar" = "en"
): string {
  return `${API_BASE}/api/proposal/${proposalId}/download?format=${format}&language=${language}`;
}

// ─── Tender Discovery ────────────────────────────────────

export async function listDiscovered(opts?: {
  minScore?: number;
  includeDismissed?: boolean;
  includeSaved?: boolean;
  limit?: number;
}): Promise<DiscoveredTenderResponse[]> {
  const params = new URLSearchParams();
  if (opts?.minScore !== undefined) params.append("min_score", String(opts.minScore));
  if (opts?.includeDismissed) params.append("include_dismissed", "true");
  if (opts?.includeSaved) params.append("include_saved", "true");
  if (opts?.limit) params.append("limit", String(opts.limit));
  const res = await authedFetch(`${API_BASE}/api/discover?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function saveDiscoveredAsRFP(
  tenderId: string
): Promise<RFPResponse> {
  const res = await authedFetch(`${API_BASE}/api/discover/${tenderId}/save`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to save tender");
  return res.json();
}

export async function dismissDiscovered(tenderId: string): Promise<void> {
  const res = await authedFetch(`${API_BASE}/api/discover/${tenderId}/dismiss`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to dismiss");
}

export async function restoreDiscovered(tenderId: string): Promise<void> {
  const res = await authedFetch(`${API_BASE}/api/discover/${tenderId}/restore`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to restore");
}

export interface DiscoveredTenderCreate {
  title: string;
  title_ar?: string;
  buyer: string;
  buyer_ar?: string;
  source?: "manual" | "user_paste" | "curator" | "admin";
  external_id?: string;
  industry?: string;
  description?: string;
  estimated_value_sar?: number | null;
  submission_deadline?: string | null;
  source_url?: string;
  lcgpa_min_score?: number | null;
  saudization_min?: number | null;
  added_by?: string;
  notes?: string;
}

// ─── Reviews + Themes (color-team methodology) ────

export type TeamColor = "blue" | "pink" | "red" | "gold";
export type ReviewStatus = "not_started" | "in_progress" | "passed" | "failed";
export type ThemeType = "win_theme" | "discriminator" | "ghost";

export interface ProposalReview {
  id: string;
  proposal_id: string;
  team_color: TeamColor;
  status: ReviewStatus;
  reviewer_name: string | null;
  reviewer_email: string | null;
  scores: string | null; // JSON
  notes: string | null;
  recommendation: string | null;
  win_probability: number | null;
  created_at: string;
  completed_at: string | null;
  overall_score: number | null;
}

export interface ProposalReviewCreate {
  team_color: TeamColor;
  reviewer_name?: string;
  reviewer_email?: string;
  scores?: string;
  notes?: string;
  recommendation?: string;
  win_probability?: number;
  status?: ReviewStatus;
}

export interface WinTheme {
  id: string;
  proposal_id: string;
  theme_type: ThemeType;
  title: string;
  description: string | null;
  evidence: string | null;
  order_index: number;
  created_at: string;
}

export interface WinThemeCreate {
  theme_type: ThemeType;
  title: string;
  description?: string;
  evidence?: string;
  order_index?: number;
}

export async function listReviews(proposalId: string): Promise<ProposalReview[]> {
  const res = await authedFetch(`${API_BASE}/api/proposal/${proposalId}/reviews`);
  if (!res.ok) return [];
  return res.json();
}

export async function createReview(
  proposalId: string,
  payload: ProposalReviewCreate
): Promise<ProposalReview> {
  const res = await authedFetch(`${API_BASE}/api/proposal/${proposalId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create review");
  return res.json();
}

export async function updateReview(
  proposalId: string,
  reviewId: string,
  payload: Partial<ProposalReviewCreate>
): Promise<ProposalReview> {
  const res = await authedFetch(
    `${API_BASE}/api/proposal/${proposalId}/reviews/${reviewId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error("Failed to update review");
  return res.json();
}

export async function deleteReview(proposalId: string, reviewId: string): Promise<void> {
  const res = await authedFetch(
    `${API_BASE}/api/proposal/${proposalId}/reviews/${reviewId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to delete review");
}

export async function listThemes(proposalId: string): Promise<WinTheme[]> {
  const res = await authedFetch(`${API_BASE}/api/proposal/${proposalId}/themes`);
  if (!res.ok) return [];
  return res.json();
}

export async function createTheme(
  proposalId: string,
  payload: WinThemeCreate
): Promise<WinTheme> {
  const res = await authedFetch(`${API_BASE}/api/proposal/${proposalId}/themes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create theme");
  return res.json();
}

export async function deleteTheme(proposalId: string, themeId: string): Promise<void> {
  const res = await authedFetch(
    `${API_BASE}/api/proposal/${proposalId}/themes/${themeId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to delete theme");
}

// ─── Comments + Notifications ──────────────────────────────

export interface CommentResponse {
  id: string;
  author_user_id: string;
  author_email: string | null;
  author_name: string | null;
  target_type: string;
  target_id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  mentioned_user_ids: string[];
}

export async function listComments(
  targetType: "rfp" | "proposal" | "requirement",
  targetId: string
): Promise<CommentResponse[]> {
  const params = new URLSearchParams({ target_type: targetType, target_id: targetId });
  const res = await authedFetch(`${API_BASE}/api/comments?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createComment(
  targetType: "rfp" | "proposal" | "requirement",
  targetId: string,
  body: string
): Promise<CommentResponse> {
  const res = await authedFetch(`${API_BASE}/api/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_type: targetType, target_id: targetId, body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to post comment" }));
    throw new Error(err.detail || "Failed to post comment");
  }
  return res.json();
}

export async function deleteComment(commentId: string): Promise<void> {
  const res = await authedFetch(`${API_BASE}/api/comments/${commentId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete comment");
}

export interface NotificationResponse {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link_url: string | null;
  actor_email: string | null;
  actor_name: string | null;
  source_type: string | null;
  source_id: string | null;
  read_at: string | null;
  created_at: string;
}

export async function listNotifications(
  opts: { unread_only?: boolean; limit?: number } = {}
): Promise<NotificationResponse[]> {
  const params = new URLSearchParams();
  if (opts.unread_only) params.set("unread_only", "true");
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const res = await authedFetch(
    `${API_BASE}/api/notifications${qs ? `?${qs}` : ""}`
  );
  if (!res.ok) return [];
  return res.json();
}

export async function markNotificationRead(id: string): Promise<void> {
  await authedFetch(`${API_BASE}/api/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await authedFetch(`${API_BASE}/api/notifications/mark-all-read`, { method: "POST" });
}

// ─── Activity ──────────────────────────────────────────────

export interface ActivityEvent {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  extra: Record<string, unknown> | null;
  created_at: string;
}

export async function listActivity(opts: {
  limit?: number;
  entity_type?: string;
  entity_id?: string;
} = {}): Promise<ActivityEvent[]> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.entity_type) params.set("entity_type", opts.entity_type);
  if (opts.entity_id) params.set("entity_id", opts.entity_id);
  const qs = params.toString();
  const res = await authedFetch(`${API_BASE}/api/activity${qs ? `?${qs}` : ""}`);
  if (!res.ok) return [];
  return res.json();
}

// ─── Teams ──────────────────────────────────────────────────

export type TeamRole = "viewer" | "editor" | "admin" | "owner";

export interface TeamResponse {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  plan: string;
  plan_status: string;
  trial_ends_at: string | null;
  plan_renews_at: string | null;
  rfps_this_period: number;
  proposals_this_period: number;
  member_count: number;
  pending_invites: number;
  created_at: string;
}

export interface TeamMemberResponse {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: TeamRole;
  joined_at: string;
  is_current_user: boolean;
}

export interface TeamInviteResponse {
  id: string;
  email: string;
  role: TeamRole;
  invited_by_user_id: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export async function getCurrentTeam(): Promise<TeamResponse> {
  const res = await authedFetch(`${API_BASE}/api/teams/current`);
  if (!res.ok) throw new Error("Failed to load team");
  return res.json();
}

export async function listTeamMembers(): Promise<TeamMemberResponse[]> {
  const res = await authedFetch(`${API_BASE}/api/teams/current/members`);
  if (!res.ok) throw new Error("Failed to load members");
  return res.json();
}

export async function listTeamInvites(): Promise<TeamInviteResponse[]> {
  const res = await authedFetch(`${API_BASE}/api/teams/current/invites`);
  if (!res.ok) throw new Error("Failed to load invites");
  return res.json();
}

export async function createTeamInvite(
  email: string,
  role: TeamRole
): Promise<TeamInviteResponse> {
  const res = await authedFetch(`${API_BASE}/api/teams/current/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to send invite" }));
    throw new Error(err.detail || "Failed to send invite");
  }
  return res.json();
}

export async function revokeTeamInvite(inviteId: string): Promise<void> {
  const res = await authedFetch(
    `${API_BASE}/api/teams/current/invites/${inviteId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to revoke invite");
}

export async function acceptTeamInvite(token: string): Promise<TeamResponse> {
  const res = await authedFetch(`${API_BASE}/api/teams/invites/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to accept invite" }));
    throw new Error(err.detail || "Failed to accept invite");
  }
  return res.json();
}

export async function updateMemberRole(
  userId: string,
  role: TeamRole
): Promise<TeamMemberResponse> {
  const res = await authedFetch(
    `${API_BASE}/api/teams/current/members/${userId}/role`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update role" }));
    throw new Error(err.detail || "Failed to update role");
  }
  return res.json();
}

export async function removeMember(userId: string): Promise<void> {
  const res = await authedFetch(
    `${API_BASE}/api/teams/current/members/${userId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to remove member");
}

export async function addManualTender(
  payload: DiscoveredTenderCreate
): Promise<DiscoveredTenderResponse> {
  const res = await authedFetch(`${API_BASE}/api/discover/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to add tender" }));
    throw new Error(err.detail || "Failed to add tender");
  }
  return res.json();
}
