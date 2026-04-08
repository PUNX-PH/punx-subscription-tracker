'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function RequireAdmin({ children }: { children: React.ReactNode }) {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        async function checkAdmin() {
            if (authLoading) return;

            if (!user) {
                // Not logged in -> redirect to admin login
                router.replace('/login/admin');
                return;
            }

            try {
                const profileDoc = await getDoc(doc(db, 'user_profiles', user.uid));
                if (profileDoc.exists()) {
                    const data = profileDoc.data();
                    // Check permissionLevel first (explicit), then fallback to role string (implicit)
                    const hasAdminPermission =
                        (data.permissionLevel === 'admin' || data.permissionLevel === 'super_admin') ||
                        (data.role === 'admin' || data.role === 'super_admin' || data.role?.toLowerCase().includes('admin'));

                    if (hasAdminPermission) {
                        setIsAdmin(true);
                    } else {
                        // Logged in but not admin
                        console.warn('User attempted to access admin area without permissions');
                        router.replace('/dashboard');
                    }
                } else {
                    // No profile found? strictly not admin
                    router.replace('/dashboard');
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                router.replace('/dashboard');
            } finally {
                setChecking(false);
            }
        }

        checkAdmin();
    }, [user, authLoading, router]);

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
                <div>Verifying Privileges...</div>
            </div>
        );
    }

    if (!isAdmin) return null;

    return <>{children}</>;
}
