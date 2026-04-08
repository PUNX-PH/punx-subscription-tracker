'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { PlusCircle, CreditCard, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import styles from './dashboard.module.css';

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        activeSubscriptions: 0,
        pendingRequests: 0,
        monthlySpend: 0
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // Fetch active subscriptions count and monthly spend
        const subscriptionsQuery = query(
            collection(db, 'subscriptions'),
            where('user_id', '==', user.uid),
            where('status', '==', 'active')
        );

        const unsubSubscriptions = onSnapshot(subscriptionsQuery, (snapshot) => {
            let monthlyTotal = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.billing_type === 'monthly') {
                    monthlyTotal += Number(data.amount || 0);
                }
            });
            setStats(prev => ({
                ...prev,
                activeSubscriptions: snapshot.size,
                monthlySpend: monthlyTotal
            }));
        }, (error) => {
            console.error('Error fetching subscriptions:', error);
        });

        // Fetch pending requests count
        const requestsQuery = query(
            collection(db, 'subscription_requests'),
            where('requester_id', '==', user.uid),
            where('status', '==', 'pending_approval')
        );

        const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
            setStats(prev => ({ ...prev, pendingRequests: snapshot.size }));
        }, (error) => {
            console.error('Error fetching requests:', error);
            setLoading(false);
        });

        // Fetch recent activity (last 5 requests)
        const activityQuery = query(
            collection(db, 'subscription_requests'),
            where('requester_id', '==', user.uid),
            orderBy('created_at', 'desc'),
            limit(5)
        );

        const unsubActivity = onSnapshot(activityQuery, (snapshot) => {
            const activities = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    action: data.status === 'pending_approval' ? 'Request Submitted' :
                        data.status === 'approved' ? 'Request Approved' : 'Request Rejected',
                    tool: data.tool_name,
                    date: formatDate(data.created_at),
                    status: data.status
                };
            });
            setRecentActivity(activities);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching activity:', error);
            // Still show the dashboard even if activity fails to load
            setLoading(false);
        });

        return () => {
            unsubSubscriptions();
            unsubRequests();
            unsubActivity();
        };
    }, [user]);

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Recently';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    const STATS = [
        { label: 'Active Subscriptions', value: stats.activeSubscriptions.toString(), icon: CheckCircle, colorClass: 'text-emerald-400', href: '/subscriptions' },
        { label: 'Pending Requests', value: stats.pendingRequests.toString(), icon: Clock, colorClass: 'text-amber-400', href: '/requests' },
        { label: 'Monthly Spend', value: `₱ ${stats.monthlySpend.toFixed(2)}`, icon: CreditCard, colorClass: 'text-blue-400', href: null },
    ];

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <div className={styles.title} style={{ opacity: 0.3 }}>Dashboard</div>
                        <div className={styles.subtitle} style={{ opacity: 0.3 }}>Loading your data...</div>
                    </div>
                </div>
                <div className={styles.statsGrid}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={styles.statCard} style={{
                            background: 'rgba(17, 0, 23, 0.4)',
                            animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`
                        }}>
                            <div style={{ height: '120px' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Welcome Section */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Dashboard</h1>
                    <p className={styles.subtitle}>
                        Welcome back, {user?.email?.split('@')[0] || 'there'}. Here's what's happening.
                    </p>
                </div>
                <Link href="/requests/new">
                    <Button variant="gradient">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Request
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                {STATS.map((stat) => {
                    const Icon = stat.icon;
                    const CardContent = (
                        <>
                            <Icon className={styles.cardWatermark} size={120} />
                            <div className="relative z-10">
                                <div className={`${styles.iconWrapper} ${stat.colorClass}`}>
                                    <Icon size={24} />
                                </div>
                                <h3 className={styles.statValue}>{stat.value}</h3>
                                <p className={styles.statLabel}>{stat.label}</p>
                            </div>
                        </>
                    );

                    return stat.href ? (
                        <Link key={stat.label} href={stat.href}>
                            <div className={`${styles.statCard} ${styles.statCardClickable}`}>
                                {CardContent}
                            </div>
                        </Link>
                    ) : (
                        <div key={stat.label} className={styles.statCard}>
                            {CardContent}
                        </div>
                    );
                })}
            </div>

            {/* Recent Activity */}
            <div className={styles.activityCard}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Recent Activity</h3>
                    <Link href="/requests" className={styles.viewAll}>View All</Link>
                </div>
                <div>
                    {recentActivity.length > 0 ? (
                        recentActivity.map((item) => {
                            // Determine icon and style based on status
                            let IconComponent;
                            let iconClass = styles.activityIcon;

                            if (item.status === 'approved') {
                                IconComponent = CheckCircle;
                                iconClass += ` ${styles.activityIconApproved}`;
                            } else if (item.status === 'rejected') {
                                IconComponent = XCircle;
                                iconClass += ` ${styles.activityIconRejected}`;
                            } else {
                                IconComponent = Clock;
                                iconClass += ` ${styles.activityIconPending}`;
                            }

                            return (
                                <div key={item.id} className={styles.activityItem}>
                                    <div className={styles.activityContent}>
                                        <div className={iconClass}>
                                            <IconComponent size={18} />
                                        </div>
                                        <div className={styles.activityDetails}>
                                            <p className={styles.activityText}>{item.action}</p>
                                            <p className={styles.activitySub}>{item.tool}</p>
                                        </div>
                                    </div>
                                    <span className={styles.activityDate}>{item.date}</span>
                                </div>
                            );
                        })
                    ) : (
                        <div className={styles.activityItem}>
                            <p className={styles.activityText}>No recent activity</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
