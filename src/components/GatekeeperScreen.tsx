import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  ExternalLink,
  Lock,
  Globe
} from 'lucide-react';
import { AuthSession } from '../types';
import { SemanticoLogo, SemanticoIcon } from './SemanticoLogo';

interface GatekeeperScreenProps {
  onAuthenticated: (session: AuthSession) => void;
  initialError?: string | null;
}

export const GatekeeperScreen: React.FC<GatekeeperScreenProps> = ({
  onAuthenticated,
  initialError
}) => {
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  const [autoChecking, setAutoChecking] = useState(false);

  // Check URL query parameters for ?key=... or ?token=... or ?passcode=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get('key') || params.get('token') || params.get('passcode');

    if (urlKey) {
      setPasscode(urlKey);
      verifyKey(urlKey, true);
    }
  }, []);

  const verifyKey = async (keyToTest: string, fromUrl = false) => {
    const cleanKey = keyToTest.trim();
    if (!cleanKey) {
      setErrorMessage('Por favor, digite ou cole sua chave de acesso.');
      return;
    }

    if (fromUrl) {
      setAutoChecking(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: cleanKey })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Chave de acesso inválida ou expirada.');
      }

      // Successful verification
      const session: AuthSession = {
        authenticated: true,
        token: data.token,
        label: data.label,
        expiresAt: data.expiresAt
      };

      // Store in session storage
      try {
        sessionStorage.setItem('opennre_auth_session', JSON.stringify(session));
        localStorage.setItem('opennre_access_token', data.token);
      } catch (e) {
        console.warn('Storage unavailable', e);
      }

      // Clean URL if key was in query params
      if (fromUrl && window.history && window.history.replaceState) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      onAuthenticated(session);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao autenticar com a chave informada.');
    } finally {
      setIsLoading(false);
      setAutoChecking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyKey(passcode);
  };

  return (
    <div className="min-h-screen bg-[#1c1920] flex flex-col justify-between items-center px-4 sm:px-6 lg:px-8 py-10 relative overflow-hidden font-sans">
      {/* Background Decorative Graph Mesh & Subtle Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(#fdd910_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.06] pointer-events-none" />
      
      {/* Ambient Brand Glows (Yellow & Deep Purple) */}
      <div className="absolute top-1/6 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-[#590050]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-[380px] h-[280px] bg-[#fdd910]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between py-2 border-b border-[#322e35]/70">
        <a
          href="https://semantico.com.br/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs font-semibold text-[#fdd910] hover:text-[#ffe30e] transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>semantico.com.br</span>
        </a>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#590050]/40 border border-[#590050] text-[#f038a4] text-[11px] font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>OpenNRE + Wikontic Engine</span>
          </span>
        </div>
      </header>

      {/* Main Lock Card Container */}
      <div className="max-w-md w-full relative z-10 space-y-6 my-auto pt-6 pb-6">
        {/* Brand Header with White Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <SemanticoLogo variant="white" size="xl" showTagline={true} />
          </div>
          
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Knowledge Graph Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
              Extração Neural de Relações & Engenharia Semântica de SEO
            </p>
          </div>
        </div>

        {/* Gatekeeper Card */}
        <div className="bg-[#302c33]/90 backdrop-blur-xl border-2 border-[#590050]/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-5">
          <div className="flex items-center justify-between border-b border-[#322e35] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#590050] flex items-center justify-center text-[#fdd910] border border-[#fdd910]/30 shadow-inner">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">
                  Autenticação do Studio
                </span>
                <span className="text-[10px] text-slate-400">
                  Ambiente Protegido por Token
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-[#fdd910]/15 text-[#fdd910] border border-[#fdd910]/40">
              ACESSO RESTRITO
            </span>
          </div>

          {/* Auto-checking banner when URL token present */}
          {autoChecking && (
            <div className="p-3.5 bg-[#590050]/50 border border-[#f038a4]/40 rounded-xl flex items-center gap-3 text-xs text-pink-100">
              <div className="w-4 h-4 border-2 border-[#fdd910] border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Validando chave de acesso vinculada à sua sessão...</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && !autoChecking && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-200 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-rose-300">Acesso Não Autorizado</span>
                <p className="text-rose-200 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="access-passcode"
                className="block text-xs font-bold text-slate-200"
              >
                Chave de Acesso / Senha do Testador
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#fdd910]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="access-passcode"
                  type="password"
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  placeholder="Digite sua senha de acesso"
                  disabled={isLoading || autoChecking}
                  autoFocus
                  className="block w-full pl-10 pr-4 py-3 bg-[#1e1b22] border border-[#322e35] focus:border-[#fdd910] focus:ring-2 focus:ring-[#fdd910]/30 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all disabled:opacity-50 font-mono"
                />
              </div>
            </div>

            <button
              id="btn-submit-passcode"
              type="submit"
              disabled={isLoading || autoChecking || !passcode.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#fdd910] hover:bg-[#ffe30e] active:scale-[0.99] text-[#000000] font-black text-sm shadow-lg shadow-[#fdd910]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Validando Token...</span>
                </>
              ) : (
                <>
                  <span>Desbloquear Semântico Studio</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>
          </form>

          {/* Tester note & instructions */}
          <div className="pt-3 border-t border-[#322e35] text-[11px] text-slate-300 space-y-2">
            <div className="flex items-center gap-1.5 text-[#fdd910] font-bold">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Instruções de Acesso:</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              Insira a senha fornecida pela equipe da <strong>Semântico SEO</strong> ou acerte o parâmetro{' '}
              <code className="text-[10px] text-[#fdd910] font-mono bg-[#1e1b22] px-1.5 py-0.5 rounded border border-[#590050]">
                ?key=SUA_SENHA
              </code>{' '}
              para login automático.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#907d24]" />
          <span>Sessão segura com renovação de token e expiração controlada</span>
        </div>
      </div>

      {/* Brand Footer */}
      <footer className="relative z-10 w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-2 py-3 border-t border-[#322e35]/70 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span>© {new Date().getFullYear()}</span>
          <a
            href="https://semantico.com.br/"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-white hover:text-[#fdd910] transition-colors"
          >
            Semântico SEO — Significado e Sentido
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span>Otimização Semântica & Grafos de Conhecimento</span>
        </div>
      </footer>
    </div>
  );
};
