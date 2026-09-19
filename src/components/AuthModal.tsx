import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  KeyRound,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SemanticoLogo } from './SemanticoLogo';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      closeAuthModal();
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setError(err?.message || 'Falha ao autenticar com o Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password);
        closeAuthModal();
      } else if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error('A senha deve conter no mínimo 6 caracteres.');
        }
        await signUpWithEmail(email.trim(), password, name.trim());
        closeAuthModal();
      } else if (mode === 'reset') {
        await resetPassword(email.trim());
        setSuccessMsg('Instruções de recuperação enviadas para o seu e-mail!');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err?.message || 'Ocorreu um erro na autenticação.';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        msg = 'E-mail ou senha incorretos.';
      } else if (msg.includes('email-already-in-use')) {
        msg = 'Este e-mail já está cadastrado. Tente fazer login.';
      } else if (msg.includes('invalid-email')) {
        msg = 'Por favor, insira um e-mail válido.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="relative w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl p-6 sm:p-8 text-[#08121E] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1E5E3A] via-[#E5A93C] to-[#08121E]" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="flex justify-center">
            <SemanticoLogo variant="black" size="lg" showTagline={true} />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#08121E] mt-3">
            {mode === 'login' && 'Acessar Semântico Graph Studio'}
            {mode === 'signup' && 'Criar Conta de Assinante'}
            {mode === 'reset' && 'Recuperar Senha'}
          </h2>
          <p className="text-xs text-slate-500">
            {mode === 'login' && 'Entre com sua conta para desbloquear as ferramentas neurais.'}
            {mode === 'signup' && 'Cadastre-se para solicitar liberação e acesso aos grafos semânticos.'}
            {mode === 'reset' && 'Informe o seu e-mail para receber o link de redefinição de senha.'}
          </p>
        </div>

        {/* Google 1-Click Login Button */}
        {mode !== 'reset' && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full bg-white hover:bg-slate-50 text-[#08121E] font-bold text-xs shadow-2xs border border-slate-300 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar com o Google</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold">ou com e-mail</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-[#1E5E3A] shrink-0 mt-0.5" />
            <p className="leading-relaxed">{successMsg}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">Nome Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome ou da sua agência"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#FAF9F6] border border-slate-300 focus:border-[#08121E] focus:ring-1 focus:ring-[#08121E] rounded-xl text-xs text-[#08121E] placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700">E-mail</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full pl-9 pr-3 py-2.5 bg-[#FAF9F6] border border-slate-300 focus:border-[#08121E] focus:ring-1 focus:ring-[#08121E] rounded-xl text-xs text-[#08121E] placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700">Senha</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('reset');
                    }}
                    className="text-[10px] text-[#1E5E3A] hover:underline font-semibold"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#FAF9F6] border border-slate-300 focus:border-[#08121E] focus:ring-1 focus:ring-[#08121E] rounded-xl text-xs text-[#08121E] placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] font-bold text-xs shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#08121E] border-t-transparent rounded-full animate-spin" />
                <span>Processando...</span>
              </>
            ) : mode === 'login' ? (
              <>
                <span>Entrar no Studio</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'signup' ? (
              <>
                <span>Cadastrar & Solicitar Acesso</span>
                <Sparkles className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Enviar Link de Recuperação</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch Mode Footer */}
        <div className="mt-5 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <p>
              Ainda não tem conta?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('signup');
                }}
                className="text-[#1E5E3A] font-bold hover:underline"
              >
                Cadastre-se gratuitamente
              </button>
            </p>
          ) : (
            <p>
              Já possui uma conta cadastrada?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('login');
                }}
                className="text-[#1E5E3A] font-bold hover:underline"
              >
                Voltar para Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
