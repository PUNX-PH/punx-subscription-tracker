'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { Check, X, Loader2, FileText, RefreshCw, Eye } from 'lucide-react';
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
    client?: string | string[];
    requesterName?: string;
    requesterRole?: string;
    quote_file_url?: string;
    quote_file_name?: string;
    token_credits?: number;
    planned_unsubscribe_date?: string;
}

function formatBillingCycle(type: string) {
    if (!type) return '';
    return type
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function formatClient(client?: string | string[]) {
    if (!client) return null;
    if (Array.isArray(client)) return client.length > 0 ? client.join(', ') : null;
    return client || null;
}

export default function AdminRequestsPage() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [viewReq, setViewReq] = useState<Request | null>(null);
    const [confirmState, setConfirmState] = useState<{
        type: 'approve' | 'reject';
        req: Request;
    } | null>(null);

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'subscription_requests'), where('status', '==', 'pending_approval'));
            const querySnapshot = await getDocs(q);
            const reqs: Request[] = [];

            for (const docSnapshot of querySnapshot.docs) {
                const data = docSnapshot.data();
                const req = { id: docSnapshot.id, ...data } as Request;
                if (req.requester_id) {
                    try {
                        const profileDoc = await getDoc(doc(db, 'user_profiles', req.requester_id));
                        if (profileDoc.exists()) {
                            const pd = profileDoc.data();
                            req.requesterName = pd.fullName || 'Unknown';
                            req.requesterRole = pd.role || 'Employee';
                        } else {
                            req.requesterName = 'Unknown User';
                        }
                    } catch {
                        req.requesterName = 'Error fetching user';
                    }
                }
                reqs.push(req);
            }
            reqs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setRequests(reqs);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const initApprove = (req: Request) => { setViewReq(null); setConfirmState({ type: 'approve', req }); };
    const initReject = (req: Request) => { setViewReq(null); setConfirmState({ type: 'reject', req }); };
    const closeConfirm = () => setConfirmState(null);

    const executeAction = async () => {
        if (!confirmState) return;
        const { type, req } = confirmState;
        setActionLoading(req.id);
        setConfirmState(null);

        try {
            if (type === 'approve') {
                await updateDoc(doc(db, 'subscription_requests', req.id), {
                    status: 'approved',
                    approved_at: new Date().toISOString()
                });
                const startDate = new Date();
                let renewalDate = new Date();
                if (req.billing_type === 'monthly') renewalDate.setMonth(renewalDate.getMonth() + 1);
                else if (req.billing_type === 'annual') renewalDate.setFullYear(renewalDate.getFullYear() + 1);

                await addDoc(collection(db, 'subscriptions'), {
                    tool_name: req.tool_name,
                    client_name: Array.isArray(req.client) ? (req.client.join(', ') || 'Internal') : (req.client || 'Internal'),
                    billing_type: req.billing_type,
                    amount: req.amount,
                    currency: req.currency ?? 'PHP',
                    status: 'active',
                    start_date: startDate.toISOString().split('T')[0],
                    renewal_date: renewalDate.toISOString().split('T')[0],
                    created_from_request_id: req.id,
                    user_id: req.requester_id,
                    description: req.justification,
                    requester_name: req.requesterName,
                    requester_role: req.requesterRole,
                    quote_file_url: req.quote_file_url,
                    ...(req.planned_unsubscribe_date ? { planned_unsubscribe_date: req.planned_unsubscribe_date } : {})
                });
            } else {
                await updateDoc(doc(db, 'subscription_requests', req.id), {
                    status: 'rejected',
                    rejected_at: new Date().toISOString()
                });
            }
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'rgba(255,255,255,0.2)' }} />
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
                {requests.length > 0 && (
                    <div className={styles.countBadge}>{requests.length} pending</div>
                )}
            </div>

            <div className={styles.tableCard}>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead className={styles.thead}>
                            <tr>
                                <th className={styles.th}>Tool</th>
                                <th className={styles.th}>Requester</th>
                                <th className={styles.th}>Billing</th>
                                <th className={styles.th}>Cost</th>
                                <th className={styles.th}>Submitted</th>
                                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tbody}>
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className={styles.emptyState}>
                                        All caught up! No pending requests.
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id}>
                                        <td className={styles.td}>
                                            <span className={styles.toolName}>{req.tool_name}</span>
                                            {formatClient(req.client) && (
                                                <div className={styles.toolClient}>{formatClient(req.client)}</div>
                                            )}
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.userName}>{req.requesterName}</div>
                                            <div className={styles.userRole}>{req.requesterRole}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.cycleBadge}>
                                                <RefreshCw size={11} />
                                                {formatBillingCycle(req.billing_type)}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap' }}>
                                                ₱ {req.amount?.toFixed(2) ?? '0.00'}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem' }}>
                                                <button
                                                    onClick={() => setViewReq(req)}
                                                    className={`${styles.actionBtn} ${styles.viewBtn}`}
                                                    title="View Full Request"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button
                                                    onClick={() => initApprove(req)}
                                                    disabled={!!actionLoading}
                                                    className={`${styles.actionBtn} ${styles.approveBtn}`}
                                                    title="Approve Request"
                                                >
                                                    {actionLoading === req.id
                                                        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                        : <Check size={15} />}
                                                </button>
                                                <button
                                                    onClick={() => initReject(req)}
                                                    disabled={!!actionLoading}
                                                    className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                                    title="Reject Request"
                                                >
                                                    {actionLoading === req.id
                                                        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                        : <X size={15} />}
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

            {/* View Request Drawer */}
            {viewReq && (
                <div className={styles.drawerOverlay} onClick={() => setViewReq(null)}>
                    <div className={styles.drawer} onClick={e => e.stopPropagation()}>
                        {/* Drawer Header */}
                        <div className={styles.drawerHeader}>
                            <div>
                                <p className={styles.drawerLabel}>Subscription Request</p>
                                <h2 className={styles.drawerTitle}>{viewReq.tool_name}</h2>
                                {formatClient(viewReq.client) && (
                                    <p className={styles.drawerClient}>{formatClient(viewReq.client)}</p>
                                )}
                            </div>
                            <button className={styles.drawerClose} onClick={() => setViewReq(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className={styles.drawerBody}>
                            {/* Meta grid */}
                            <div className={styles.drawerGrid}>
                                <div className={styles.drawerField}>
                                    <span className={styles.drawerFieldLabel}>Billing Cycle</span>
                                    <span className={styles.drawerFieldValue}>{formatBillingCycle(viewReq.billing_type)}</span>
                                </div>
                                <div className={styles.drawerField}>
                                    <span className={styles.drawerFieldLabel}>Cost</span>
                                    <span className={styles.drawerFieldValue} style={{ fontFamily: 'monospace' }}>
                                        ₱ {viewReq.amount?.toFixed(2) ?? '0.00'}
                                    </span>
                                </div>
                                <div className={styles.drawerField}>
                                    <span className={styles.drawerFieldLabel}>Requested By</span>
                                    <span className={styles.drawerFieldValue}>{viewReq.requesterName}</span>
                                    <span className={styles.drawerFieldSub}>{viewReq.requesterRole}</span>
                                </div>
                                <div className={styles.drawerField}>
                                    <span className={styles.drawerFieldLabel}>Submitted</span>
                                    <span className={styles.drawerFieldValue}>
                                        {new Date(viewReq.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            {/* Justification */}
                            <div className={styles.drawerSection}>
                                <p className={styles.drawerSectionLabel}>Description / Remarks</p>
                                <p className={styles.drawerJustification}>{viewReq.justification || '—'}</p>
                            </div>

                            {/* Quote */}
                            <div className={styles.drawerSection}>
                                <p className={styles.drawerSectionLabel}>Quote Document</p>
                                {viewReq.quote_file_url ? (
                                    <a
                                        href={viewReq.quote_file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.drawerQuoteLink}
                                    >
                                        <FileText size={14} />
                                        {viewReq.quote_file_name || 'View Document'}
                                    </a>
                                ) : (
                                    <span className={styles.drawerNone}>No document attached</span>
                                )}
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className={styles.drawerFooter}>
                            <button
                                className={`${styles.drawerBtn} ${styles.drawerRejectBtn}`}
                                onClick={() => initReject(viewReq)}
                                disabled={!!actionLoading}
                            >
                                <X size={15} /> Reject
                            </button>
                            <button
                                className={`${styles.drawerBtn} ${styles.drawerApproveBtn}`}
                                onClick={() => initApprove(viewReq)}
                                disabled={!!actionLoading}
                            >
                                <Check size={15} /> Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            {confirmState && (
                <div className={styles.modalOverlay} onClick={closeConfirm}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>
                            {confirmState.type === 'approve' ? 'Approve Subscription' : 'Reject Request'}
                        </h3>
                        <p className={styles.modalDescription}>
                            {confirmState.type === 'approve'
                                ? `Approve access to ${confirmState.req.tool_name}? This will start subscription tracking.`
                                : `Reject the request for ${confirmState.req.tool_name}? This cannot be undone.`}
                        </p>
                        <div className={styles.modalActions}>
                            <button className={`${styles.modalBtn} ${styles.btnCancel}`} onClick={closeConfirm}>
                                Cancel
                            </button>
                            <button
                                className={`${styles.modalBtn} ${confirmState.type === 'approve' ? styles.btnConfirmApprove : styles.btnConfirmReject}`}
                                onClick={executeAction}
                            >
                                {confirmState.type === 'approve' ? 'Confirm Approval' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
