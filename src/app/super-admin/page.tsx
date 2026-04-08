'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Shield, ShieldAlert, Check, Search, Filter, MoreHorizontal, Loader2, ShieldOff, Trash2, Users, UserCog, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface UserProfile {
    uid: string;
    email?: string;
    fullName: string;
    role: string;
    department: string;
    permissionLevel?: string;
    createdAt: string;
}

const AVATAR_COLORS = [
    'bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-emerald-600', 'bg-amber-600', 'bg-indigo-600'
];

export default function SuperAdminPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Fetch profiles & user_profiles and merge
            const profilesSnapshot = await getDocs(collection(db, 'profiles'));
            const userProfilesSnapshot = await getDocs(collection(db, 'user_profiles'));

            const profilesMap = new Map();
            profilesSnapshot.forEach(doc => profilesMap.set(doc.id, { uid: doc.id, ...doc.data() }));

            const userProfilesMap = new Map();
            userProfilesSnapshot.forEach(doc => userProfilesMap.set(doc.id, doc.data()));

            const mergedList: UserProfile[] = [];
            profilesMap.forEach((baseProfile, uid) => {
                const appProfile = userProfilesMap.get(uid) || {};
                mergedList.push({
                    uid: uid,
                    email: appProfile.email || baseProfile.email || 'No Email',
                    fullName: appProfile.fullName || baseProfile.full_name || 'Unknown User',
                    role: appProfile.role || baseProfile.role || 'Unassigned',
                    department: appProfile.department || baseProfile.team || 'Unassigned',
                    permissionLevel: appProfile.permissionLevel,
                    createdAt: appProfile.createdAt || baseProfile.created_at || new Date().toISOString()
                });
            });

            // Orphans
            userProfilesMap.forEach((appProfile, uid) => {
                if (!profilesMap.has(uid)) {
                    mergedList.push({
                        uid: uid,
                        email: appProfile.email,
                        fullName: appProfile.fullName,
                        role: appProfile.role,
                        department: appProfile.department,
                        permissionLevel: appProfile.permissionLevel,
                        createdAt: appProfile.createdAt
                    } as UserProfile);
                }
            });

            mergedList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setUsers(mergedList);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newPermissionLevel: string) => {
        const action = newPermissionLevel === 'super_admin' ? 'Promote to Super Admin' :
            newPermissionLevel === 'admin' ? 'Promote to Admin' : 'Demote';

        if (!confirm(`Are you sure you want to ${action}?`)) return;

        setActionLoading(userId);
        try {
            const userRef = doc(db, 'user_profiles', userId);
            const { setDoc } = await import('firebase/firestore');
            await setDoc(userRef, { permissionLevel: newPermissionLevel, updatedAt: new Date().toISOString() }, { merge: true });
            setUsers(prev => prev.map(u => u.uid === userId ? { ...u, permissionLevel: newPermissionLevel } : u));
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("Are you sure? This action is irreversible.")) return;
        setActionLoading(userId);
        try {
            await deleteDoc(doc(db, 'user_profiles', userId));
            await deleteDoc(doc(db, 'profiles', userId));
            setUsers(prev => prev.filter(u => u.uid !== userId));
        } catch (error) {
            console.error("Error deleting user:", error);
        } finally {
            setActionLoading(null);
        }
    }

    const forceCreateProfile = async () => {
        if (!currentUser) return;
        // ... (Same logic as before, abbreviated for brevity in this prompt context but implemented fully in code below)
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'profiles', currentUser.uid), {
            email: currentUser.email, full_name: currentUser.displayName, created_at: new Date().toISOString(), role: 'employee'
        }, { merge: true });
        await setDoc(doc(db, 'user_profiles', currentUser.uid), {
            email: currentUser.email, fullName: currentUser.displayName, role: 'System Admin', department: 'IT', permissionLevel: 'super_admin', createdAt: new Date().toISOString()
        }, { merge: true });
        window.location.reload();
    }

    const getRandomColor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

    const filteredUsers = users.filter(user =>
        (user.fullName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    // Stats
    const totalAdmins = users.filter(u => u.permissionLevel === 'admin').length;
    const totalSupers = users.filter(u => u.permissionLevel === 'super_admin').length;

    if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-white/20" size={32} /></div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
                        Super Admin <span className="text-white/30 font-light">Console</span>
                    </h1>
                    <p className="text-white/50 text-sm max-w-lg">
                        Manage global permissions and system access. Changes made here affect the entire organization immediately.
                    </p>
                </div>

                {/* Simple Stats Row */}
                <div className="flex gap-4">
                    <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 flex items-center gap-3 backdrop-blur-md shadow-lg">
                        <Users className="w-5 h-5 text-blue-400" />
                        <div>
                            <p className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">Total Users</p>
                            <p className="text-xl font-bold text-white">{users.length}</p>
                        </div>
                    </div>
                    <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 flex items-center gap-3 backdrop-blur-md shadow-lg">
                        <ShieldCheck className="w-5 h-5 text-purple-400" />
                        <div>
                            <p className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">Admins</p>
                            <p className="text-xl font-bold text-white">{totalAdmins}</p>
                        </div>
                    </div>
                    <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 flex items-center gap-3 backdrop-blur-md shadow-lg">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        <div>
                            <p className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">Supers</p>
                            <p className="text-xl font-bold text-white">{totalSupers}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recovery Box */}
            {(users.length === 0 && currentUser) && (
                <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 p-4 rounded-lg flex items-center justify-between">
                    <span className="text-red-400 text-sm font-medium">⚠️ No user database found. Initialize system?</span>
                    <Button size="sm" onClick={forceCreateProfile} className="bg-red-600 hover:bg-red-500 text-white border-0">Initialize My Account</Button>
                </div>
            )}

            {/* Main Content Panel */}
            <div className="bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/5">

                {/* Toolkit Bar */}
                <div className="p-6 border-b border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 bg-white/[0.02]">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-white/50 z-10" />
                        <Input
                            placeholder="Find user by name or email..."
                            className="bg-black/40 border-white/10 text-white placeholder:text-white/40 pl-10 h-10 focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all rounded-md"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white/5 border-b border-white/5">
                            <TableRow className="border-none hover:bg-transparent">
                                <TableHead className="text-white/60 font-medium uppercase text-[11px] tracking-wider pl-6">Identity</TableHead>
                                <TableHead className="text-white/60 font-medium uppercase text-[11px] tracking-wider">Role</TableHead>
                                <TableHead className="text-white/60 font-medium uppercase text-[11px] tracking-wider">Clearance</TableHead>
                                <TableHead className="text-white/60 font-medium uppercase text-[11px] tracking-wider text-right pr-6">Manage</TableHead>
                            </TableRow>
                        </TableHeader>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((user) => (
                                <TableRow key={user.uid} className="border-none hover:bg-white/[0.02] transition-colors group">
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-lg ${getRandomColor(user.uid)}`}>
                                                {(user.fullName?.charAt(0) || '?').toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium text-sm">{user.fullName}</p>
                                                <p className="text-white/40 text-xs">{user.email || 'No email linked'}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-white/80 text-sm">{user.role || 'Unassigned'}</span>
                                            <span className="text-white/30 text-xs">{user.department || 'General'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {user.permissionLevel === 'super_admin' ? (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold tracking-wide">
                                                <ShieldAlert className="w-3 h-3" /> SUPER ADMIN
                                            </div>
                                        ) : user.permissionLevel === 'admin' ? (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-semibold tracking-wide">
                                                <ShieldCheck className="w-3 h-3" /> ADMIN
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 text-[11px] font-medium tracking-wide">
                                                EMPLOYEE
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            {actionLoading === user.uid ? (
                                                <Loader2 className="animate-spin text-white/30" size={16} />
                                            ) : (
                                                <>
                                                    {user.permissionLevel !== 'super_admin' && (
                                                        <>
                                                            {user.permissionLevel !== 'admin' && (
                                                                <Button variant="ghost" size="sm" onClick={() => handleRoleChange(user.uid, 'admin')} className="h-8 text-xs text-white/50 hover:text-purple-400 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20">
                                                                    Promote Admin
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRoleChange(user.uid, 'super_admin')}
                                                                className="h-8 text-xs text-white/50 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                                                            >
                                                                Make Super
                                                            </Button>
                                                        </>
                                                    )}

                                                    {user.permissionLevel === 'super_admin' && (
                                                        <Button variant="ghost" size="sm" onClick={() => handleRoleChange(user.uid, 'admin')} className="h-8 text-xs text-orange-400/70 hover:text-orange-400 hover:bg-orange-500/10">
                                                            Downgrade
                                                        </Button>
                                                    )}

                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(user.uid)} className="h-8 w-8 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-md">
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredUsers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-white/30">
                                        No users match your search.
                                    </TableCell>
                                </TableRow>
                            )}
                        </tbody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
