'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { syncProfileToFirestore } from '@/lib/syncProfile';
import { friendlyFirebaseAuthError } from '@/lib/firebaseErrors';
import { Button } from '@/components/ui/Button';
import { ShieldCheck } from 'lucide-react';
import styles from '../login.module.css'; // Reusing login styles

function AdminLoginContent() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextUrl = searchParams.get('next') || '/admin'; // Default to admin dashboard

    const handleAdminLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const cred = await signInWithPopup(auth, googleProvider);
            try {
                await syncProfileToFirestore(cred.user);

                // Strict Admin Check
                const userProfileDoc = await getDoc(doc(db, 'user_profiles', cred.user.uid));

                let isAdmin = false;
                if (userProfileDoc.exists()) {
                    const data = userProfileDoc.data();
                    if (
                        (data.permissionLevel === 'admin' || data.permissionLevel === 'super_admin') ||
                        (data.role === 'admin' || data.role === 'super_admin' || data.role?.toLowerCase().includes('admin'))
                    ) {
                        isAdmin = true;
                    }
                }

                if (!isAdmin) {
                    throw new Error('Access denied. You do not have administrator permissions.');
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
            {/* Ambient Glow Effects - slight color shift for admin? */}
            <div className={styles.glow1} style={{ background: '#7c3aed' }} /> {/* Violet */}
            <div className={styles.glow2} style={{ background: '#db2777' }} /> {/* Pink */}

            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        PUNX<span className="text-gradient">.</span>
                    </h1>
                    <p className={styles.subtitle} style={{ color: '#d8b4fe' }}>Admin Portal</p>
                </div>

                <div className={styles.loginCard} style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                    <div className={styles.welcomeText}>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-violet-500/10 rounded-full border border-violet-500/20">
                                <ShieldCheck size={32} className="text-violet-400" />
                            </div>
                        </div>
                        <h2 className={styles.welcomeTitle}>Admin Access</h2>
                        <p className={styles.welcomeSub}>Secure login for administrators</p>
                    </div>

                    {error && (
                        <div className={styles.error}>
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
                                background: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)' // Admin gradient
                            }}
                            onClick={handleAdminLogin}
                            disabled={loading}
                        >
                            <ShieldCheck className="mr-2" size={20} />
                            <span style={{ marginLeft: '10px' }}>Admin Login with Google</span>
                        </Button>

                        <div className="text-center mt-2">
                            <button
                                onClick={() => router.push('/login')}
                                disabled={loading}
                                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
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

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
            <AdminLoginContent />
        </Suspense>
    );
}
