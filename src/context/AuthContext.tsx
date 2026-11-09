import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  syncUserProfile,
  subscribeCentralWallet,
  deductCredits,
  isSuperAdminEmail,
  testConnection,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isActiveSubscriber: boolean;
  isPending: boolean;
  isBlocked: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  isPaywallOpen: boolean;
  paywallReason: string;
  openPaywall: (reason?: string) => void;
  closePaywall: () => void;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  isAdminModalOpen: boolean;
  openAdminModal: () => void;
  closeAdminModal: () => void;
  guardAction: (action: () => void, featureName?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState('Esta funcionalidade é exclusiva para assinantes com acesso liberado.');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Initialize connection probe on mount
  useEffect(() => {
    testConnection();
  }, []);

  // Listen to Auth State
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Synchronize profile initially
          const synced = await syncUserProfile(currentUser);
          setProfile(synced);

          // Escuta em tempo real (onSnapshot) na carteira central do usuário (semantico-suite-core)
          unsubscribeProfile = subscribeCentralWallet(currentUser.uid, (data) => {
            setProfile(data);
            if ((data.status === 'active' || data.role === 'admin') && (data.creditsBalance ?? 0) > 0) {
              setIsPaywallOpen(false);
            }
          });
        } catch (err) {
          console.error('Error synchronizing user profile:', err);
        } finally {
          setLoading(false);
        }
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // Computed states
  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (isSuperAdminEmail(user.email)) return true;
    return profile?.role === 'admin';
  }, [user, profile]);

  const isActiveSubscriber = useMemo(() => {
    if (!user) return false;
    if (isAdmin) return true;
    return profile?.status === 'active';
  }, [user, profile, isAdmin]);

  const isPending = useMemo(() => {
    if (!user) return false;
    if (isAdmin) return false;
    return profile?.status === 'pending';
  }, [user, profile, isAdmin]);

  const isBlocked = useMemo(() => {
    if (!user) return false;
    if (isAdmin) return false;
    return profile?.status === 'blocked' || profile?.status === 'expired';
  }, [user, profile, isAdmin]);

  // Actions
  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    if (cred.user) {
      await syncUserProfile(cred.user);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await syncUserProfile(cred.user);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      if (name) {
        try {
          // store display name
          const { updateProfile } = await import('firebase/auth');
          await updateProfile(cred.user, { displayName: name });
        } catch (e) {
          console.warn('Could not set displayName:', e);
        }
      }
      await syncUserProfile(cred.user);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setProfile(null);
  };

  const openPaywall = (reason?: string) => {
    if (reason) setPaywallReason(reason);
    setIsPaywallOpen(true);
  };

  const closePaywall = () => {
    setIsPaywallOpen(false);
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const openAdminModal = () => setIsAdminModalOpen(true);
  const closeAdminModal = () => setIsAdminModalOpen(false);

  /**
   * Guards a key feature: verifies active subscriber and credit balance;
   * otherwise, displays the graceful paywall modal explaining access.
   */
  const guardAction = (action: () => void, featureName = 'esta ferramenta', creditCost = 1): boolean => {
    if (isAdmin) {
      action();
      return true;
    }

    if (!user) {
      openPaywall(`Para utilizar ${featureName}, é necessário estar conectado à sua conta de assinante da Suíte Semântico.`);
      return false;
    }

    if (profile?.status !== 'active') {
      const reason = isPending
        ? `Sua solicitação de acesso para ${featureName} está aguardando liberação da equipe.`
        : `O seu acesso a ${featureName} está temporariamente bloqueado ou expirado. Entre em contato para renovação.`;
      openPaywall(reason);
      return false;
    }

    const currentBalance = profile?.creditsBalance ?? 0;
    if (currentBalance < creditCost) {
      openPaywall(`A ação "${featureName}" requer ${creditCost} crédito(s), mas seu saldo atual na carteira é de ${currentBalance} crédito(s).`);
      return false;
    }

    // Debita atomicamente da carteira central
    deductCredits(profile.uid, creditCost, featureName, profile.email).catch(console.warn);
    action();
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isActiveSubscriber,
        isPending,
        isBlocked,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOut,
        isPaywallOpen,
        paywallReason,
        openPaywall,
        closePaywall,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        isAdminModalOpen,
        openAdminModal,
        closeAdminModal,
        guardAction
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
