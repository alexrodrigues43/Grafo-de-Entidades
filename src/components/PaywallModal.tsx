import React from 'react';
import {
  X,
  Lock,
  Clock,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  MessageCircle,
  Sparkles,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SemanticoLogo } from './SemanticoLogo';

export const PaywallModal: React.FC = () => {
  const {
    isPaywallOpen,
    closePaywall,
    paywallReason,
    user,
    profile,
    isPending,
    isBlocked,
    openAuthModal
  } = useAuth();

  if (!isPaywallOpen) return null;

  const whatsappMessage = encodeURIComponent(
    `Olá equipe Semântico SEO! Criei minha conta no Semântico Graph Studio (${user?.email || 'meu email'}) e gostaria de solicitar a liberação do meu acesso de assinante.`
  );
  const whatsappUrl = `https://wa.me/5511999999999?text=${whatsappMessage}`; // Link amigável de liberação

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="relative w-full max-w-lg bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl p-6 sm:p-8 text-[#08121E] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1E5E3A] via-[#E5A93C] to-[#08121E]" />

        {/* Close */}
        <button
          onClick={closePaywall}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          title="Fechar aviso"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="flex justify-center">
            <SemanticoLogo variant="black" size="lg" showTagline={true} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E5E3A]/10 border border-[#1E5E3A]/20 text-[#1E5E3A] text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Acesso Exclusivo a Assinantes</span>
          </div>

          <h3 className="font-serif text-2xl font-bold text-[#08121E] tracking-tight">
            {!user
              ? 'Conecte-se para Liberar a Ferramenta'
              : isPending
              ? 'Solicitação em Análise'
              : 'Assinatura Necessária'}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            {paywallReason}
          </p>
        </div>

        {/* Real-time Status Card if Logged in */}
        {user ? (
          <div className="bg-[#FAF9F6] border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
              <span className="text-slate-500">Conta Conectada:</span>
              <span className="font-mono font-bold text-[#08121E] truncate max-w-[200px]">
                {user.email}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Status de Liberação:</span>
              {isPending ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold animate-pulse">
                  <Clock className="w-3 h-3 text-[#D97706]" />
                  Aguardando Aprovação do Admin
                </span>
              ) : isBlocked ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300 text-[11px] font-bold">
                  <Lock className="w-3 h-3 text-rose-600" />
                  Bloqueado / Expirado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-bold">
                  <CheckCircle className="w-3 h-3 text-[#1E5E3A]" />
                  Acesso Liberado!
                </span>
              )}
            </div>

            {isPending && (
              <div className="pt-2 border-t border-slate-200 text-[11px] text-amber-800 flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin shrink-0" />
                <span>
                  Sincronização em tempo real ativa: assim que o admin liberar seu perfil, este aviso fechará automaticamente.
                </span>
              </div>
            )}
          </div>
        ) : null}

        {/* Benefits list */}
        <div className="bg-[#FAF9F6] border border-slate-200 rounded-xl p-4 mb-6 space-y-2 text-xs text-slate-700">
          <div className="text-[11px] font-bold text-[#08121E] uppercase tracking-wide mb-1">
            O que está incluído no acesso do Studio:
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-[#1E5E3A] shrink-0" />
            <span>Extração neural de relações com taxonomias Wiki80 e TACRED</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-[#1E5E3A] shrink-0" />
            <span>Diagnóstico e otimizador editorial semântico com IA</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-[#1E5E3A] shrink-0" />
            <span>Exportação para Neo4j (Cypher), RDF/Turtle e JSON-LD</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!user ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  closePaywall();
                  openAuthModal();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] font-bold text-xs shadow-xs transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Fazer Login ou Cadastrar</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="https://semantico.com.br/contato"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-white hover:bg-slate-50 text-[#08121E] font-bold text-xs transition-all border border-slate-300 shadow-2xs cursor-pointer"
              >
                <span>Conhecer Planos</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href="https://semantico.com.br/contato"
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] font-bold text-xs shadow-xs transition-all active:scale-[0.99] cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Solicitar Liberação / Suporte</span>
              </a>

              <button
                type="button"
                onClick={closePaywall}
                className="py-3 px-5 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Continuar Navegando
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
