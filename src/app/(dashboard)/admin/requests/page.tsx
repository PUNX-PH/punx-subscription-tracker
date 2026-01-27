'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Check, X, Loader2, FileText, ArrowUpRight, RefreshCw } from 'lucide-react';
import styles from './requests.module.css';

interface Request {
    id: string;
    tool_name: string;
    billing_type: string;
    amount: number;
    currency: string;
    justification: string;
    status: string;
    created_at: string;
    requester_id: string;
    client?: string;
    requesterName?: string;
    requesterRole?: string;
    quote_file_url?: string;
}

function getCycleBadge(type: string) {
    const t = type?.toLowerCase() || '';
    if (t === 'monthly') return styles.cycleMonthly;
    if (t === 'annual' || t === 'yearly') return styles.cycleAnnual;
    return styles.cycleUsage;
}

function formatBillingCycle(type: string) {
    if (!type) return '';
    return type
        .replace(/_/g, ' ') // usage_based -> usage based
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export default function AdminRequestsPage() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [confirmState, setConfirmState] = useState<{
        type: 'approve' | 'reject';
        req: Request;
    } | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'subscription_requests'),
                where('status', '==', 'pending_approval')
            );
            const querySnapshot = await getDocs(q);
            const reqs: Request[] = [];

            for (const docSnapshot of querySnapshot.docs) {
                const data = docSnapshot.data();
                const req = { id: docSnapshot.id, ...data } as Request;

                // Fetch requester profile for display
                if (req.requester_id) {
                    try {
                        const profileDoc = await getDoc(doc(db, 'user_profiles', req.requester_id));
                        if (profileDoc.exists()) {
                            const profileData = profileDoc.data();
                            req.requesterName = profileData.fullName || 'Unknown';
                            req.requesterRole = profileData.role || 'Employee';
                        } else {
                            req.requesterName = 'Unknown User';
                        }
                    } catch (e) {
                        req.requesterName = 'Error fetching user';
                    }
                }
                reqs.push(req);
            }
            // Sort by date desc (newest first)
            reqs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setRequests(reqs);
        } catch (error) {
            console.error("Error fetching requests:", error);
        } finally {
            setLoading(false);
        }
    };

    const initApprove = (req: Request) => setConfirmState({ type: 'approve', req });
    const initReject = (req: Request) => setConfirmState({ type: 'reject', req });
    const closeConfirm = () => setConfirmState(null);

    const executeAction = async () => {
        if (!confirmState) return;
        const { type, req } = confirmState;

        setActionLoading(req.id);
        // close modal immediately or keep it open with loading state? 
        // Better UX to close it and show loading on the row, or show loading in modal.
        // Let's close modal and show row loading as before.
        setConfirmState(null);

        try {
            if (type === 'approve') {
                console.log("Approving:", req.id);
                // 1. Update request status
                await updateDoc(doc(db, 'subscription_requests', req.id), {
                    status: 'approved',
                    approved_at: new Date().toISOString()
                });

                // 2. Create subscription record (mocking dates)
                const startDate = new Date();
                let renewalDate = new Date();
                if (req.billing_type === 'monthly') renewalDate.setMonth(renewalDate.getMonth() + 1);
                else if (req.billing_type === 'annual') renewalDate.setFullYear(renewalDate.getFullYear() + 1);

                await addDoc(collection(db, 'subscriptions'), {
                    tool_name: req.tool_name,
                    client_name: req.client || 'Internal',
                    billing_type: req.billing_type,
                    amount: req.amount,
                    currency: req.currency,
                    status: 'active',
                    start_date: startDate.toISOString().split('T')[0],
                    renewal_date: renewalDate.toISOString().split('T')[0],
                    created_from_request_id: req.id,
                    user_id: req.requester_id,
                    description: req.justification,
                    requester_name: req.requesterName,
                    requester_role: req.requesterRole,
                    quote_file_url: req.quote_file_url
                });
            } else {
                console.log("Rejecting:", req.id);
                await updateDoc(doc(db, 'subscription_requests', req.id), {
                    status: 'rejected',
                    rejected_at: new Date().toISOString()
                });
            }

            // Remove from local list
            setRequests(prev => prev.filter(r => r.id !== req.id));

        } catch (error) {
            console.error(`Error ${type}ing request:`, error);
            alert(`Failed to ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-white/20" size={32} />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Pending Approvals</h1>
                    <p className={styles.subtitle}>Review and approve subscription requests</p>
                </div>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead className={styles.thead}>
                            <tr>
                                <th className={styles.th}>Tool Detail</th>
                                <th className={styles.th}>Quote</th>
                                <th className={styles.th}>Requester</th>
                                <th className={styles.th}>Billing Cycle</th>
                                <th className={styles.th}>Cost</th>
                                <th className={styles.th}>Justification</th>
                                <th className={styles.th}>Date</th>
                                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tbody}>
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={styles.emptyState}>
                                        All caught up! No pending requests.
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id}>
                                        <td className={styles.td}>
                                            <span className={styles.toolName}>{req.tool_name}</span>
                                            {req.client && <div className={styles.toolClient}>{req.client}</div>}
                                        </td>
                                        <td className={styles.td}>
                                            {req.quote_file_url ? (
                                                <a href={req.quote_file_url} target="_blank" rel="noopener noreferrer" className={styles.quoteLink}>
                                                    <FileText size={10} /> View Quote
                                                </a>
                                            ) : (
                                                <span className="text-white/20 italic text-xs">None</span>
                                            )}
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.userName}>{req.requesterName}</div>
                                            <div className={styles.userRole}>{req.requesterRole}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.cycleBadge}>
                                                <RefreshCw size={12} className="mr-2" />
                                                {formatBillingCycle(req.billing_type)}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <span className="font-mono text-white/90">₱ {req.amount.toFixed(2)}</span>
                                        </td>
                                        <td className={styles.td}>
                                            <div className="max-w-[200px] text-sm text-white/70 leading-relaxed line-clamp-2" title={req.justification}>
                                                {req.justification}
                                            </div>
                                        </td>
                                        <td className={styles.td}>
                                            <span className="text-sm text-white/60">{new Date(req.created_at).toLocaleDateString()}</span>
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'right' }}>
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => initApprove(req)}
                                                    disabled={!!actionLoading}
                                                    className={`${styles.actionBtn} ${styles.approveBtn}`}
                                                    title="Approve Request"
                                                >
                                                    {actionLoading === req.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => initReject(req)}
                                                    disabled={!!actionLoading}
                                                    className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                                    title="Reject Request"
                                                >
                                                    {actionLoading === req.id ? <Loader2 size={14} className="animate-spin" /> : <X size={16} />}
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

            {/* Confirmation Modal */}
            {confirmState && (
                <div className={styles.modalOverlay} onClick={closeConfirm}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>
                            {confirmState.type === 'approve' ? 'Approve Subscription' : 'Reject Request'}
                        </h3>
                        <p className={styles.modalDescription}>
                            {confirmState.type === 'approve'
                                ? `Are you sure you want to approve access to ${confirmState.req.tool_name}? This will start the subscription tracking.`
                                : `Are you sure you want to reject the request for ${confirmState.req.tool_name}? This cannot be undone.`
                            }
                        </p>
                        <div className={styles.modalActions}>
                            <button className={`${styles.modalBtn} ${styles.btnCancel}`} onClick={closeConfirm}>
                                Cancel
                            </button>
                            <button
                                className={`${styles.modalBtn} ${confirmState.type === 'approve' ? styles.btnConfirmApprove : styles.btnConfirmReject}`}
                                onClick={executeAction}
                            >
                                {confirmState.type === 'approve' ? 'Confirm Approval' : 'Reject Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
