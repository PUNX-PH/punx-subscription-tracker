'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, PlusCircle, CreditCard, LogOut, LayoutGrid, ShieldAlert } from 'lucide-react';
// import { supabase } from '@/lib/supabase'; // Will use later for logout

// ... imports
import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/components/auth/AuthProvider';

// Define roles that can see the item
const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid, roles: ['employee', 'admin', 'super_admin'] },
    { name: 'My Requests', href: '/requests', icon: PlusCircle, roles: ['employee', 'admin', 'super_admin'] },
    { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard, roles: ['employee', 'admin', 'super_admin'] },
    { name: 'Admin Dashboard', href: '/admin', icon: LayoutGrid, roles: ['admin', 'super_admin'] },
    { name: 'Approvals', href: '/admin/requests', icon: PlusCircle, roles: ['admin', 'super_admin'] },
    { name: 'Manage Subscriptions', href: '/admin/subscriptions', icon: CreditCard, roles: ['admin', 'super_admin'] },
    { name: 'Deletion Requests', href: '/admin/deletion-requests', icon: CreditCard, roles: ['admin', 'super_admin'] },
    { name: 'User Management', href: '/admin/users', icon: ShieldAlert, roles: ['super_admin', 'admin'] },
];

import styles from './layout.module.css';

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const [userRole, setUserRole] = useState('employee');
    const [userProfile, setUserProfile] = useState<any>(null);
    const [permissionLevel, setPermissionLevel] = useState('employee'); // For access control

    useEffect(() => {
        async function fetchUserProfile() {
            if (!user) return;

            try {
                const profileDoc = await getDoc(doc(db, 'user_profiles', user.uid));
                if (profileDoc.exists()) {
                    const data = profileDoc.data();
                    setUserProfile(data);
                    setUserRole(data.role || 'employee'); // Custom role title for display
                    // Set permission level - default to 'employee' for custom roles
                    setPermissionLevel(data.permissionLevel || 'employee');
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
            }
        }

        fetchUserProfile();
    }, [user]);

    return (
        <div className={styles.sidebar}>
            <div className={styles.logoSection}>
                <h1 className={styles.logoTitle}>
                    PUNX<span className="text-gradient">.</span>
                </h1>
                <p className={styles.logoSubtitle}>SUBSCRIPTIONS</p>
            </div>

            <nav className={styles.nav}>
                {menuItems.map((item) => {
                    // Show basic items to everyone, filter admin items by permission level
                    if (!item.roles.includes(permissionLevel)) return null;

                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            href={item.href}
                            key={item.href}
                            className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                        >
                            <Icon size={18} />
                            {item.name}
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
