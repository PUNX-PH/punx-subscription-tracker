'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Loader2, CalendarX, Check, RefreshCw, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import styles from './unsubscribe.module.css';

interface ScheduledSub {
    id: string;
    tool_name: string;
    client_name: string;
    billing_type: string;
    amount: number;
    planned_unsubscribe_date: string;
    user_id?: string;
    requester_name?: string;
    status: string;
}

function getDaysRemaining(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function DaysChip({ days }: { days: number }) {
    if (days < 0) {
        return (
            <span className={`${styles.daysChip} ${styles.daysOverdue}`}>
                <AlertTriangle size={11} />
                {Math.abs(days)}d overdue
            </span>
        );
    }
    if (days === 0) {
        return (
            <span className={`${styles.daysChip} ${styles.daysToday}`}>
                <AlertTriangle size={11} />
                Today
            </span>
        );
    }
    if (days <= 7) {
        return (
            <span className={`${styles.daysChip} ${styles.daysSoon}`}>
                <Clock size={11} />
                {days}d left
            </span>
        );
    }
    return (
        <span className={`${styles.daysChip} ${styles.daysOk}`}>
            <Clock size={11} />
            {days}d left
        </span>
    );
}

export default function UnsubscribeSchedulePage() {
    const [subs, setSubs] = useState<ScheduledSub[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => { fetchSubs(); }, []);

    const fetchSubs = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'subscriptions'));
            const results: ScheduledSub[] = [];

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                if (!data.planned_unsubscribe_date) continue;

                const sub = { id: docSnap.id, ...data } as ScheduledSub;

                // Resolve requester name
                if (sub.user_id && !sub.requester_name) {
                    try {
                        const profile = await getDoc(doc(db, 'user_profiles', sub.user_id));
                        if (profile.exists()) {
                            sub.requester_name = profile.data().fullName || profile.data().email || 'Unknown';
                        }
                    } catch { /* skip */ }
                }
                results.push(sub);
            }

            // Sort: overdue first, then by date ascending
            results.sort((a, b) =>
                new Date(a.planned_unsubscribe_date).getTime() - new Date(b.planned_unsubscribe_date).getTime()
            );
            setSubs(results);
        } catch (err) {
            console.error('Error fetching unsubscribe schedule:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUnsubscribe = async (sub: ScheduledSub) => {
        setActionLoading(sub.id);
        try {
            await updateDoc(doc(db, 'subscriptions', sub.id), {
                status: 'inactive',
                planned_unsubscribe_date: null,
                unsubscribed_at: new Date().toISOString(),
            });
            setSubs(prev => prev.filter(s => s.id !== sub.id));
            setConfirmId(null);
        } catch (err) {
            console.error('Error unsubscribing:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSnooze = async (sub: ScheduledSub, days: number) => {
        setActionLoading(sub.id);
        try {
            const current = new Date(sub.planned_unsubscribe_date);
            current.setDate(current.getDate() + days);
            const newDate = current.toISOString().split('T')[0];
            await updateDoc(doc(db, 'subscriptions', sub.id), { planned_unsubscribe_date: newDate });
            setSubs(prev => prev.map(s =>
                s.id === sub.id ? { ...s, planned_unsubscribe_date: newDate } : s
            ).sort((a, b) =>
                new Date(a.planned_unsubscribe_date).getTime() - new Date(b.planned_unsubscribe_date).getTime()
            ));
        } catch (err) {
            console.error('Error snoozing:', err);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'rgba(255,255,255,0.2)' }} />
            </div>
        );
    }

    const overdue = subs.filter(s => getDaysRemaining(s.planned_unsubscribe_date) < 0);
    const upcoming = subs.filter(s => getDaysRemaining(s.planned_unsubscribe_date) >= 0);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Unsubscribe Schedule</h1>
                    <p className={styles.subtitle}>Monthly subscriptions employees have flagged for cancellation</p>
                </div>
                {subs.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {overdue.length > 0 && (
                            <span className={styles.headerBadgeOverdue}>{overdue.length} overdue</span>
                        )}
                        <span className={styles.headerBadge}>{subs.length} total</span>
                    </div>
                )}
            </div>

            {subs.length === 0 ? (
                <div className={styles.emptyCard}>
                    <CheckCircle2 size={40} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '1rem' }} />
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem', fontStyle: 'italic' }}>
                        No subscriptions scheduled for cancellation.
                    </p>
                </div>
            ) : (
                <div className={styles.tableCard}>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead className={styles.thead}>
                                <tr>
                                    <th className={styles.th}>Subscription</th>
                                    <th className={styles.th}>Requester</th>
                                    <th className={styles.th}>Monthly Cost</th>
                                    <th className={styles.th}>Unsubscribe Date</th>
                                    <th className={styles.th}>Time Left</th>
                                    <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className={styles.tbody}>
                                {subs.map(sub => {
                                    const days = getDaysRemaining(sub.planned_unsubscribe_date);
                                    const isOverdue = days < 0;

                                    return (
                                        <tr key={sub.id} className={isOverdue ? styles.rowOverdue : ''}>
                                            <td className={styles.td}>
                                                <div className={styles.toolName}>{sub.tool_name}</div>
                                                <div className={styles.clientName}>{sub.client_name || 'Internal'}</div>
                                            </td>
                                            <td className={styles.td}>
                                                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                                                    {sub.requester_name || '—'}
                                                </span>
                                            </td>
                                            <td className={styles.td}>
                                                <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>
                                                    ₱ {sub.amount?.toFixed(2) ?? '0.00'}
                                                </span>
                                            </td>
                                            <td className={styles.td}>
                                                <span style={{ fontSize: '0.875rem', color: isOverdue ? '#f87171' : 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                                                    {new Date(sub.planned_unsubscribe_date).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric'
                                                    })}
                                                </span>
                                            </td>
                                            <td className={styles.td}>
                                                <DaysChip days={days} />
                                            </td>
                                            <td className={styles.td} style={{ textAlign: 'right' }}>
                                                {confirmId === sub.id ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem' }}>
                                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginRight: '0.25rem' }}>Confirm?</span>
                                                        <button
                                                            className={`${styles.actionBtn} ${styles.confirmBtn}`}
                                                            onClick={() => handleUnsubscribe(sub)}
                                                            disabled={!!actionLoading}
                                                            title="Confirm unsubscribe"
                                                        >
                                                            {actionLoading === sub.id
                                                                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                                                : <Check size={14} />}
                                                        </button>
                                                        <button
                                                            className={`${styles.actionBtn} ${styles.cancelBtn}`}
                                                            onClick={() => setConfirmId(null)}
                                                            title="Cancel"
                                                        >
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>✕</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem' }}>
                                                        <button
                                                            className={`${styles.actionBtn} ${styles.snoozeBtn}`}
                                                            onClick={() => handleSnooze(sub, 7)}
                                                            disabled={!!actionLoading}
                                                            title="Snooze 7 days"
                                                        >
                                                            <RefreshCw size={13} />
                                                            +7d
                                                        </button>
                                                        <button
                                                            className={`${styles.actionBtn} ${styles.unsubscribeBtn}`}
                                                            onClick={() => setConfirmId(sub.id)}
                                                            disabled={!!actionLoading}
                                                            title="Mark as unsubscribed"
                                                        >
                                                            <CalendarX size={14} />
                                                            Unsubscribe
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
