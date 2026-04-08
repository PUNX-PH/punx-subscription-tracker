import type { User } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function syncProfileToFirestore(user: User) {
  // Mirrors the `Profile` shape in `src/types/index.ts` (loosely) and keeps it up to date.
  const ref = doc(db, 'profiles', user.uid);
  const now = new Date().toISOString();

  try {
    // Attempt to update existing profile (non-destructive)
    await updateDoc(ref, {
      email: user.email ?? '',
      full_name: user.displayName ?? null,
      avatar_url: user.photoURL ?? null,
      updated_at: now,
      // Do NOT include 'role' or 'team' here to avoid overwriting them
    });
  } catch (error: any) {
    // If document doesn't exist, create it with default role
    if (error.code === 'not-found' || error.toString().includes('not-found')) {
      await setDoc(ref, {
        id: user.uid,
        email: user.email ?? '',
        full_name: user.displayName ?? null,
        role: 'employee', // Default role for new sign-ups
        team: null,
        avatar_url: user.photoURL ?? null,
        created_at: now,
        updated_at: now,
      });
    } else {
      // PERMISSION FIX: If the rules block us (permission-denied), we should NOT crash the app.
      if (error.code === 'permission-denied' || error.toString().includes('permission-denied')) {
        console.warn("Profile sync skipped due to permissions. Login proceeding (optimistic).");
        return;
      }

      // Log other errors
      console.error("Error syncing profile (update):", error);
      throw error;
    }
  }
}


