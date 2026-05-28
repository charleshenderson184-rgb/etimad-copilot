"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PLANS, useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useTour } from "@/components/product-tour";
import { NotificationBell } from "@/components/notification-bell";

export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { start: startTour } = useTour();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Close mobile nav on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) {
        setMobileNavOpen(false);
      }
    }
    if (mobileNavOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [mobileNavOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const links = user
    ? [
        { href: "/discover", label: "Discover" },
        { href: "/dashboard", label: "Pipeline" },
        { href: "/analytics", label: "Analytics" },
        { href: "/profile", label: "Profile" },
      ]
    : [
        { href: "/", label: "Analyze RFP" },
        { href: "/customers", label: "Customers" },
        { href: "/pricing", label: "Pricing" },
        { href: "/security", label: "Security" },
      ];

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  const planLabel = user ? PLANS[user.plan].label : null;

  return (
    <nav className="border-b border-stone-200/60 dark:border-stone-800/60 bg-white/70 dark:bg-stone-950/70 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-stone-900 leading-tight group-hover:text-emerald-700 transition-colors">
              Etimad Copilot
            </div>
            <div className="text-xs text-stone-500 leading-tight" dir="rtl">
              مساعد المنافسات
            </div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-0.5 p-1 rounded-xl bg-stone-100/60 dark:bg-stone-900/60 ring-1 ring-stone-200/50 dark:ring-stone-800/50">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-elev-1"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 transition-colors"
          >
            {theme === "dark" ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {user && <NotificationBell />}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full bg-white ring-1 ring-stone-200 hover:ring-stone-300 hover:shadow-sm transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-xs font-medium text-stone-900">
                    {user.name.split(" ")[0]}
                  </div>
                  <div className="text-[10px] text-stone-400">
                    {planLabel}
                  </div>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-stone-400 transition-transform ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl ring-1 ring-stone-200 shadow-xl animate-fade-in-down origin-top-right overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100">
                    <div className="text-sm font-semibold text-stone-900 truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-stone-500 truncate">
                      {user.email}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {planLabel} plan
                    </div>
                  </div>
                  <div className="py-1">
                    <MenuItem
                      href="/account"
                      label="Account & Usage"
                      onSelect={() => setMenuOpen(false)}
                      icon={
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.6}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      }
                    />
                    <MenuItem
                      href="/team"
                      label="Team & Members"
                      onSelect={() => setMenuOpen(false)}
                      icon={
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.6}
                          d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      }
                    />
                    <MenuItem
                      href="/profile"
                      label="Company Profile"
                      onSelect={() => setMenuOpen(false)}
                      icon={
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.6}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      }
                    />
                    <MenuItem
                      href="/pricing"
                      label="Billing & Plans"
                      onSelect={() => setMenuOpen(false)}
                      icon={
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.6}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      }
                    />
                  </div>
                  <div className="py-1 border-t border-stone-100 dark:border-stone-800">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        startTour();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 transition-colors"
                    >
                      <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Replay product tour
                    </button>
                    <button
                      onClick={() => {
                        signOut();
                        setMenuOpen(false);
                        router.push("/");
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 transition-colors"
                    >
                      <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/signin"
                className="hidden sm:inline-block px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap text-stone-600 hover:text-stone-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="px-3.5 py-1.5 rounded-lg bg-stone-900 text-white text-sm font-medium whitespace-nowrap hover:bg-stone-800 transition-colors shadow-sm"
              >
                Sign up
              </Link>
            </>
          )}

          {/* Mobile hamburger — visible below md, opens the same links as the desktop nav strip */}
          <div className="relative md:hidden" ref={mobileNavRef}>
            <button
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileNavOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {mobileNavOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-stone-900 rounded-xl ring-1 ring-stone-200 dark:ring-stone-800 shadow-xl animate-fade-in-down origin-top-right overflow-hidden">
                <div className="py-1">
                  {links.map((link) => {
                    const isActive =
                      link.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={`block px-4 py-2.5 text-sm font-medium ${
                          isActive
                            ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                            : "text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
                {!user && (
                  <div className="border-t border-stone-100 dark:border-stone-800 px-4 py-3 sm:hidden">
                    <Link
                      href="/signin"
                      onClick={() => setMobileNavOpen(false)}
                      className="block text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100"
                    >
                      Sign in
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function MenuItem({
  href,
  label,
  icon,
  onSelect,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
    >
      <svg
        className="w-4 h-4 text-stone-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {icon}
      </svg>
      {label}
    </Link>
  );
}
