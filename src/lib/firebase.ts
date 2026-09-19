import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole, UserStatus, SubscriptionPlan } from '../types';

export const SUPER_ADMIN_EMAIL = 'alexrodrigues43@gmail.com';

// Initialize Firebase App (idempotent)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with explicit database ID from configuration
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
 * Checks if an email is the configured Super Administrator
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Ensures or provisions a UserProfile in Firestore upon login
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const isSuperAdmin = isSuperAdminEmail(user.email);

  try {
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const existingData = snap.data() as UserProfile;

      // If this is the super admin and role/status needs enforcement:
      if (isSuperAdmin && (existingData.role !== 'admin' || existingData.status !== 'active' || existingData.plan !== 'lifetime')) {
        const updatedAdmin: Partial<UserProfile> = {
          role: 'admin',
          status: 'active',
          plan: 'lifetime',
          updatedAt: new Date().toISOString()
        };
        await updateDoc(userRef, updatedAdmin);
        return {
          ...existingData,
          ...updatedAdmin
        };
      }

      return existingData;
    }

    // New profile creation
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Usuário Semântico',
      role: isSuperAdmin ? 'admin' : 'client',
      status: isSuperAdmin ? 'active' : 'pending',
      plan: isSuperAdmin ? 'lifetime' : 'trial',
      createdAt: new Date().toISOString(),
      notes: isSuperAdmin ? 'Super Administrador Automático' : 'Novo cadastro aguardando liberação',
      usageCount: 0
    };

    await setDoc(userRef, newProfile);
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
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
