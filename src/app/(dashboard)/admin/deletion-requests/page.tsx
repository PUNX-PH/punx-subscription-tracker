'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Loader2, Check, X, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import tableStyles from '../subscriptions/subscriptions.module.css';
import styles from './deletion-requests.module.css';

interface DeletionRequest {
    id: string;
    subscription_id: string;
    user_id: string;
    tool_name: string;
    client_name: string;
    amount: number;
    currency: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    processed_at: string | null;
    processed_by: string | null;
}

export default function DeletionRequestsPage() {
    const [requests, setRequests] = useState<DeletionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [confirmModal, setConfirmModal] = useState<{ type: 'approve' | 'reject', request: DeletionRequest } | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // Fetch deletion requests
            const querySnapshot = await getDocs(collection(db, 'deletion_requests'));
            const reqs: DeletionRequest[] = [];
            querySnapshot.forEach((doc) => {
                reqs.push({ id: doc.id, ...doc.data() } as DeletionRequest);
            });
            // Sort by created_at, newest first
            reqs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Fetch user profiles for requester names
            const userSnapshot = await getDocs(collection(db, 'user_profiles'));
            const map: Record<string, string> = {};
            userSnapshot.forEach(doc => {
                const data = doc.data();
                map[doc.id] = data.fullName || data.email || 'Unknown User';
            });
            setUserMap(map);
            setRequests(reqs);
        } catch (error) {
            console.error("Error fetching deletion requests:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (request: DeletionRequest) => {
        if (!user) return;
        setActionLoading(request.id);

        try {
            // Update subscription status to inactive instead of deleting
            await updateDoc(doc(db, 'subscriptions', request.subscription_id), {
                status: 'inactive'
            });

            // Update the deletion request status
            await updateDoc(doc(db, 'deletion_requests', request.id), {
                status: 'approved',
                processed_at: new Date().toISOString(),
                processed_by: user.uid
            });

            // Update local state
            setRequests(prev => prev.map(r =>
                r.id === request.id
                    ? { ...r, status: 'approved', processed_at: new Date().toISOString(), processed_by: user.uid }
                    : r
            ));

            setConfirmModal(null);
            alert('Subscription marked as inactive successfully!');
        } catch (error) {
            console.error("Error approving deletion:", error);
            alert('Failed to approve deletion request.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (request: DeletionRequest) => {
        if (!user) return;
        setActionLoading(request.id);

        try {
            await updateDoc(doc(db, 'deletion_requests', request.id), {
                status: 'rejected',
                processed_at: new Date().toISOString(),
                processed_by: user.uid
            });

            // Update local state
            setRequests(prev => prev.map(r =>
                r.id === request.id
                    ? { ...r, status: 'rejected', processed_at: new Date().toISOString(), processed_by: user.uid }
                    : r
            ));

            setConfirmModal(null);
            alert('Deletion request rejected.');
        } catch (error) {
            console.error("Error rejecting deletion:", error);
            alert('Failed to reject deletion request.');
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
        <div className={tableStyles.container}>
            <div className={tableStyles.header}>
                <div>
                    <h1 className={tableStyles.title}>Deletion Requests</h1>
                    <p className={tableStyles.subtitle}>Review and manage subscription deletion requests</p>
                </div>
            </div>

            <div className={tableStyles.tableCard}>
                <div className={tableStyles.tableContainer}>
                    <table className={tableStyles.table}>
                        <thead className={tableStyles.thead}>
                            <tr>
                                <th className={tableStyles.th}>Tool / Client</th>
                                <th className={tableStyles.th}>Requester</th>
                                <th className={tableStyles.th}>Cost</th>
                                <th className={tableStyles.th}>Requested Date</th>
                                <th className={tableStyles.th} style={{ textAlign: 'center' }}>Status</th>
                                <th className={tableStyles.th} style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={tableStyles.tbody}>
                            {requests.map((request) => {
                                const isPending = request.status === 'pending';

                                return (
                                    <tr key={request.id}>
                                        <td className={tableStyles.td}>
                                            <div className={tableStyles.toolName}>{request.tool_name}</div>
                                            <div className={tableStyles.clientName}>{request.client_name || 'Internal'}</div>
                                        </td>
                                        <td className={tableStyles.td}>
                                            <div className="text-sm text-white/90">
                                                {userMap[request.user_id] || 'Unknown User'}
                                            </div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.amount}>
                                                ₱ {request.amount.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className={tableStyles.td}>
                                            <div className="flex items-center gap-2 text-xs text-white/70">
                                                <Calendar size={14} className="opacity-50" />
                                                {new Date(request.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className={tableStyles.td} style={{ textAlign: 'center' }}>
                                            <span className={`${tableStyles.badge} ${request.status === 'approved' ? tableStyles.statusActive :
                                                request.status === 'rejected' ? tableStyles.statusExpired :
                                                    tableStyles.statusTrial
                                                }`}>
                                                {request.status}
                                            </span>
                                        </td>
                                        <td className={tableStyles.td} style={{ textAlign: 'right' }}>
                                            {isPending ? (
                                                <div className={styles.actionButtons}>
                                                    <button
                                                        onClick={() => setConfirmModal({ type: 'approve', request })}
                                                        disabled={!!actionLoading}
                                                        className={`${styles.iconButton} ${styles.approveButton}`}
                                                        title="Approve & Mark Inactive"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmModal({ type: 'reject', request })}
                                                        disabled={!!actionLoading}
                                                        className={`${styles.iconButton} ${styles.rejectButton}`}
                                                        title="Reject Request"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className={styles.processedText}>
                                                    {request.status === 'approved' ? 'Marked Inactive' : 'Rejected'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {requests.length === 0 && (
                                <tr>
                                    <td className={tableStyles.emptyState} colSpan={6}>
                                        No deletion requests found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => setConfirmModal(null)}
                >
                    <div
                        className={`${styles.modalContent} ${confirmModal.type === 'approve' ? styles.modalContentApprove : styles.modalContentReject}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={styles.modalHeader}>
                            <div className={`${styles.modalIcon} ${confirmModal.type === 'approve' ? styles.modalIconApprove : styles.modalIconReject}`}>
                                {confirmModal.type === 'approve' ? (
                                    <Check size={24} />
                                ) : (
                                    <X size={24} />
                                )}
                            </div>
                            <div className={styles.modalHeaderText}>
                                <h3 className={styles.modalTitle}>
                                    {confirmModal.type === 'approve' ? 'Approve Deletion Request' : 'Reject Deletion Request'}
                                </h3>
                                <p className={styles.modalSubtitle}>
                                    {confirmModal.type === 'approve'
                                        ? 'This will mark the subscription as inactive'
                                        : 'This will deny the deletion request'}
                                </p>
                            </div>
                        </div>

                        <div className={styles.modalDetails}>
                            <div className={styles.modalDetailsHeader}>
                                <span className={styles.modalDetailsLabel}>Subscription</span>
                            </div>
                            <p className={styles.modalToolName}>{confirmModal.request.tool_name}</p>
                            <p className={styles.modalClientName}>{confirmModal.request.client_name || 'Internal'}</p>
                            <div className={styles.modalDetailsDivider}>
                                <div className={styles.modalDetailItem}>
                                    <span className={styles.modalDetailItemLabel}>Requester</span>
                                    <span className={styles.modalDetailItemValue}>{userMap[confirmModal.request.user_id] || 'Unknown'}</span>
                                </div>
                                <div className={styles.modalDetailItem}>
                                    <span className={styles.modalDetailItemLabel}>Cost</span>
                                    <span className={styles.modalDetailItemValue}>₱ {confirmModal.request.amount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                onClick={() => setConfirmModal(null)}
                                className={`${styles.modalButton} ${styles.modalCancelButton}`}
                                disabled={!!actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmModal.type === 'approve' ? handleApprove(confirmModal.request) : handleReject(confirmModal.request)}
                                className={`${styles.modalButton} ${styles.modalConfirmButton} ${confirmModal.type === 'approve' ? styles.modalConfirmButtonApprove : styles.modalConfirmButtonReject}`}
                                disabled={!!actionLoading}
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {confirmModal.type === 'approve' ? <Check size={16} /> : <X size={16} />}
                                        {confirmModal.type === 'approve' ? 'Approve & Mark Inactive' : 'Reject Request'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
