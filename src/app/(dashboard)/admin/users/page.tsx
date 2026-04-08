'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Trash2, Shield, ShieldOff, Loader2, Search, User } from 'lucide-react';
import styles from './users.module.css';

interface UserProfile {
    uid: string;
    email?: string;
    fullName: string;
    role: string; // Job Title
    department: string;
    permissionLevel?: string; // 'admin', 'super_admin', 'employee'
    createdAt: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'user_profiles'));
            const userList: UserProfile[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                userList.push({
                    uid: doc.id,
                    ...data
                } as UserProfile);
            });
            // Sort by createdAt desc if available
            userList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

            setUsers(userList);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePromote = async (user: UserProfile) => {
        if (!confirm(`Promote ${user.fullName} to Admin?`)) return;
        setActionLoading(user.uid);
        try {
            await updateDoc(doc(db, 'user_profiles', user.uid), {
                permissionLevel: 'admin'
            });
            setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, permissionLevel: 'admin' } : u));
        } catch (error) {
            console.error("Error promoting user:", error);
            alert("Failed to update user.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDemote = async (user: UserProfile) => {
        if (!confirm(`Remove Admin permissions from ${user.fullName}?`)) return;
        setActionLoading(user.uid);
        try {
            await updateDoc(doc(db, 'user_profiles', user.uid), {
                permissionLevel: 'employee'
            });
            setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, permissionLevel: 'employee' } : u));
        } catch (error) {
            console.error("Error demoting user:", error);
            alert("Failed to update user.");
        } finally {
            setActionLoading(null);
        }
    };

    // Helper for role badge
    const getRoleBadge = (permissionLevel?: string) => {
        let badgeClass = styles.badgeEmployee;
        if (permissionLevel === 'super_admin') badgeClass = styles.badgeSuperAdmin;
        else if (permissionLevel === 'admin') badgeClass = styles.badgeAdmin;

        return (
            <span className={`${styles.badge} ${badgeClass}`}>
                {(permissionLevel === 'admin' || permissionLevel === 'super_admin') && <Shield size={10} />}
                <span className={styles.badgeText}>
                    {permissionLevel === 'super_admin' ? 'Super Admin' :
                        permissionLevel === 'admin' ? 'Admin' : 'Employee'}
                </span>
            </span>
        );
    };

    const handleDelete = async (user: UserProfile) => {
        if (!confirm(`Are you sure you want to delete user ${user.fullName}? This cannot be undone.`)) return;
        setActionLoading(user.uid);
        try {
            await deleteDoc(doc(db, 'user_profiles', user.uid));
            setUsers(prev => prev.filter(u => u.uid !== user.uid));
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Failed to delete user.");
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="animate-spin text-white/20" size={32} />
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Directory</h1>
                    <p className={styles.subtitle}>Manage team members and permissions</p>
                </div>
                <div className="flex gap-3">
                    {/* Placeholder for future actions like 'Invite User' */}
                </div>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead className={styles.thead}>
                            <tr>
                                <th className={styles.th}>Identity</th>
                                <th className={styles.th}>Role / Dept</th>
                                <th className={styles.th}>Access Level</th>
                                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tbody}>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-white/30">
                                        No users found in the active directory.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.uid}>
                                        <td className={styles.td}>
                                            <div className="flex items-center gap-4">
                                                <div className={styles.avatar}>
                                                    {(user.fullName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white">{user.fullName}</div>
                                                    <div className="text-sm text-white/40">{user.email || 'No email linked'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className="font-medium text-white/80">{user.role || 'Unassigned'}</div>
                                            <div className="text-xs text-white/40">{user.department || 'General'}</div>
                                        </td>
                                        <td className={styles.td}>
                                            {getRoleBadge(user.permissionLevel)}
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'right' }}>
                                            <div className="flex items-center justify-end gap-1">
                                                {user.permissionLevel === 'admin' || user.permissionLevel === 'super_admin' ? (
                                                    <button
                                                        onClick={() => handleDemote(user)}
                                                        disabled={!!actionLoading}
                                                        className={`${styles.actionButton} ${styles.demoteBtn}`}
                                                        title="Revoke Admin Access"
                                                    >
                                                        {actionLoading === user.uid ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={16} />}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handlePromote(user)}
                                                        disabled={!!actionLoading}
                                                        className={`${styles.actionButton} ${styles.promoteBtn}`}
                                                        title="Promote to Admin"
                                                    >
                                                        {actionLoading === user.uid ? <Loader2 size={14} className="animate-spin" /> : <Shield size={16} />}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    disabled={!!actionLoading}
                                                    className={`${styles.actionButton} ${styles.deleteBtn}`}
                                                    title="Remove from Directory"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
