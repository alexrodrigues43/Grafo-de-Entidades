import React from 'react';
import {
  Sparkles,
  ExternalLink,
  Database,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Globe,
  User,
  Sliders,
  LogIn,
  Clock,
  CheckCircle,
  Lock
} from 'lucide-react';
import { AuthSession } from '../types';
import { SemanticoLogo } from './SemanticoLogo';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  totalEntities: number;
  totalRelations: number;
  session?: AuthSession | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalEntities,
  totalRelations,
  session,
  onLogout
}) => {
  const {
    user,
    profile,
    isAdmin,
    isActiveSubscriber,
    isPending,
    isBlocked,
    openAuthModal,
    openAdminModal,
    openPaywall,
    signOut
  } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] text-[#08121E] shadow-xs">
      {/* Top Primary Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Release Pill */}
        <div className="flex items-center gap-3">
          <a
            href="https://semantico.com.br/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center hover:opacity-90 transition-opacity"
            title="Visitar Semântico SEO"
          >
            <SemanticoLogo variant="black" size="md" showTagline={true} />
          </a>

          <div className="hidden xl:flex items-center pl-3 border-l border-slate-200">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#1E5E3A]/10 text-[#1E5E3A] border border-[#1E5E3A]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E5E3A]" />
              Graph Studio Release
            </span>
          </div>
        </div>

        {/* Center Desktop Navigation Links (from Website Design System) */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-[#4A5568]">
          <a
            href="https://semantico.com.br/#servicos"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#08121E] transition-colors"
          >
            Serviços
          </a>
          <a
            href="https://semantico.com.br/#ferramentas"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#08121E] transition-colors font-semibold text-[#08121E]"
          >
            Ferramentas
          </a>
          <a
            href="https://semantico.com.br/blog"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#08121E] transition-colors"
          >
            Blog
          </a>
          <a
            href="https://semantico.com.br/podcast"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#08121E] transition-colors"
          >
            Podcasts
          </a>
          <a
            href="https://semantico.com.br/contato"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#08121E] transition-colors"
          >
            Contato
          </a>
        </nav>

        {/* Right Info, Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Graph Counters */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#FAF9F6] rounded-full text-xs font-mono text-slate-700 border border-[#E5E7EB]">
            <Database className="w-3.5 h-3.5 text-[#E5A93C]" />
            <span>
              <strong className="text-[#08121E]">{totalEntities}</strong> nós •{' '}
              <strong className="text-[#1E5E3A]">{totalRelations}</strong> relações
            </span>
          </div>

          {/* ADMIN EXCLUSIVE BUTTON: Painel Admin */}
          {isAdmin && (
            <button
              id="btn-admin-panel"
              type="button"
              onClick={openAdminModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#08121E] hover:bg-[#1A2533] border border-[#E5A93C] text-[#E5A93C] text-xs font-bold transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              title="Abrir Painel Administrativo de Assinaturas"
            >
              <Sliders className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>Painel Admin</span>
              <span className="w-2 h-2 rounded-full bg-[#E5A93C] animate-ping" />
            </button>
          )}

          {/* User Status / Subscription Indicator */}
          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-[#1E5E3A]/10 border border-[#1E5E3A]/30 rounded-full text-[11px] text-[#1E5E3A] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1E5E3A]" />
                  <span>Super Admin</span>
                </div>
              ) : isActiveSubscriber ? (
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] text-emerald-800 font-bold">
                  <CheckCircle className="w-3.5 h-3.5 text-[#1E5E3A]" />
                  <span>Assinante Ativo</span>
                </div>
              ) : isPending ? (
                <button
                  type="button"
                  onClick={() => openPaywall()}
                  className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-300 rounded-full text-[11px] text-amber-900 font-bold animate-pulse cursor-pointer hover:bg-amber-100"
                  title="Clique para ver detalhes da solicitação"
                >
                  <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Aguardando Liberação</span>
                </button>
              ) : isBlocked ? (
                <button
                  type="button"
                  onClick={() => openPaywall()}
                  className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-300 rounded-full text-[11px] text-rose-800 font-bold cursor-pointer hover:bg-rose-100"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Bloqueado</span>
                </button>
              ) : null}

              {/* User Email & Logout */}
              <div className="flex items-center gap-1.5 pl-1">
                <span
                  className="hidden md:inline-block text-xs text-slate-600 max-w-[120px] truncate font-medium"
                  title={user.email || ''}
                >
                  {user.displayName || user.email?.split('@')[0]}
                </span>

                <button
                  type="button"
                  onClick={() => signOut()}
                  className="p-1.5 rounded-full border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                  title="Sair da conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Visitor Login Button */
            <button
              id="btn-navbar-auth"
              type="button"
              onClick={openAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-[#08121E] text-xs font-semibold transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-700" />
              <span>Entrar</span>
            </button>
          )}

          {/* Flag / Language Pill */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-600 bg-slate-50 border border-slate-200">
            <span>🇧🇷</span>
            <span className="text-[10px] text-slate-400">▾</span>
          </div>

          {/* Warm Golden CTA Button: Solicitar Orçamento (From Screenshot) */}
          <a
            href="https://semantico.com.br/contato"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] text-xs font-bold transition-all shadow-xs hover:shadow-sm"
          >
            <span>Solicitar Orçamento</span>
          </a>
        </div>
      </div>

      {/* Sub-Header Navigation Tabs (from Design System screenshot) */}
      <div className="border-t border-[#E5E7EB] bg-[#FAF9F6]/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-6 sm:gap-10 text-[11px] font-medium text-slate-600 py-2 overflow-x-auto">
          <a
            href="#section-problema"
            className="hover:text-[#08121E] transition-colors whitespace-nowrap"
          >
            O Problema
          </a>
          <a
            href="#section-studio"
            className="text-[#08121E] font-bold border-b border-[#08121E] pb-0.5 whitespace-nowrap flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E5E3A]" />
            Graph Studio
          </a>
          <a
            href="#section-beneficios"
            className="hover:text-[#08121E] transition-colors whitespace-nowrap"
          >
            Benefícios
          </a>
          <a
            href="#section-como-funciona"
            className="hover:text-[#08121E] transition-colors whitespace-nowrap"
          >
            Como Funciona
          </a>
        </div>
      </div>
    </header>
  );
};
