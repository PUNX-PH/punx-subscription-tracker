'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function RequireOnboarding({ children }: { children: React.ReactNode }) {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [checking, setChecking] = useState(true);
    const [hasProfile, setHasProfile] = useState(false);

    useEffect(() => {
        async function checkOnboarding() {
            if (authLoading) return;

            if (!user) {
                setChecking(false);
                return;
            }

            // Skip check if already on onboarding page
            if (pathname === '/onboarding') {
                setChecking(false);
                setHasProfile(true);
                return;
            }

            try {
                // Check if user profile exists in Firestore
                const profileDoc = await getDoc(doc(db, 'user_profiles', user.uid));

                if (!profileDoc.exists() || !profileDoc.data()?.onboardingCompleted) {
                    // No profile or onboarding not completed - redirect to onboarding
                    router.replace('/onboarding');
                    return;
                }

                setHasProfile(true);
            } catch (error) {
                console.error('Error checking onboarding status:', error);
                // On error, redirect to onboarding to be safe
                router.replace('/onboarding');
            } finally {
                setChecking(false);
            }
        }

        checkOnboarding();
    }, [user, authLoading, router, pathname]);

    // Show loading state while checking
    if (authLoading || checking) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--background)',
                color: 'var(--foreground)'
            }}>
                <div>Loading...</div>
            </div>
        );
    }

    // Only render children if user has completed onboarding
    if (!hasProfile && pathname !== '/onboarding') {
        return null;
    }

    return <>{children}</>;
}
