'use client';

import { useEffect, useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Calendar, RefreshCw, Trash2, Upload, FileCheck, Bell, BellOff, X } from 'lucide-react';
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
    reminder_date?: string;
    reminder_action?: 'disable' | 'unsubscribe' | 'review';
}

function formatBillingCycle(type: string) {
    if (!type) return '';
    return type
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function getReminderStatus(reminderDate?: string): 'none' | 'upcoming' | 'overdue' {
    if (!reminderDate) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rd = new Date(reminderDate);
    rd.setHours(0, 0, 0, 0);
    return rd < today ? 'overdue' : 'upcoming';
}

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [reminderModal, setReminderModal] = useState<Subscription | null>(null);
    const [reminderDate, setReminderDate] = useState('');
    const [reminderAction, setReminderAction] = useState<'disable' | 'unsubscribe' | 'review'>('review');
    const [savingReminder, setSavingReminder] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (user) fetchSubscriptions();
    }, [user]);

    const fetchSubscriptions = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'subscriptions'), where('user_id', '==', user.uid));
            const querySnapshot = await getDocs(q);
            const subs: Subscription[] = [];
            querySnapshot.forEach((doc) => {
                subs.push({ id: doc.id, ...doc.data() } as Subscription);
            });
            subs.sort((a, b) => new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime());
            setSubscriptions(subs);
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const openReminderModal = (sub: Subscription) => {
        setReminderModal(sub);
        setReminderDate(sub.reminder_date || '');
        setReminderAction(sub.reminder_action || 'review');
    };

    const handleSaveReminder = async () => {
        if (!reminderModal) return;
        setSavingReminder(true);
        try {
            await updateDoc(doc(db, 'subscriptions', reminderModal.id), {
                reminder_date: reminderDate || null,
                reminder_action: reminderDate ? reminderAction : null,
            });
            setSubscriptions(prev => prev.map(s =>
                s.id === reminderModal.id
                    ? { ...s, reminder_date: reminderDate || undefined, reminder_action: reminderDate ? reminderAction : undefined }
                    : s
            ));
            setReminderModal(null);
        } catch (error) {
            console.error('Error saving reminder:', error);
        } finally {
            setSavingReminder(false);
        }
    };

    const handleClearReminder = async (sub: Subscription) => {
        try {
            await updateDoc(doc(db, 'subscriptions', sub.id), {
                reminder_date: null,
                reminder_action: null,
            });
            setSubscriptions(prev => prev.map(s =>
                s.id === sub.id
                    ? { ...s, reminder_date: undefined, reminder_action: undefined }
                    : s
            ));
        } catch (error) {
            console.error('Error clearing reminder:', error);
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
            setSelectedSub(null);
        } catch (error) {
            console.error('Error submitting deletion request:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (subscriptionId: string, newStatus: string) => {
        setUpdatingStatus(subscriptionId);
        const previous = [...subscriptions];
        setSubscriptions(subscriptions.map(sub =>
            sub.id === subscriptionId ? { ...sub, status: newStatus } : sub
        ));
        try {
            await updateDoc(doc(db, 'subscriptions', subscriptionId), { status: newStatus });
        } catch (error) {
            console.error('Error updating status:', error);
            setSubscriptions(previous);
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
            await updateDoc(doc(db, 'subscriptions', subscriptionId), {
                receipt_url: downloadURL,
                receipt_uploaded_at: new Date().toISOString(),
                receipt_status: 'pending_review'
            });
            setSubscriptions(prev => prev.map(sub =>
                sub.id === subscriptionId
                    ? { ...sub, receipt_url: downloadURL, receipt_status: 'pending_review' }
                    : sub
            ));
        } catch (error) {
            console.error('Error uploading receipt:', error);
        } finally {
            setUploadingId(null);
            e.target.value = '';
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'rgba(255,255,255,0.2)' }} />
            </div>
        );
    }

    // Today string for min date on date picker
    const todayStr = new Date().toISOString().split('T')[0];

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
                                <th className={styles.th}>Renewal Date</th>
                                <th className={styles.th} style={{ textAlign: 'center' }}>Receipt</th>
                                <th className={styles.th} style={{ textAlign: 'center' }}>Status</th>
                                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tbody}>
                            {subscriptions.map((sub) => {
                                const reminderStatus = getReminderStatus(sub.reminder_date);
                                const isMonthly = sub.billing_type === 'monthly';

                                return (
                                    <tr key={sub.id}>
                                        <td className={styles.td}>
                                            <div className={styles.toolName}>{sub.tool_name}</div>
                                            <div className={styles.clientName}>{sub.client_name || 'Internal'}</div>

                                            {/* Reminder indicator */}
                                            {sub.reminder_date && (
                                                <div className={`${styles.reminderBadge} ${reminderStatus === 'overdue' ? styles.reminderOverdue : styles.reminderUpcoming}`}>
                                                    {reminderStatus === 'overdue' ? <Bell size={10} /> : <Bell size={10} />}
                                                    <span>
                                                        {reminderStatus === 'overdue' ? 'Overdue · ' : 'Reminder · '}
                                                        {new Date(sub.reminder_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        {sub.reminder_action && ` · ${sub.reminder_action}`}
                                                    </span>
                                                    <button
                                                        onClick={() => handleClearReminder(sub)}
                                                        className={styles.reminderClearBtn}
                                                        title="Clear reminder"
                                                    >
                                                        <X size={9} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.cycleBadge}>
                                                <RefreshCw size={12} />
                                                {formatBillingCycle(sub.billing_type)}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.amount}>₱ {sub.amount.toFixed(2)}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1' }}>
                                                <Calendar size={14} style={{ opacity: 0.5 }} />
                                                {sub.renewal_date}
                                            </div>
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                                    <input
                                                        type="file"
                                                        id={`upload-${sub.id}`}
                                                        style={{ display: 'none' }}
                                                        accept="image/*,.pdf"
                                                        onChange={(e) => handleFileUpload(e, sub.id)}
                                                        disabled={!!uploadingId}
                                                    />
                                                    {!sub.receipt_status && (
                                                        <label htmlFor={`upload-${sub.id}`} className={styles.uploadLabel}>
                                                            {uploadingId === sub.id
                                                                ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                                                : <Upload size={12} />}
                                                            <span>Upload</span>
                                                        </label>
                                                    )}
                                                    {sub.receipt_status === 'pending_review' && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
                                                            <span className={styles.receiptPending}>
                                                                <FileCheck size={12} /> Pending Review
                                                            </span>
                                                            <label htmlFor={`upload-${sub.id}`} className={styles.replaceLabel}>
                                                                <Upload size={10} />
                                                                {uploadingId === sub.id ? 'Uploading...' : 'Replace'}
                                                            </label>
                                                        </div>
                                                    )}
                                                    {sub.receipt_status === 'reviewed' && (
                                                        <a href={sub.receipt_url} target="_blank" rel="noopener noreferrer" className={styles.receiptReviewed}>
                                                            <FileCheck size={12} /> Reviewed
                                                        </a>
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
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem' }}>
                                                {/* Reminder bell — only for monthly */}
                                                {isMonthly && (
                                                    <button
                                                        onClick={() => openReminderModal(sub)}
                                                        title={sub.reminder_date ? 'Edit reminder' : 'Set reminder'}
                                                        className={`${styles.actionIconBtn} ${reminderStatus === 'overdue' ? styles.bellOverdue : reminderStatus === 'upcoming' ? styles.bellSet : styles.bellEmpty}`}
                                                    >
                                                        {sub.reminder_date ? <Bell size={15} /> : <Bell size={15} />}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedSub(sub)}
                                                    className={styles.deleteButton}
                                                    title="Request Deletion"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {subscriptions.length === 0 && (
                                <tr>
                                    <td className={styles.emptyState} colSpan={7}>
                                        No active subscriptions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reminder Modal */}
            {reminderModal && (
                <div className={styles.modalOverlay} onClick={() => setReminderModal(null)}>
                    <div className={styles.reminderModalContent} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className={styles.reminderModalHeader}>
                            <div className={styles.reminderModalIcon}>
                                <Bell size={22} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p className={styles.reminderModalLabel}>Set Reminder</p>
                                <h3 className={styles.reminderModalTitle}>{reminderModal.tool_name}</h3>
                                <p className={styles.reminderModalSub}>{reminderModal.client_name || 'Internal'}</p>
                            </div>
                            <button className={styles.reminderCloseBtn} onClick={() => setReminderModal(null)}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className={styles.reminderModalBody}>
                            <div className={styles.reminderField}>
                                <label className={styles.reminderFieldLabel}>Reminder Date</label>
                                <input
                                    type="date"
                                    value={reminderDate}
                                    min={todayStr}
                                    onChange={e => setReminderDate(e.target.value)}
                                    className={styles.reminderDateInput}
                                />
                            </div>

                            <div className={styles.reminderField}>
                                <label className={styles.reminderFieldLabel}>Action to take</label>
                                <div className={styles.reminderActionGroup}>
                                    {(['review', 'disable', 'unsubscribe'] as const).map(action => (
                                        <button
                                            key={action}
                                            type="button"
                                            onClick={() => setReminderAction(action)}
                                            className={`${styles.reminderActionChip} ${reminderAction === action ? styles.reminderActionChipActive : ''}`}
                                        >
                                            {action.charAt(0).toUpperCase() + action.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <p className={styles.reminderHint}>
                                You'll see a highlighted indicator on this subscription when the reminder date arrives.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className={styles.reminderModalFooter}>
                            {reminderModal.reminder_date && (
                                <button
                                    className={styles.reminderClearFullBtn}
                                    onClick={() => { handleClearReminder(reminderModal); setReminderModal(null); }}
                                >
                                    <BellOff size={14} /> Clear Reminder
                                </button>
                            )}
                            <button
                                className={styles.reminderSaveBtn}
                                onClick={handleSaveReminder}
                                disabled={!reminderDate || savingReminder}
                            >
                                {savingReminder
                                    ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                    : <Bell size={14} />}
                                {savingReminder ? 'Saving...' : 'Save Reminder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deletion Confirmation Modal */}
            {selectedSub && (
                <div className={styles.modalOverlay} onClick={() => setSelectedSub(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalIcon}>
                                <Trash2 size={24} />
                            </div>
                            <div className={styles.modalHeaderText}>
                                <h3 className={styles.modalTitle}>Request Subscription Deletion</h3>
                                <p className={styles.modalSubtitle}>This action requires admin approval</p>
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
                                <strong className={styles.modalNoteStrong}>Note:</strong> This will send a deletion request to the admin for approval. The subscription will remain active until processed.
                            </p>
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={() => setSelectedSub(null)} className={`${styles.modalButton} ${styles.modalCancelButton}`} disabled={submitting}>
                                Cancel
                            </button>
                            <button onClick={handleRequestDeletion} className={`${styles.modalButton} ${styles.modalSubmitButton}`} disabled={submitting}>
                                {submitting
                                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                                    : <><Trash2 size={16} /> Submit Request</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
