import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useKeurBonStore } from '../state/store';
import {
  CloseIcon,
  KeurBonMark,
  MenuBarsIcon,
  SendVoucherIcon,
  ShieldCheckIcon,
  StoreCounterIcon,
} from './Icons';
import { ToastRegion } from './ToastRegion';

export function Layout({ children }: { children: React.ReactNode }) {
  const {
    language,
    t,
    activeRole,
    activeVendor,
    setLanguage,
    setActiveRole,
  } = useKeurBonStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstDrawerLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    firstDrawerLinkRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const navItems = [
    { to: '/', label: t.nav.overview, end: true },
    { to: '/issue', label: t.nav.issue, end: false },
    { to: '/redeem', label: t.nav.redeem, end: false },
    { to: '/ledger', label: t.nav.ledger, end: false },
    { to: '/vendors', label: t.nav.vendors, end: false },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Skip to Main Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[100] focus:rounded-[8px] focus:bg-[#0E1E2B] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-[#FAFBF9]"
      >
        {t.meta.skipToContent}
      </a>

      {/* Persistent Top Navigation Header */}
      <header className="no-print sticky top-0 z-40 h-[68px] w-full border-b border-[#CFD8D4] bg-[#FAFBF9]">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-3 px-4 lg:px-8">
          {/* Left: Brand Emblem + Wordmark */}
          <Link
            to="/"
            className="flex min-h-[44px] shrink-0 items-center gap-2.5 text-[#0E1E2B] no-underline"
          >
            <KeurBonMark size={28} />
            <div className="flex flex-col">
              <span
                translate="no"
                className="font-display text-lg font-bold leading-none tracking-tight text-[#0E1E2B]"
              >
                KeurBon
              </span>
              <span className="mt-0.5 text-[11px] font-medium leading-none text-[#4C616F]">
                Dakar · NUT-11
              </span>
            </div>
          </Link>

          {/* Center: 5 Single-Word Operational Routes (Desktop >= 1024px) */}
          <nav
            aria-label="Navigation principale"
            className="hidden h-full items-center gap-1 lg:flex"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative inline-flex h-full items-center px-3.5 text-sm transition-colors duration-150 ${
                    isActive
                      ? 'font-semibold text-[#0E1E2B] after:absolute after:right-2 after:bottom-0 after:left-2 after:h-[2px] after:bg-[#0C5C44]'
                      : 'font-medium text-[#3D515F] hover:text-[#0E1E2B]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Segmented FR|EN Toggle + Compact Paris/Dakar Role Switcher + Mobile Menu Trigger */}
          <div className="flex items-center gap-2">
            {/* Compact Role Switcher (Desktop >= 1024px) */}
            <div
              role="group"
              aria-label={t.nav.roleSwitcherLabel}
              className="hidden items-center rounded-[8px] border border-[#CFD8D4] bg-[#E3E9E5] p-1 lg:flex"
            >
              <button
                type="button"
                onClick={() => setActiveRole('sender')}
                aria-pressed={activeRole === 'sender'}
                className={`kb-pressable inline-flex min-h-[44px] items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-semibold ${
                  activeRole === 'sender'
                    ? 'bg-[#FAFBF9] text-[#0E1E2B] shadow-xs'
                    : 'text-[#3D515F] hover:text-[#0E1E2B]'
                }`}
              >
                <SendVoucherIcon size={14} className="text-[#9B5305]" />
                <span>{t.nav.roleSenderParis}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveRole('vendor')}
                aria-pressed={activeRole === 'vendor'}
                className={`kb-pressable inline-flex min-h-[44px] items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-semibold ${
                  activeRole === 'vendor'
                    ? 'bg-[#0C5C44] text-[#FAFBF9] shadow-xs'
                    : 'text-[#3D515F] hover:text-[#0E1E2B]'
                }`}
              >
                <StoreCounterIcon size={14} />
                <span>{t.nav.roleVendorDakar}</span>
              </button>
            </div>

            {/* Segmented FR | EN Language Toggle (44px touch target) */}
            <div
              role="group"
              aria-label={t.nav.languageSwitcherLabel}
              className="inline-flex min-h-[44px] items-center rounded-[8px] border border-[#637683] bg-[#E3E9E5] p-0.5"
            >
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                aria-pressed={language === 'fr'}
                className={`kb-pressable inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[6px] px-2 text-xs font-bold ${
                  language === 'fr'
                    ? 'bg-[#0E1E2B] text-[#FAFBF9]'
                    : 'text-[#3D515F] hover:text-[#0E1E2B]'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                aria-pressed={language === 'en'}
                className={`kb-pressable inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[6px] px-2 text-xs font-bold ${
                  language === 'en'
                    ? 'bg-[#0E1E2B] text-[#FAFBF9]'
                    : 'text-[#3D515F] hover:text-[#0E1E2B]'
                }`}
              >
                EN
              </button>
            </div>

            {/* Mobile Drawer Trigger (< 1024px) */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setDrawerOpen((prev) => !prev)}
              aria-expanded={drawerOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={drawerOpen ? t.nav.closeMenu : t.nav.openMenu}
              className="kb-pressable inline-flex size-[44px] items-center justify-center rounded-[8px] border border-[#637683] bg-[#FAFBF9] text-[#0E1E2B] hover:bg-[#E3E9E5] lg:hidden"
            >
              {drawerOpen ? <CloseIcon size={20} /> : <MenuBarsIcon size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Sheet (< 1024px) */}
        {drawerOpen ? (
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="kb-sheet-active fixed inset-x-0 top-[68px] z-[60] border-b border-[#CFD8D4] bg-[#FAFBF9] px-4 pt-3 pb-5 lg:hidden"
          >
            <nav aria-label="Navigation mobile" className="flex flex-col gap-1">
              {navItems.map((item, idx) => (
                <NavLink
                  key={item.to}
                  ref={idx === 0 ? firstDrawerLinkRef : undefined}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-h-[44px] items-center justify-between rounded-[8px] px-3.5 text-base font-semibold ${
                      isActive
                        ? 'bg-[#E5F2ED] text-[#0C5C44] border-l-4 border-[#0C5C44]'
                        : 'text-[#0E1E2B] hover:bg-[#E3E9E5]'
                    }`
                  }
                >
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Mobile Role Switcher */}
            <div className="mt-4 border-t border-[#CFD8D4] pt-3">
              <p className="text-xs font-semibold text-[#3D515F]">
                {t.nav.roleSwitcherLabel}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveRole('sender')}
                  aria-pressed={activeRole === 'sender'}
                  className={`kb-pressable flex min-h-[44px] items-center justify-center gap-1.5 rounded-[8px] border px-3 text-xs font-semibold ${
                    activeRole === 'sender'
                      ? 'border-[#0E1E2B] bg-[#0E1E2B] text-[#FAFBF9]'
                      : 'border-[#637683] bg-[#FAFBF9] text-[#0E1E2B]'
                  }`}
                >
                  <SendVoucherIcon size={15} />
                  <span>{t.nav.roleSenderParis}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRole('vendor')}
                  aria-pressed={activeRole === 'vendor'}
                  className={`kb-pressable flex min-h-[44px] items-center justify-center gap-1.5 rounded-[8px] border px-3 text-xs font-semibold ${
                    activeRole === 'vendor'
                      ? 'border-[#0C5C44] bg-[#0C5C44] text-[#FAFBF9]'
                      : 'border-[#637683] bg-[#FAFBF9] text-[#0E1E2B]'
                  }`}
                >
                  <StoreCounterIcon size={15} />
                  <span>{t.nav.roleVendorDakar}</span>
                </button>
              </div>
              <p className="mt-2 text-xs text-[#4C616F]">
                {t.nav.activeVendorLabel} :{' '}
                <span className="font-semibold text-[#0E1E2B]">
                  {activeVendor.name}
                </span>
              </p>
            </div>
          </div>
        ) : null}
      </header>

      {/* Main Route Landmark */}
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:py-8 lg:px-8"
      >
        {children}
      </main>

      {/* Compact Protocol & Security-by-Design Footer */}
      <footer className="no-print mt-12 border-t border-[#CFD8D4] bg-[#FAFBF9]/85 py-6">
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-4 px-4 text-xs text-[#3D515F] md:flex-row md:items-center lg:px-8">
          <div className="max-w-2xl">
            <p className="flex items-center gap-1.5 font-semibold text-[#0E1E2B]">
              <ShieldCheckIcon size={15} className="text-[#0C5C44]" />
              <span>{t.meta.securityByDesignTitle}</span>
            </p>
            <p className="mt-1 leading-relaxed text-[#4C616F]">
              {t.meta.securityByDesignNote}
            </p>
          </div>
          <div className="shrink-0 md:text-right">
            <p className="font-mono text-[11px] font-medium text-[#0E1E2B]">
              {t.meta.protocolFooter}
            </p>
          </div>
        </div>
      </footer>

      {/* Accessible Aria-Live Toast Feedback */}
      <ToastRegion />
    </div>
  );
}
