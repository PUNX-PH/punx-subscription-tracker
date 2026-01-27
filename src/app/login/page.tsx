'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { syncProfileToFirestore } from '@/lib/syncProfile';
import { friendlyFirebaseAuthError } from '@/lib/firebaseErrors';
import { Button } from '@/components/ui/Button';
import { Chrome } from 'lucide-react';

import styles from './login.module.css';

function LoginContent() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextUrl = searchParams.get('next') || '/dashboard';

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const cred = await signInWithPopup(auth, googleProvider);
            try {
                await syncProfileToFirestore(cred.user);
            } catch (syncErr: any) {
                console.error('Login successful, but profile sync failed:', syncErr);
                // Proceed anyway
            }
            router.push(nextUrl);
        } catch (err: any) {
            console.error(err);
            setError(friendlyFirebaseAuthError(err));
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Ambient Glow Effects */}
            <div className={styles.glow1} />
            <div className={styles.glow2} />

            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        PUNX<span className="text-gradient">.</span>
                    </h1>
                    <p className={styles.subtitle}>Subscription Management</p>
                </div>

                <div className={styles.loginCard}>
                    <div className={styles.welcomeText}>
                        <h2 className={styles.welcomeTitle}>Welcome back</h2>
                        <p className={styles.welcomeSub}>Sign in to access your workspace</p>
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
                            style={{ width: '100%', height: '3.5rem', fontSize: '1rem' }}
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            <Chrome className="mr-2" size={20} />
                            <span style={{ marginLeft: '10px' }}>Continue with Google</span>
                        </Button>


                    </div>

                    <p className={styles.terms}>
                        By clicking continue, you agree to our <a href="#" className={styles.link}>Terms of Service</a> and <a href="#" className={styles.link}>Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className={styles.container}><div className="text-white">Loading...</div></div>}>
            <LoginContent />
        </Suspense>
    );
}
