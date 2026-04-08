'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, PlusCircle, CreditCard, LogOut, LayoutGrid, ShieldAlert, CalendarX } from 'lucide-react';

import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '@/components/auth/AuthProvider';

import styles from './layout.module.css';

const menuItems = [
    { name: 'Dashboard',             href: '/dashboard',                   icon: LayoutGrid, roles: ['employee', 'admin', 'super_admin'], badgeKey: null },
    { name: 'My Requests',           href: '/requests',                    icon: PlusCircle, roles: ['employee', 'admin', 'super_admin'], badgeKey: null },
    { name: 'Subscriptions',         href: '/subscriptions',               icon: CreditCard, roles: ['employee', 'admin', 'super_admin'], badgeKey: null },
    { name: 'Admin Dashboard',       href: '/admin',                       icon: LayoutGrid, roles: ['admin', 'super_admin'],             badgeKey: null },
    { name: 'Approvals',             href: '/admin/requests',              icon: PlusCircle, roles: ['admin', 'super_admin'],             badgeKey: 'approvals' },
    { name: 'Manage Subscriptions',  href: '/admin/subscriptions',         icon: CreditCard, roles: ['admin', 'super_admin'],             badgeKey: null },
    { name: 'Deletion Requests',     href: '/admin/deletion-requests',     icon: CreditCard, roles: ['admin', 'super_admin'],             badgeKey: 'deletions' },
    { name: 'Unsubscribe Schedule',  href: '/admin/unsubscribe-schedule',  icon: CalendarX,  roles: ['admin', 'super_admin'],             badgeKey: 'unsubscribe' },
    { name: 'User Management',       href: '/admin/users',                 icon: ShieldAlert, roles: ['super_admin', 'admin'],            badgeKey: null },
];

type BadgeCounts = {
    approvals: number;
    deletions: number;
    unsubscribe: number;
};

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const [userRole, setUserRole] = useState('employee');
    const [permissionLevel, setPermissionLevel] = useState('employee');
    const [badges, setBadges] = useState<BadgeCounts>({ approvals: 0, deletions: 0, unsubscribe: 0 });

    useEffect(() => {
        async function fetchUserProfile() {
            if (!user) return;
            try {
                const profileDoc = await getDoc(doc(db, 'user_profiles', user.uid));
                if (profileDoc.exists()) {
                    const data = profileDoc.data();
                    setUserRole(data.role || 'employee');
                    setPermissionLevel(data.permissionLevel || 'employee');
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
            }
        }
        fetchUserProfile();
    }, [user]);

    // Clear badge when admin visits the relevant page
    useEffect(() => {
        if (pathname === '/admin/requests')             setBadges(b => ({ ...b, approvals: 0 }));
        if (pathname === '/admin/deletion-requests')    setBadges(b => ({ ...b, deletions: 0 }));
        if (pathname === '/admin/unsubscribe-schedule') setBadges(b => ({ ...b, unsubscribe: 0 }));
    }, [pathname]);

    // Fetch badge counts once permission level is known to be admin
    useEffect(() => {
        if (permissionLevel !== 'admin' && permissionLevel !== 'super_admin') return;

        async function fetchCounts() {
            try {
                const todayStr = new Date().toISOString().split('T')[0];

                const [approvalsSnap, deletionsSnap, unsubSnap] = await Promise.all([
                    getDocs(query(collection(db, 'subscription_requests'), where('status', '==', 'pending_approval'))),
                    getDocs(query(collection(db, 'deletion_requests'), where('status', '==', 'pending'))),
                    getDocs(query(collection(db, 'subscriptions'), where('planned_unsubscribe_date', '<=', todayStr))),
                ]);
                setBadges({
                    approvals:   approvalsSnap.size,
                    deletions:   deletionsSnap.size,
                    unsubscribe: unsubSnap.size,
                });
            } catch (err) {
                console.error('Error fetching badge counts:', err);
            }
        }

        fetchCounts();
    }, [permissionLevel]);

    return (
        <div className={styles.sidebar}>
            <div className={styles.logoSection}>
                <h1 className={styles.logoTitle}>PUNX</h1>
                <p className={styles.logoSubtitle}>SUBSCRIPTIONS</p>
            </div>

            <nav className={styles.nav}>
                {menuItems.map((item) => {
                    if (!item.roles.includes(permissionLevel)) return null;

                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    const count = item.badgeKey ? badges[item.badgeKey as keyof BadgeCounts] : 0;

                    return (
                        <Link
                            href={item.href}
                            key={item.href}
                            className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                        >
                            <Icon size={18} />
                            <span style={{ flex: 1 }}>{item.name}</span>
                            {count > 0 && (
                                <span className={styles.navBadge}>{count > 99 ? '99+' : count}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <div className={styles.userInfo}>
                    <div className={styles.userAvatar}>
                        {(user?.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className={styles.userDetails}>
                        <p className={styles.userEmail}>
                            {user?.email || user?.displayName || 'User'}
                        </p>
                        <p className={styles.userRole}>{userRole.replace('_', ' ')}</p>
                    </div>
                </div>
                <button
                    className={styles.logoutBtn}
                    onClick={async () => {
                        await signOut(auth);
                        router.replace('/login');
                    }}
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
