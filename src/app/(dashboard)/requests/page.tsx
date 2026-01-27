'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import styles from './requests.module.css';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

// Mock data generator since we might not have DB data yet
function getStatusClass(status: string) {
    switch (status) {
        case 'approved': return styles.status_approved;
        case 'rejected': return styles.status_rejected;
        case 'pending_approval': return styles.status_pending_approval;
        default: return '';
    }
}

export default function RequestsPage() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'subscription_requests'),
            where('requester_id', '==', user.uid),
            orderBy('created_at', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRequests(reqs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching requests:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return <div className={styles.container}><div className="text-white">Loading requests...</div></div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>My Requests</h1>
                    <p className={styles.subtitle}>Track your tool subscription requests</p>
                </div>
                <Link href="/requests/new">
                    <Button variant="outline" className="border-[var(--border)] hover:bg-[var(--secondary)]">
                        <Plus className="mr-2 h-4 w-4" />
                        New Request
                    </Button>
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead className={styles.thead}>
                        <tr>
                            <th className={styles.th}>Tool Name</th>
                            <th className={styles.th}>Billing</th>
                            <th className={styles.th}>Amount</th>
                            <th className={styles.th}>Date</th>
                            <th className={styles.th}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((req) => (
                            <tr key={req.id} className={styles.tr}>
                                <td className={styles.td}>
                                    <span className={styles.toolName}>{req.tool_name}</span>
                                </td>
                                <td className={`${styles.td} capitalize`}>{req.billing_type}</td>
                                <td className={styles.td}>
                                    <span className={styles.amount}>₱ {req.amount?.toFixed(2)}</span>
                                </td>
                                <td className={styles.td}>{req.created_at}</td>
                                <td className={styles.td}>
                                    <span className={`${styles.status} ${getStatusClass(req.status)}`}>
                                        {req.status.replace('_', ' ')}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr>
                                <td className={styles.emptyState} colSpan={5}>
                                    No requests found. Start by adding one!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
