'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowRight, ArrowUpRight, CheckCircle, XCircle, Clock, DollarSign, Users, RefreshCw, Plus, CreditCard, Loader2 } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import styles from './admin.module.css';

interface Subscription {
    id: string;
    tool_name: string;
    amount: number;
    currency: string;
    status: string;
    renewal_date: string;
    billing_type: string;
}

interface Request {
    id: string;
    tool_name: string;
    requesterName?: string;
    created_at: string;
    status: string;
}

interface DashboardStats {
    totalMonthly: number;
    totalAnnual: number;
    activeCount: number;
    pendingCount: number;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        totalMonthly: 0,
        totalAnnual: 0,
        activeCount: 0,
        pendingCount: 0
    });
    const [renewals, setRenewals] = useState<Subscription[]>([]);
    const [recentRequests, setRecentRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Subscriptions
            const subSnapshot = await getDocs(collection(db, 'subscriptions'));
            const subs: Subscription[] = [];
            let mrr = 0;
            let arr = 0;
            let active = 0;

            subSnapshot.forEach(doc => {
                const data = doc.data();
                const sub = { id: doc.id, ...data } as Subscription;
                subs.push(sub);

                if (sub.status === 'active') {
                    active++;
                    if (sub.billing_type === 'monthly') mrr += Number(sub.amount || 0);
                    if (sub.billing_type === 'annual') arr += Number(sub.amount || 0);
                }
            });

            // 2. Fetch Requests
            const reqSnapshot = await getDocs(collection(db, 'subscription_requests'));
            let pending = 0;
            const reqs: Request[] = [];

            reqSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.status === 'pending_approval') pending++;

                reqs.push({
                    id: doc.id,
                    tool_name: data.tool_name,
                    status: data.status,
                    created_at: data.created_at,
                    requesterName: 'User Request'
                });
            });

            setStats({
                totalMonthly: mrr,
                totalAnnual: arr,
                activeCount: active,
                pendingCount: pending
            });

            // 3. Process Renewals
            const upcoming = subs
                .filter(s => s.status === 'active')
                .sort((a, b) => new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime())
                .slice(0, 5);
            setRenewals(upcoming);

            // 4. Process Recent Requests
            const recent = reqs
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5);
            setRecentRequests(recent);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-white/20" size={32} />
            </div>
        );
    }

    const statsCards = [
        {
            label: 'Monthly Cost',
            value: `₱${stats.totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            icon: DollarSign,
            variant: 'emerald'
        },
        {
            label: 'Annual Cost',
            value: `₱${stats.totalAnnual.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            icon: CreditCard,
            variant: 'blue'
        },
        {
            label: 'Active Subs',
            value: stats.activeCount.toString(),
            icon: RefreshCw,
            variant: 'purple'
        },
        {
            label: 'Pending Requests',
            value: stats.pendingCount.toString(),
            icon: Users,
            variant: 'amber',
            showPulse: stats.pendingCount > 0
        },
    ];

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <div className={styles.titleSection}>
                        <h1 className={styles.title}>Dashboard</h1>
                        <p className={styles.subtitle}>System overview and activity log</p>
                    </div>
                    <div className={styles.headerActions}>
                        <Button variant="ghost" onClick={fetchDashboardData} className="gap-2">
                            <RefreshCw size={16} />
                            Sync Data
                        </Button>
                        <Link href="/requests/new">
                            <Button variant="gradient" className="gap-2">
                                <Plus size={16} />
                                Add Request
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                {statsCards.map((stat) => {
                    const Icon = stat.icon;
                    const cardClass = `${styles.statCard} ${styles[`statCard${stat.variant.charAt(0).toUpperCase() + stat.variant.slice(1)}`]}`;

                    return (
                        <div key={stat.label} className={cardClass}>
                            <div className={styles.statCardHeader}>
                                <div className={styles.statIconBg}>
                                    <Icon size={24} />
                                </div>
                                {stat.showPulse && (
                                    <div className={styles.statPulse} />
                                )}
                            </div>
                            <div className={styles.statContent}>
                                <h3 className={styles.statValue}>{stat.value}</h3>
                                <p className={styles.statLabel}>{stat.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Content Grid */}
            <div className={styles.contentGrid}>
                {/* Recent Requests - Full Width */}
                <div className={styles.tableCard} style={{ gridColumn: '1 / -1' }}>
                    <div className={styles.tableHeader}>
                        <div>
                            <h3 className={styles.tableTitle}>Recent Requests</h3>
                            <p className={styles.tableSubtitle}>Latest activity</p>
                        </div>
                        <Link href="/admin/requests" className={styles.viewAllBtn}>
                            Manage Requests <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className={styles.tableContent}>
                        <Table className="border-0">
                            <TableHeader className="bg-white/5 border-b border-white/5">
                                <TableHead className="text-white/60 text-left" style={{ width: '40%' }}>Tool</TableHead>
                                <TableHead className="text-white/60 text-left" style={{ width: '30%' }}>Date</TableHead>
                                <TableHead className="text-white/60 text-left" style={{ width: '30%' }}>Status</TableHead>
                            </TableHeader>
                            <tbody>
                                {recentRequests.map((req) => (
                                    <TableRow key={req.id} className={`${styles.requestRow} hover:bg-white/[0.02] transition-colors duration-200`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                        <TableCell className="font-medium text-white" style={{ padding: '32px 24px', textAlign: 'left' }}>
                                            {req.tool_name}
                                        </TableCell>
                                        <TableCell className="text-white/70 text-sm" style={{ padding: '32px 24px', textAlign: 'left' }}>
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell style={{ padding: '32px 24px', textAlign: 'left' }}>
                                            <div className="flex items-center gap-2">
                                                {req.status === 'approved' && <CheckCircle size={16} className="text-emerald-400" />}
                                                {req.status === 'rejected' && <XCircle size={16} className="text-red-400" />}
                                                {req.status === 'pending_approval' && <Clock size={16} className="text-amber-400" />}
                                                <span className={`text-xs font-semibold tracking-wide uppercase ${req.status === 'approved' ? 'text-emerald-400' :
                                                    req.status === 'rejected' ? 'text-red-400' :
                                                        'text-amber-400'
                                                    }`}>
                                                    {req.status === 'pending_approval' ? 'Pending' : req.status}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {recentRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className={styles.emptyState}>
                                            No requests found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}
