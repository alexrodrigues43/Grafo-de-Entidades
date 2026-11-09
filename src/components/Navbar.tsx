import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Database,
  ShieldCheck,
  LogOut,
  LogIn,
  ChevronDown,
  Zap
} from 'lucide-react';
import { AuthSession, SupportedLang } from '../types';
import { SemanticoLogo } from './SemanticoLogo';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from './LanguageSelector';
import { getTranslations } from '../lib/i18n';

interface NavbarProps {
  totalEntities: number;
  totalRelations: number;
  session?: AuthSession | null;
  onLogout?: () => void;
  uiLang?: SupportedLang;
  onLanguageChange?: (lang: SupportedLang) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalEntities,
  totalRelations,
  session,
  onLogout,
  uiLang = 'pt',
  onLanguageChange
}) => {
  const t = getTranslations(uiLang);
  const {
    user,
    profile,
    isAdmin,
    openAuthModal,
    openAdminModal,
    openPaywall,
    signOut
  } = useAuth();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    if (onLogout) onLogout();
    await signOut();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] text-[#08121E] shadow-xs">
      {/* Top Primary Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo (Graph Studio Release pill removed) */}
        <div className="flex items-center gap-3">
          <a
            href={t.navLinks.consulting}
            target="_blank"
            rel="noreferrer"
            className="flex items-center hover:opacity-90 transition-opacity"
            title={t.footer.consulting}
          >
            <SemanticoLogo variant="black" size="md" showTagline={true} />
          </a>
        </div>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-[#4A5568]" aria-label="Navegação Institucional">
          <a
            href={t.navLinks.contact}
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#08121E] transition-colors py-2 min-h-[44px] flex items-center"
          >
            {t.nav.contact}
          </a>
        </nav>

        {/* Right Info, Status & Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Live Graph Counters */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-[#FAF9F6] rounded-full text-xs font-mono text-slate-700 border border-[#E5E7EB]">
            <Database className="w-3.5 h-3.5 text-[#E5A93C]" aria-hidden="true" />
            <span>
              <strong className="text-[#08121E]">{totalEntities}</strong> {t.nav.nodesLabel} •{' '}
              <strong className="text-[#1E5E3A]">{totalRelations}</strong> {t.nav.relationsLabel}
            </span>
          </div>

          {/* Central Credit Wallet Badge / Comprar Créditos */}
          <a
            href="https://cobrador.semantico.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-2xs cursor-pointer whitespace-nowrap shrink-0 ${
              !user || !profile || isAdmin
                ? 'bg-amber-500/10 text-amber-950 border-amber-300 hover:bg-amber-500/20'
                : (profile.creditsBalance ?? 0) > 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 animate-pulse'
            }`}
            title={isAdmin ? `Super Admin: ${t.nav.unlimitedCredits}` : 'Gerenciar créditos no Cobrador Semântico'}
          >
            <span className="text-sm" aria-hidden="true">🪙</span>
            <span>
              {!user || !profile
                ? t.nav.buyCredits
                : isAdmin
                  ? t.nav.unlimitedCredits
                  : `${profile.creditsBalance ?? 0} ${t.nav.credits}`}
            </span>
          </a>

          {/* Language Selector (WCAG 2.2 AA) */}
          <LanguageSelector
            currentLang={uiLang}
            onLanguageChange={onLanguageChange || (() => {})}
            ariaLabel={t.nav.languageSelectAria}
          />

          {/* Penúltimo Item: Criar Conta (ou Assinatura / Super Admin se logado) */}
          <button
            id="btn-navbar-signup"
            type="button"
            onClick={() => {
              if (isAdmin) {
                openAdminModal();
              } else if (!user) {
                openAuthModal('register');
              } else {
                openPaywall();
              }
            }}
            className="px-4 py-1.5 rounded-full bg-[#f5be38] hover:bg-[#eab308] text-slate-950 text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-98 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" aria-hidden="true" />
            <span>{isAdmin ? t.nav.superAdmin : user ? t.nav.subscription : t.nav.createAccount}</span>
          </button>

          {/* Último Item: Entrar (se visitante) OU Menu do Usuário com Dropdown (se logado) */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 transition-colors cursor-pointer"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#1a5d38]" aria-hidden="true" />
                )}
                <span className="max-w-[85px] truncate text-[11px] font-bold">
                  {isAdmin ? 'Admin' : (user.displayName?.split(' ')[0] || user.email?.split('@')[0])}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isAdmin ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isAdmin ? t.nav.superAdmin : `Status: ${profile?.status || 'ativo'}`}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {profile?.plan || 'trial'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 truncate mt-1">
                      {user.displayName || profile?.displayName || 'Usuário Semântico'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {user.email}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500 font-semibold">Saldo:</span>
                      <span className="font-bold text-amber-800">
                        {isAdmin ? t.nav.unlimitedCredits : `${profile?.creditsBalance ?? 0} ${t.nav.credits}`}
                      </span>
                    </div>
                  </div>

                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        openPaywall();
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-amber-50 flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                      <span>{t.nav.reloadSub}</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        openAdminModal();
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#f5be38]" aria-hidden="true" />
                      <span>{t.nav.adminPanel}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 text-xs font-semibold border-t border-slate-100 mt-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.nav.logout}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              id="btn-navbar-auth"
              type="button"
              onClick={() => openAuthModal('login')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>{t.nav.login}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Header Navigation Tabs */}
      <div className="border-t border-[#E5E7EB] bg-[#FAF9F6]/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-6 sm:gap-10 text-[11px] font-medium text-slate-600 py-2 overflow-x-auto">
          <a
            href="#section-problema"
            className="hover:text-[#08121E] transition-colors whitespace-nowrap"
          >
            {t.subnav.problem}
          </a>
          <a
            href="#section-studio"
            className="text-[#08121E] font-bold border-b border-[#08121E] pb-0.5 whitespace-nowrap flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E5E3A]" />
            {t.subnav.studio}
          </a>
          <a
            href="#section-beneficios"
            className="hover:text-[#08121E] transition-colors whitespace-nowrap"
          >
            {t.subnav.benefits}
          </a>
          <a
            href="#section-como-funciona"
            className="hover:text-[#08121E] transition-colors whitespace-nowrap"
          >
            {t.subnav.howItWorks}
          </a>
        </div>
      </div>
    </header>
  );
};
