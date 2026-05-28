"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export type PlanTier = "trial" | "starter" | "growth" | "enterprise";
export type ProposalMode = "single" | "bilingual";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  company?: string;
  plan: PlanTier;
  joinedAt: string;
  usage: {
    rfps_analyzed: number;
    proposals_generated: number;
    documents_uploaded: number;
    /** Credits spent — bilingual costs 2, single costs 1. */
    proposal_credits_spent: number;
  };
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** True when Supabase env vars are configured. UI may use this to show real auth UX. */
  hasRealAuth: boolean;
  signUp: (input: { name: string; email: string; password?: string; company?: string }) => Promise<AuthUser>;
  signIn: (input: { email: string; password?: string }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  updatePlan: (plan: PlanTier) => void;
  trackUsage: (key: keyof AuthUser["usage"]) => void;
  trackProposalCredits: (mode: ProposalMode) => void;
  /** Returns the current access token for Authorization headers. */
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "etimad_user";

function readDemoUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function writeDemoUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Hydrate an AuthUser from backend /api/me response.
 * Falls back to a minimal shell if the backend call fails (e.g. dev with no backend).
 */
async function fetchBackendUser(token: string | null): Promise<Partial<AuthUser> | null> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${base}/api/me`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name ?? data.email?.split("@")[0],
      company: data.company_name ?? undefined,
      plan: (data.plan ?? "trial") as PlanTier,
      joinedAt: data.created_at ?? new Date().toISOString(),
      usage: {
        rfps_analyzed: data.rfps_this_period ?? 0,
        proposals_generated: data.proposals_this_period ?? 0,
        documents_uploaded: 0,
        proposal_credits_spent: data.proposals_this_period ?? 0,
      },
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const hasRealAuth = isSupabaseConfigured();
  const supabase = getSupabase();

  // Initial hydration
  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      if (supabase) {
        // Real Supabase session
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;
        if (!mounted) return;

        if (session) {
          const token = session.access_token;
          const backendUser = await fetchBackendUser(token);
          if (mounted && backendUser) {
            setUser(backendUser as AuthUser);
          } else if (mounted) {
            // Backend not reachable — still set a minimal user from Supabase metadata
            setUser({
              id: session.user.id,
              email: session.user.email ?? "",
              name: session.user.user_metadata?.name ?? session.user.email?.split("@")[0] ?? "",
              plan: "trial",
              joinedAt: session.user.created_at ?? new Date().toISOString(),
              usage: { rfps_analyzed: 0, proposals_generated: 0, documents_uploaded: 0, proposal_credits_spent: 0 },
            });
          }
        }
        setLoading(false);

        // Subscribe to session changes (login/logout/refresh)
        const sub = supabase.auth.onAuthStateChange(async (_evt, sess) => {
          if (!mounted) return;
          if (sess) {
            const backendUser = await fetchBackendUser(sess.access_token);
            if (backendUser) {
              setUser(backendUser as AuthUser);
            }
          } else {
            setUser(null);
          }
        });
        return () => sub.data.subscription.unsubscribe();
      } else {
        // Demo / localStorage mode
        setUser(readDemoUser());
        setLoading(false);
      }
    }

    void hydrate();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async ({ name, email, password, company }) => {
      if (supabase && password) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, company } },
        });
        if (error) throw new Error(error.message);
        // After signup, the auth state listener will pull the user. Return a stub.
        const u: AuthUser = {
          id: data.user?.id ?? "pending",
          email,
          name: name || email.split("@")[0],
          company,
          plan: "trial",
          joinedAt: new Date().toISOString(),
          usage: { rfps_analyzed: 0, proposals_generated: 0, documents_uploaded: 0, proposal_credits_spent: 0 },
        };
        setUser(u);
        return u;
      }
      // Demo mode
      const newUser: AuthUser = {
        id: `usr_${Math.random().toString(36).slice(2, 10)}`,
        name,
        email,
        company,
        plan: "trial",
        joinedAt: new Date().toISOString(),
        usage: { rfps_analyzed: 0, proposals_generated: 0, documents_uploaded: 0, proposal_credits_spent: 0 },
      };
      writeDemoUser(newUser);
      setUser(newUser);
      return newUser;
    },
    [supabase]
  );

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async ({ email, password }) => {
      if (supabase && password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        // Auth listener will populate the user — but block until it does
        // by reading the session synchronously.
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token ?? null;
        const backendUser = await fetchBackendUser(token);
        const u = (backendUser as AuthUser) ?? {
          id: data.session?.user.id ?? "pending",
          email,
          name: email.split("@")[0],
          plan: "trial" as PlanTier,
          joinedAt: new Date().toISOString(),
          usage: { rfps_analyzed: 0, proposals_generated: 0, documents_uploaded: 0, proposal_credits_spent: 0 },
        };
        setUser(u);
        return u;
      }
      // Demo mode
      const existing = readDemoUser();
      if (existing && existing.email === email) {
        setUser(existing);
        return existing;
      }
      const newUser: AuthUser = {
        id: `usr_${Math.random().toString(36).slice(2, 10)}`,
        name: email.split("@")[0],
        email,
        plan: "trial",
        joinedAt: new Date().toISOString(),
        usage: { rfps_analyzed: 0, proposals_generated: 0, documents_uploaded: 0, proposal_credits_spent: 0 },
      };
      writeDemoUser(newUser);
      setUser(newUser);
      return newUser;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      writeDemoUser(null);
    }
    setUser(null);
  }, [supabase]);

  const updatePlan = useCallback((plan: PlanTier) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, plan };
      if (!supabase) writeDemoUser(next);
      return next;
    });
  }, [supabase]);

  const trackUsage = useCallback((key: keyof AuthUser["usage"]) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        usage: { ...prev.usage, [key]: prev.usage[key] + 1 },
      };
      if (!supabase) writeDemoUser(next);
      return next;
    });
  }, [supabase]);

  const trackProposalCredits = useCallback((mode: ProposalMode) => {
    const cost = mode === "bilingual" ? 2 : 1;
    setUser((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        usage: {
          ...prev.usage,
          proposals_generated: prev.usage.proposals_generated + 1,
          proposal_credits_spent: prev.usage.proposal_credits_spent + cost,
        },
      };
      if (!supabase) writeDemoUser(next);
      return next;
    });
  }, [supabase]);

  const getToken = useCallback<AuthContextValue["getToken"]>(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ user, loading, hasRealAuth, signUp, signIn, signOut, updatePlan, trackUsage, trackProposalCredits, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

// ─── Plan metadata ────────────────────────────────────

export const PLANS: Record<PlanTier, {
  label: string;
  labelAr: string;
  priceSar: number | null;
  description: string;
  limits: {
    rfps_per_month: number | "unlimited";
    proposals_per_month: number | "unlimited";
    knowledge_base_docs: number | "unlimited";
    bilingual_output: boolean;
    success_fee_pct?: number;
    priority_support: boolean;
    dedicated_csm: boolean;
  };
  features: string[];
}> = {
  trial: {
    label: "Free Trial",
    labelAr: "تجربة مجانية",
    priceSar: 0,
    description: "Test-drive on a real RFP. See it work before you commit.",
    limits: {
      rfps_per_month: 2,
      proposals_per_month: 1,
      knowledge_base_docs: 5,
      bilingual_output: true,
      priority_support: false,
      dedicated_csm: false,
    },
    features: [
      "2 RFP analyses",
      "1 proposal generation",
      "5 knowledge base documents",
      "Compliance matrix export",
    ],
  },
  starter: {
    label: "Starter",
    labelAr: "البداية",
    priceSar: 2000,
    description: "Save 200+ hours/year vs internal review. Pays for itself on your first bid.",
    limits: {
      rfps_per_month: 5,
      proposals_per_month: 3,
      knowledge_base_docs: 25,
      bilingual_output: true,
      priority_support: false,
      dedicated_csm: false,
    },
    features: [
      "5 RFP analyses / month",
      "3 proposal generations / month",
      "25 knowledge base documents",
      "Bilingual AR / EN output",
      "Word + PDF export",
      "Email support",
    ],
  },
  growth: {
    label: "Growth",
    labelAr: "النمو",
    priceSar: 5000,
    description: "Most popular — for active bidders winning multiple tenders.",
    limits: {
      rfps_per_month: 20,
      proposals_per_month: 15,
      knowledge_base_docs: 250,
      bilingual_output: true,
      success_fee_pct: 1,
      priority_support: true,
      dedicated_csm: false,
    },
    features: [
      "20 RFP analyses / month",
      "15 proposal generations / month",
      "250 knowledge base documents",
      "LCGPA auto-templates",
      "Success fee: 1% of won tender value",
      "Priority support · 4hr response",
      "Team collaboration (up to 5 users)",
    ],
  },
  enterprise: {
    label: "Enterprise",
    labelAr: "الشركات الكبيرة",
    priceSar: 8000,
    description: "Unlimited usage with a dedicated success manager.",
    limits: {
      rfps_per_month: "unlimited",
      proposals_per_month: "unlimited",
      knowledge_base_docs: "unlimited",
      bilingual_output: true,
      success_fee_pct: 0.5,
      priority_support: true,
      dedicated_csm: true,
    },
    features: [
      "Unlimited RFP analyses",
      "Unlimited proposal generations",
      "Unlimited knowledge base",
      "Success fee: 0.5% of won tender value",
      "Dedicated customer success manager",
      "Custom LCGPA scoring profiles",
      "SSO + audit logs",
      "Unlimited team members",
      "On-premise option available",
    ],
  },
};
