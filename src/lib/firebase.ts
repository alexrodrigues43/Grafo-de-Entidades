import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  increment
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole, UserStatus, SubscriptionPlan } from '../types';

export const SUPER_ADMIN_EMAIL = 'alexrodrigues43@gmail.com';

// Initialize Firebase App (idempotent)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with explicit database ID from configuration (local database)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Central Database for the Suite (semantico-suite-core)
export const centralDb = getFirestore(app, 'semantico-suite-core');

// Initialize Auth
export const auth = getAuth(app);

// Auth Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Diagnostic test connection probe required by Firebase Skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection test: client offline or database provisioning in progress');
    }
    return false;
  }
}

// Error handling helper as required by Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Sanitiza recursivamente objetos removendo campos undefined para compatibilidade com o Firestore
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = sanitizeForFirestore(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean;
}

/**
 * Checks if an email is the configured Super Administrator
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Sincroniza e gerencia o perfil e carteira central do usuário (semantico-suite-core)
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(centralDb, 'users', user.uid);
  const isSuperAdmin = isSuperAdminEmail(user.email);
  const now = new Date().toISOString();

  try {
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const existingData = snap.data() as UserProfile;
      const updates: Partial<UserProfile> = {
        lastLoginAt: now,
        lastAppUsed: 'Graph Studio',
        displayName: user.displayName || existingData.displayName || user.email?.split('@')[0] || 'Usuário Semântico',
        photoURL: user.photoURL || existingData.photoURL || '',
      };

      if (isSuperAdmin) {
        updates.role = 'admin';
        updates.status = 'active';
        updates.plan = 'lifetime';
        updates.creditsBalance = 999999;
      }

      await updateDoc(userRef, sanitizeForFirestore(updates));
      return {
        ...existingData,
        ...updates
      };
    }

    // New profile creation in Central Suite
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Usuário Semântico',
      photoURL: user.photoURL || '',
      role: isSuperAdmin ? 'admin' : 'client',
      status: 'active',
      plan: isSuperAdmin ? 'lifetime' : 'trial',
      creditsBalance: isSuperAdmin ? 999999 : 10,
      creditsUsed: 0,
      createdAt: now,
      lastLoginAt: now,
      lastAppUsed: 'Graph Studio',
      notes: isSuperAdmin ? 'Super Administrador Automático' : 'Trial inicial da Suíte',
      usageCount: 0
    };

    await setDoc(userRef, sanitizeForFirestore(newProfile));

    // Grava transação inicial de trial
    if (!isSuperAdmin) {
      try {
        const txRef = doc(collection(centralDb, 'credit_transactions'));
        await setDoc(txRef, {
          id: txRef.id,
          uid: user.uid,
          userEmail: user.email || '',
          type: 'trial',
          app: 'Graph Studio',
          amount: 10,
          balanceAfter: 10,
          description: 'Bônus de degustação da Suíte Semântico (10 créditos)',
          timestamp: now,
        });
      } catch (txErr) {
        console.warn('[Carteira] Falha ao gravar transação de trial:', txErr);
      }
    }

    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

/**
 * Escuta em tempo real o saldo da carteira central no semantico-suite-core
 */
export function subscribeCentralWallet(
  uid: string,
  onUpdate: (profile: UserProfile) => void
): () => void {
  const userRef = doc(centralDb, 'users', uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as UserProfile);
      }
    },
    (err) => {
      console.warn('[Carteira Central] Erro ao sincronizar carteira:', err);
    }
  );
}

/**
 * Debita créditos atomicamente na base central semantico-suite-core e registra no extrato
 */
export async function deductCredits(
  uid: string,
  amount: number,
  actionDescription: string,
  userEmail: string
): Promise<boolean> {
  const isSuperAdmin = isSuperAdminEmail(userEmail);
  if (isSuperAdmin) return true; // Super Admin possui créditos infinitos

  const userRef = doc(centralDb, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return false;

  const currentData = snap.data() as UserProfile;
  const currentBalance = currentData.creditsBalance ?? 0;
  if (currentBalance < amount) {
    return false; // Saldo insuficiente
  }

  const now = new Date().toISOString();
  await updateDoc(userRef, {
    creditsBalance: increment(-amount),
    creditsUsed: increment(amount),
    lastAppUsed: 'Graph Studio',
    lastLoginAt: now,
  });

  // Registra no extrato de transações
  try {
    const txRef = doc(collection(centralDb, 'credit_transactions'));
    await setDoc(txRef, {
      id: txRef.id,
      uid,
      userEmail,
      type: 'usage',
      app: 'Graph Studio',
      amount: -amount,
      balanceAfter: currentBalance - amount,
      description: actionDescription,
      timestamp: now,
    });
  } catch (err) {
    console.warn('[Carteira] Falha ao registrar transação no extrato:', err);
  }

  return true;
}

/**
 * Increment user's usage count after tool run
 */
export async function incrementUserUsage(uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const current = snap.data().usageCount || 0;
      await updateDoc(userRef, {
        usageCount: current + 1,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Could not increment usageCount:', err);
  }
}

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle(): Promise<UserProfile> {
  const result = await signInWithPopup(auth, googleProvider);
  return await syncUserProfile(result.user);
}

/**
 * Sign in with Google Redirect (full-page fallback para navegadores com restrições rígidas de popup)
 */
export async function loginWithGoogleRedirect(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

export { getRedirectResult };

/**
 * Sign in with Email and Password
 */
export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return await syncUserProfile(result.user);
}

/**
 * Register with Email, Password and Name
 */
export async function registerWithEmail(email: string, pass: string, name?: string): Promise<UserProfile> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (name && name.trim()) {
    try {
      await updateProfile(result.user, { displayName: name.trim() });
    } catch (e) {
      console.warn('Could not update auth display name:', e);
    }
  }
  return await syncUserProfile(result.user);
}

/**
 * Logout
 */
export async function logoutFirebase(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Persist UI language to centralDb user profile
 */
export async function updateUserUiLang(uid: string, uiLang: 'pt' | 'en' | 'es'): Promise<void> {
  try {
    const userCentralRef = doc(centralDb, 'users', uid);
    await updateDoc(userCentralRef, {
      uiLang,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[i18n] Falha ao sincronizar uiLang com centralDb:', err);
  }
}
