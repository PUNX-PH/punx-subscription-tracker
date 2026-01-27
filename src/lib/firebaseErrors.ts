export function friendlyFirebaseAuthError(err: any): string {
  const code: string | undefined = err?.code;

  switch (code) {
    case 'auth/unauthorized-domain':
      return 'This domain is not allowed for Firebase Auth. Add localhost:3000 to Authorized domains in Firebase Console.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in popup is already open. Please close it and try again.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by the browser. Allow popups for this site and try again.';
    case 'auth/invalid-api-key':
      return 'Firebase configuration is invalid (API key). Check your NEXT_PUBLIC_FIREBASE_* environment variables.';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please check your email/password or try Google sign-in.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a bit and try again.';
    default:
      return err?.message || 'Authentication failed. Please try again.';
  }
}

