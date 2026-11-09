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
  UserCheck,
  QrCode,
  Zap
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

  const cobradorUrl = 'https://semantico-cobrador-316925929262.us-central1.run.app';
  const whatsappUrl = `https://wa.me/5551989011709?text=${encodeURIComponent(
    `Olá Alex! Sou usuário do Semântico Graph Studio (${user?.email || 'novo usuário'}) e gostaria de assinar/recarregar créditos via PIX.`
  )}`;

  const isOutOfCredits = user && (profile?.creditsBalance ?? 0) <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="relative w-full max-w-lg bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl p-6 sm:p-7 text-[#08121E] overflow-hidden max-h-[90vh] overflow-y-auto"
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
        <div className="text-center space-y-2 mb-5">
          <div className="flex justify-center">
            <SemanticoLogo variant="black" size="lg" showTagline={true} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E5E3A]/10 border border-[#1E5E3A]/20 text-[#1E5E3A] text-xs font-bold">
            {isOutOfCredits ? <Zap className="w-3.5 h-3.5 text-[#E5A93C]" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isOutOfCredits ? 'Créditos Esgotados' : 'Carteira da Suíte Semântico'}</span>
          </div>

          <h3 className="font-serif text-2xl font-bold text-[#08121E] tracking-tight">
            {!user
              ? 'Conecte-se e Ganhe 10 Créditos Grátis'
              : isOutOfCredits
              ? 'Recarregue ou Assine a Suíte'
              : 'Recurso da Suíte Semântico'}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            {paywallReason}
          </p>

          {user && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
              <span>Saldo Atual:</span>
              <span className="font-extrabold text-amber-700">{profile?.creditsBalance ?? 0} créditos</span>
            </div>
          )}
        </div>

        {/* Plan Cards for Logged in Users */}
        {user ? (
          <div className="space-y-2.5 mb-5">
            <div className="p-3 rounded-xl border-2 border-amber-400 bg-amber-50/60 relative">
              <span className="absolute -top-2.5 right-3 bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                Mais Popular
              </span>
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-900">Plano Especialista</h4>
                <span className="text-xs font-black text-slate-950">R$ 247/mês</span>
              </div>
              <p className="text-[11px] text-slate-600">
                <strong>150 créditos unificados</strong> mensais válidos em todas as 6 ferramentas.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-0.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900">Recarga Avulsa (100 Créditos)</h4>
                <span className="text-xs font-black text-slate-950">R$ 97 avulso</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Créditos adicionais imediatos sem data de expiração.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-0.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900">Plano Agência</h4>
                <span className="text-xs font-black text-slate-950">R$ 697/mês</span>
              </div>
              <p className="text-[11px] text-slate-500">
                <strong>600 créditos unificados</strong> para times e alta demanda.
              </p>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {!user ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  closePaywall();
                  openAuthModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] font-bold text-xs shadow-xs transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Criar Conta e Receber 10 Créditos</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={closePaywall}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 text-center"
              >
                Continuar Navegando
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <a
                href={cobradorUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] font-extrabold text-xs shadow-xs transition-all active:scale-[0.99] cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Pagar via PIX no Cobrador Semântico</span>
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Falar no WhatsApp para Liberação Imediata</span>
              </a>

              <button
                type="button"
                onClick={closePaywall}
                className="py-2 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 text-center"
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
