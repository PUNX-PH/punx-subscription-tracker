'use client';

import { useEffect, useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Calendar, CreditCard, RefreshCw, Trash2, Upload, FileCheck } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import styles from './subscriptions.module.css';

interface Subscription {
    id: string;
    tool_name: string;
    client_name: string;
    billing_type: string;
    amount: number;
    currency: string;
    status: string;
    renewal_date: string;
    receipt_url?: string;
    receipt_status?: 'pending_review' | 'reviewed';
}

function getCycleBadge(type: string) {
    const t = type?.toLowerCase() || '';
    if (t === 'monthly') return styles.cycleMonthly;
    if (t === 'annual' || t === 'yearly') return styles.cycleAnnual;
    return styles.cycleUsage;
}

function getStatusClass(status: string) {
    switch (status) {
        case 'active': return styles.statusActive;
        default: return styles.statusInactive;
    }
}

function formatBillingCycle(type: string) {
    if (!type) return '';
    return type
        .replace(/_/g, ' ') // usage_based -> usage based
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetchSubscriptions();
        }
    }, [user]);

    const fetchSubscriptions = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const q = query(
                collection(db, 'subscriptions'),
                where('user_id', '==', user.uid)
            );
            const querySnapshot = await getDocs(q);
            const subs: Subscription[] = [];
            querySnapshot.forEach((doc) => {
                subs.push({ id: doc.id, ...doc.data() } as Subscription);
            });
            // Sort by renewal date
            subs.sort((a, b) => new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime());
            setSubscriptions(subs);
        } catch (error) {
            console.error("Error fetching subscriptions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestDeletion = async () => {
        if (!selectedSub || !user) return;
        setSubmitting(true);

        try {
            await addDoc(collection(db, 'deletion_requests'), {
                subscription_id: selectedSub.id,
                user_id: user.uid,
                tool_name: selectedSub.tool_name,
                client_name: selectedSub.client_name,
                amount: selectedSub.amount,
                currency: selectedSub.currency,
                status: 'pending',
                created_at: new Date().toISOString(),
                processed_at: null,
                processed_by: null
            });

            alert('Deletion request submitted successfully!');
            setSelectedSub(null);
        } catch (error) {
            console.error("Error submitting deletion request:", error);
            alert('Failed to submit deletion request.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (subscriptionId: string, newStatus: string) => {
        setUpdatingStatus(subscriptionId);

        // Optimistic update
        const previousSubscriptions = [...subscriptions];
        setSubscriptions(subscriptions.map(sub =>
            sub.id === subscriptionId ? { ...sub, status: newStatus } : sub
        ));

        try {
            const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
            await updateDoc(subscriptionRef, {
                status: newStatus
            });
        } catch (error) {
            console.error("Error updating status:", error);
            alert('Failed to update status.');
            // Rollback on error
            setSubscriptions(previousSubscriptions);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, subscriptionId: string) => {
        if (!e.target.files || !e.target.files[0] || !user) return;

        const file = e.target.files[0];
        setUploadingId(subscriptionId);

        try {
            const timestamp = new Date().getTime();
            const storageRef = ref(storage, `receipts/${user.uid}/${subscriptionId}/${timestamp}_${file.name}`);

            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
            await updateDoc(subscriptionRef, {
                receipt_url: downloadURL,
                receipt_uploaded_at: new Date().toISOString(),
                receipt_status: 'pending_review'
            });

            setSubscriptions(prev => prev.map(sub =>
                sub.id === subscriptionId
                    ? { ...sub, receipt_url: downloadURL, receipt_status: 'pending_review' }
                    : sub
            ));

            alert('Receipt uploaded successfully!');
        } catch (error) {
            console.error("Error uploading receipt:", error);
            alert('Failed to upload receipt. Please try again.');
        } finally {
            setUploadingId(null);
            // Reset file input
            e.target.value = '';
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
                    <h1 className={styles.title}>Subscriptions</h1>
                    <p className={styles.subtitle}>Active tool subscriptions and billing details</p>
                </div>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead className={styles.thead}>
                            <tr>
                                <th className={styles.th}>Tool / Client</th>
                                <th className={styles.th}>Billing Cycle</th>
                                <th className={styles.th}>Cost</th>
                                <th className={styles.th}>Request Date</th>
                                <th className={styles.th} style={{ textAlign: 'center' }}>Receipt</th>
                                <th className={styles.th} style={{ textAlign: 'center' }}>Status</th>
                                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tbody}>
                            {subscriptions.map((sub) => {
                                // Logic removed as per request

                                return (
                                    <tr key={sub.id}>
                                        <td className={styles.td}>
                                            <div className={styles.toolName}>{sub.tool_name}</div>
                                            <div className={styles.clientName}>{sub.client_name || 'Internal'}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.cycleBadge}>
                                                <RefreshCw size={12} className="mr-2" />
                                                {formatBillingCycle(sub.billing_type)}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.amount}>
                                                ₱ {sub.amount.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={`${styles.renewalDate} flex items-center gap-2`}>
                                                <Calendar size={14} className="opacity-50" />
                                                {sub.renewal_date}
                                            </div>

                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'center' }}>
                                            <div className="flex flex-col items-center gap-2">
                                                {/* Upload Button / Status Indicator */}
                                                <div className="relative inline-block">
                                                    <input
                                                        type="file"
                                                        id={`upload-${sub.id}`}
                                                        className="hidden"
                                                        accept="image/*,.pdf"
                                                        onChange={(e) => handleFileUpload(e, sub.id)}
                                                        disabled={!!uploadingId}
                                                    />

                                                    {!sub.receipt_status && (
                                                        <label
                                                            htmlFor={`upload-${sub.id}`}
                                                            className={`
                                                                flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all duration-200
                                                                bg-white/5 border-white/10 hover:bg-white/10 text-white/60 hover:text-white
                                                                ${uploadingId === sub.id ? 'opacity-50 cursor-not-allowed' : ''}
                                                            `}
                                                        >
                                                            {uploadingId === sub.id ? (
                                                                <Loader2 size={12} className="animate-spin" />
                                                            ) : (
                                                                <Upload size={12} />
                                                            )}
                                                            <span className="text-xs font-medium">Upload</span>
                                                        </label>
                                                    )}

                                                    {sub.receipt_status === 'pending_review' && (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                                                <FileCheck size={12} className="stroke-[2.5]" />
                                                                Pending Review
                                                            </span>
                                                            <label
                                                                htmlFor={`upload-${sub.id}`}
                                                                className="group flex items-center gap-1 text-[10px] text-white/40 hover:text-white/80 cursor-pointer transition-all duration-200"
                                                            >
                                                                <Upload size={10} className="group-hover:-translate-y-0.5 transition-transform" />
                                                                <span>{uploadingId === sub.id ? 'Uploading...' : 'Replace Receipt'}</span>
                                                            </label>
                                                        </div>
                                                    )}

                                                    {sub.receipt_status === 'reviewed' && (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <a
                                                                href={sub.receipt_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-all duration-200 shadow-sm"
                                                            >
                                                                <FileCheck size={12} className="stroke-[2.5]" />
                                                                Reviewed
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'center' }}>
                                            <select
                                                value={sub.status}
                                                onChange={(e) => handleStatusChange(sub.id, e.target.value)}
                                                disabled={updatingStatus === sub.id}
                                                className={`${styles.statusDropdown} ${sub.status === 'active' ? styles.statusDropdownActive : styles.statusDropdownInactive}`}
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'right' }}>
                                            <div className="flex items-center justify-end">
                                                <button
                                                    onClick={() => setSelectedSub(sub)}
                                                    className={styles.deleteButton}
                                                    title="Request Deletion"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {subscriptions.length === 0 && (
                                <tr>
                                    <td className={styles.emptyState} colSpan={6}>
                                        No active subscriptions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Deletion Confirmation Modal */}
            {
                selectedSub && (
                    <div
                        className={styles.modalOverlay}
                        onClick={() => setSelectedSub(null)}
                    >
                        <div
                            className={styles.modalContent}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className={styles.modalHeader}>
                                <div className={styles.modalIcon}>
                                    <Trash2 size={24} />
                                </div>
                                <div className={styles.modalHeaderText}>
                                    <h3 className={styles.modalTitle}>Request Subscription Deletion</h3>
                                    <p className={styles.modalSubtitle}>
                                        This action requires admin approval
                                    </p>
                                </div>
                            </div>

                            <div className={styles.modalDetails}>
                                <div className={styles.modalDetailsHeader}>
                                    <span className={styles.modalDetailsLabel}>Subscription</span>
                                    <span className={`${styles.statusBadge} ${selectedSub.status === 'active' ? styles.statusBadgeActive : styles.statusBadgeInactive}`}>
                                        {selectedSub.status}
                                    </span>
                                </div>
                                <p className={styles.modalToolName}>{selectedSub.tool_name}</p>
                                <p className={styles.modalClientName}>{selectedSub.client_name || 'Internal'}</p>
                                <div className={styles.modalDetailsDivider}>
                                    <div className={styles.modalDetailItem}>
                                        <span className={styles.modalDetailItemLabel}>Cost</span>
                                        <span className={styles.modalDetailItemValue}>₱ {selectedSub.amount.toFixed(2)}</span>
                                    </div>
                                    <div className={styles.modalDetailItem}>
                                        <span className={styles.modalDetailItemLabel}>Billing</span>
                                        <span className={styles.modalDetailItemValue}>{selectedSub.billing_type.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.modalNote}>
                                <p className={styles.modalNoteText}>
                                    <strong className={styles.modalNoteStrong}>Note:</strong> This will send a deletion request to the admin for approval.
                                    The subscription will remain active until the admin processes your request.
                                </p>
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    onClick={() => setSelectedSub(null)}
                                    className={`${styles.modalButton} ${styles.modalCancelButton}`}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRequestDeletion}
                                    className={`${styles.modalButton} ${styles.modalSubmitButton}`}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={16} />
                                            Submit Request
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
