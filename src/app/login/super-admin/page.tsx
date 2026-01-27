'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { syncProfileToFirestore } from '@/lib/syncProfile';
import { friendlyFirebaseAuthError } from '@/lib/firebaseErrors';
import { Button } from '@/components/ui/Button';
import { ShieldAlert } from 'lucide-react';
import styles from '../login.module.css';

function SuperAdminLoginContent() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextUrl = searchParams.get('next') || '/super-admin';

    const handleSuperAdminLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const cred = await signInWithPopup(auth, googleProvider);
            try {
                await syncProfileToFirestore(cred.user);

                // Strict Super Admin Check
                const userProfileDoc = await getDoc(doc(db, 'user_profiles', cred.user.uid));

                let isSuperAdmin = false;
                if (userProfileDoc.exists()) {
                    const data = userProfileDoc.data();
                    if (data.permissionLevel === 'super_admin') {
                        isSuperAdmin = true;
                    }
                }

                if (!isSuperAdmin) {
                    throw new Error('Access denied. Super Admin privileges required.');
                }

                router.push(nextUrl);
            } catch (syncErr: any) {
                console.error('Login check failed:', syncErr);
                setError(syncErr.message || 'Access denied');
                await auth.signOut();
                setLoading(false);
                return;
            }
        } catch (err: any) {
            console.error(err);
            setError(friendlyFirebaseAuthError(err));
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Super Admin Theme: Deep Red/Crimson */}
            <div className={styles.glow1} style={{ background: '#b91c1c' }} /> {/* Red-700 */}
            <div className={styles.glow2} style={{ background: '#fdba74' }} /> {/* Orange-300 */}

            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        PUNX<span className="text-red-500">.</span>
                    </h1>
                    <p className={styles.subtitle} style={{ color: '#fca5a5' }}>SUPER ADMIN CONSOLE</p>
                </div>

                <div className={styles.loginCard} style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                    <div className={styles.welcomeText}>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                <ShieldAlert size={32} className="text-red-500" />
                            </div>
                        </div>
                        <h2 className={styles.welcomeTitle}>System Core</h2>
                        <p className={styles.welcomeSub}>Authorized Personnel Only</p>
                    </div>

                    {error && (
                        <div className={styles.error} style={{ background: 'rgba(220, 38, 38, 0.1)', borderColor: 'rgba(220, 38, 38, 0.2)', color: '#fca5a5' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Button
                            variant="gradient"
                            className="w-full"
                            style={{
                                width: '100%',
                                height: '3.5rem',
                                fontSize: '1rem',
                                background: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)', // Red to Orange gradient
                                boxShadow: '0 4px 20px -5px rgba(220, 38, 38, 0.5)'
                            }}
                            onClick={handleSuperAdminLogin}
                            disabled={loading}
                        >
                            <ShieldAlert className="mr-2" size={20} />
                            <span style={{ marginLeft: '10px' }}>Verify Clearance</span>
                        </Button>

                        <div className="text-center mt-2 space-y-2">
                            <button
                                onClick={() => router.push('/login/admin')}
                                disabled={loading}
                                className="block w-full text-xs text-[var(--muted-foreground)] hover:text-purple-400 transition-colors"
                            >
                                Switch to Standard Admin Login
                            </button>
                            <button
                                onClick={() => router.push('/login')}
                                disabled={loading}
                                className="block w-full text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                            >
                                Return to Employee Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SuperAdminLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
            <SuperAdminLoginContent />
        </Suspense>
    );
}
