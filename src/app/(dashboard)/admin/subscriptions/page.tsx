'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Loader2, Calendar, RefreshCw, Pencil, Trash2, Search, User, Eye, FileText, ArrowUpRight, X, Filter, CheckCircle, FileCheck, AlertCircle } from 'lucide-react';
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
    user_id?: string;
    requester_name?: string;
    description?: string;
    quote_file_url?: string;
    receipt_url?: string;
    receipt_uploaded_at?: string;
    receipt_status?: 'pending_review' | 'reviewed';
}

function formatBillingCycle(type: string) {
    if (!type) return '';
    return type
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function getStatusClass(status: string) {
    switch (status) {
        case 'active': return styles.statusActive;
        default: return '';
    }
}

export default function AdminSubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [userMap, setUserMap] = useState<Record<string, string>>({});

    // Modal State
    const [modal, setModal] = useState<{
        type: 'edit' | 'delete' | 'view';
        sub: Subscription;
    } | null>(null);

    // Edit Form State
    const [editForm, setEditForm] = useState<Partial<Subscription>>({});

    // Filter State
    const [filters, setFilters] = useState({
        status: 'all',
        billingType: 'all',
        receiptStatus: 'all'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Subscriptions
            const subSnapshot = await getDocs(collection(db, 'subscriptions'));
            const subs: Subscription[] = [];
            subSnapshot.forEach((doc) => {
                subs.push({ id: doc.id, ...doc.data() } as Subscription);
            });
            subs.sort((a, b) => new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime());

            // Fetch Profiles for lookup
            const userSnapshot = await getDocs(collection(db, 'user_profiles'));
            const map: Record<string, string> = {};
            userSnapshot.forEach(doc => {
                const data = doc.data();
                map[doc.id] = data.fullName || data.email || 'Unknown User';
            });
            setUserMap(map);
            setSubscriptions(subs);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter subscriptions
    const filteredSubscriptions = useMemo(() => {
        return subscriptions.filter(sub => {
            // Status filter
            if (filters.status !== 'all' && sub.status !== filters.status) return false;

            // Billing type filter
            if (filters.billingType !== 'all' && sub.billing_type !== filters.billingType) return false;

            // Receipt status filter
            if (filters.receiptStatus === 'pending' && sub.receipt_status !== 'pending_review') return false;
            if (filters.receiptStatus === 'reviewed' && sub.receipt_status !== 'reviewed') return false;
            if (filters.receiptStatus === 'none' && sub.receipt_url) return false;

            return true;
        });
    }, [subscriptions, filters]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.status !== 'all') count++;
        if (filters.billingType !== 'all') count++;
        if (filters.receiptStatus !== 'all') count++;
        return count;
    }, [filters]);

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            status: 'all',
            billingType: 'all',
            receiptStatus: 'all'
        });
    };

    const handleDelete = async () => {
        if (!modal || modal.type !== 'delete') return;
        setActionLoading(modal.sub.id);

        try {
            await deleteDoc(doc(db, 'subscriptions', modal.sub.id));
            setSubscriptions(prev => prev.filter(s => s.id !== modal.sub.id));
            setModal(null);
        } catch (error) {
            console.error("Error deleting subscription:", error);
            alert("Failed to delete subscription.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaveEdit = async () => {
        if (!modal || modal.type !== 'edit') return;
        setActionLoading(modal.sub.id);

        try {
            // Remove undefined values
            const updates = Object.fromEntries(
                Object.entries(editForm).filter(([_, v]) => v !== undefined)
            );

            await updateDoc(doc(db, 'subscriptions', modal.sub.id), updates);

            // Update local state
            setSubscriptions(prev => prev.map(s =>
                s.id === modal.sub.id ? { ...s, ...updates } : s
            ));
            setModal(null);
        } catch (error) {
            console.error("Error updating subscription:", error);
            alert("Failed to update subscription.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleMarkReviewed = async () => {
        if (!modal || modal.type !== 'view' || !modal.sub.receipt_url) return;
        setActionLoading(modal.sub.id);

        try {
            await updateDoc(doc(db, 'subscriptions', modal.sub.id), {
                receipt_status: 'reviewed'
            });

            setSubscriptions(prev => prev.map(s =>
                s.id === modal.sub.id ? { ...s, receipt_status: 'reviewed' } : s
            ));

            // Update the modal sub as well to close properly or refresh UI
            setModal({ ...modal, sub: { ...modal.sub, receipt_status: 'reviewed' } });

        } catch (error) {
            console.error("Error updating receipt status:", error);
            alert("Failed to update status.");
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
                    <h1 className={styles.title}>Manage Subscriptions</h1>
                    <p className={styles.subtitle}>View, edit, or cancel active subscriptions</p>
                </div>
            </div>

            {/* Notification Area */}
            {/* Notification Area */}
            {subscriptions.some(s => s.receipt_status === 'pending_review') && (
                <div className={styles.notificationBanner}>
                    <AlertCircle className="text-amber-500" size={20} />
                    <span className={styles.notificationText}>
                        You have <strong>{subscriptions.filter(s => s.receipt_status === 'pending_review').length}</strong> subscription(s) with pending receipt uploads.
                    </span>
                    <button
                        onClick={() => setFilters({ ...filters, receiptStatus: 'pending' })}
                        className={styles.reviewBtn}
                    >
                        Review Now
                    </button>
                </div>
            )}

            {/* Filter Bar */}
            <div className={styles.filterBar}>
                <div className={styles.filterGroup}>
                    <Filter size={16} className={styles.filterIcon} />
                    <span className={styles.filterLabel}>Filters</span>
                    {activeFilterCount > 0 && (
                        <span className={styles.activeFilterCount}>{activeFilterCount}</span>
                    )}
                </div>

                <div className={styles.filterControls}>
                    <div className={styles.filterItem}>
                        <label className={styles.filterLabel}>Status</label>
                        <select
                            className={styles.filterSelect}
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className={styles.filterItem}>
                        <label className={styles.filterLabel}>Billing Type</label>
                        <select
                            className={styles.filterSelect}
                            value={filters.billingType}
                            onChange={(e) => setFilters({ ...filters, billingType: e.target.value })}
                        >
                            <option value="all">All Types</option>
                            <option value="monthly">Monthly</option>
                            <option value="annual">Annual</option>
                            <option value="usage_based">Usage Based</option>
                            <option value="one_time">One Time Purchase</option>
                        </select>
                    </div>

                    <div className={styles.filterItem}>
                        <label className={styles.filterLabel}>Receipt Status</label>
                        <select
                            className={styles.filterSelect}
                            value={filters.receiptStatus}
                            onChange={(e) => setFilters({ ...filters, receiptStatus: e.target.value })}
                        >
                            <option value="all">All</option>
                            <option value="pending">Pending Review</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="none">No Receipt</option>
                        </select>
                    </div>

                    {activeFilterCount > 0 && (
                        <button className={styles.clearFiltersBtn} onClick={clearFilters}>
                            <X size={14} />
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead className={styles.thead}>
                            <tr>
                                <th className={styles.th}>Tool / Client</th>
                                <th className={styles.th}>Requester</th>
                                <th className={styles.th}>Description</th>
                                <th className={styles.th}>Billing Cycle</th>
                                <th className={styles.th}>Cost</th>
                                <th className={styles.th} style={{ textAlign: 'center' }}>Receipt Status</th>
                                <th className={styles.th} style={{ textAlign: 'center' }}>Status</th>
                                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tbody}>
                            {filteredSubscriptions.map((sub) => {
                                const requesterName = sub.requester_name || (sub.user_id ? userMap[sub.user_id] : 'Unknown');
                                const hasPendingReceipt = sub.receipt_status === 'pending_review';

                                return (
                                    <tr key={sub.id}>
                                        <td className={styles.td}>
                                            <div className={styles.toolName}>
                                                {sub.tool_name}
                                            </div>
                                            <div className={styles.clientName}>{sub.client_name || 'Internal'}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium">
                                                {requesterName}
                                            </div>
                                        </td>
                                        <td className={styles.td}>
                                            {sub.description ? (
                                                <div className="text-[11px] text-white/50 leading-tight line-clamp-2 max-w-[200px]" title={sub.description}>
                                                    {sub.description}
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-white/20 italic">No description</span>
                                            )}
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.cycleBadge}>
                                                <RefreshCw size={12} className="mr-2" />
                                                {formatBillingCycle(sub.billing_type)}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.amount}>
                                                ₱ {sub.amount?.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'center' }}>
                                            {hasPendingReceipt && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                                    <AlertCircle size={12} className="stroke-[2.5]" />
                                                    Pending Review
                                                </span>
                                            )}
                                            {sub.receipt_status === 'reviewed' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                                    <FileCheck size={12} className="stroke-[2.5]" />
                                                    Reviewed
                                                </span>
                                            )}
                                            {!sub.receipt_status && !sub.receipt_url && (
                                                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium text-white/20 italic">
                                                    None
                                                </span>
                                            )}
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'center' }}>
                                            <span className={`${styles.badge} ${getStatusClass(sub.status)}`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'right' }}>
                                            <div className="flex items-center justify-end gap-2">
                                                {sub.quote_file_url && (
                                                    <a
                                                        href={sub.quote_file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={styles.viewQuoteBtn}
                                                        title="View Quote"
                                                    >
                                                        <FileText size={14} />
                                                    </a>
                                                )}
                                                <button
                                                    className={styles.viewDetailsBtn}
                                                    onClick={() => setModal({ type: 'view', sub })}
                                                    title="View Details"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    className={`${styles.actionBtn} ${styles.editBtn}`}
                                                    onClick={() => {
                                                        setEditForm(sub);
                                                        setModal({ type: 'edit', sub });
                                                    }}
                                                    title="Edit Subscription"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                    onClick={() => setModal({ type: 'delete', sub })}
                                                    title="Delete Subscription"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredSubscriptions.length === 0 && (
                                <tr>
                                    <td className={styles.emptyState} colSpan={7}>
                                        {activeFilterCount > 0 ? 'No subscriptions match the selected filters.' : 'No active subscriptions found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Overlay */}
            {modal && (
                <div className={styles.modalOverlay} onClick={() => setModal(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>

                        {/* VIEW MODAL */}
                        {modal.type === 'view' && (
                            <>
                                <div className={styles.viewContainer}>
                                    {/* Header: Identity + Actions */}
                                    <div className={styles.headerActions}>
                                        {/* Spacer for 3-column grid centering */}
                                        <div></div>

                                        {/* Centered Content: Status + Identity */}
                                        <div className="flex flex-col items-center gap-2">
                                            <span className={`${styles.badge} ${getStatusClass(modal.sub.status)} scale-100`}>
                                                {modal.sub.status}
                                            </span>
                                            <div className="text-center">
                                                <h3 className="text-3xl font-bold leading-tight text-white mb-1">{modal.sub.tool_name}</h3>
                                                <div className="text-sm text-white/50 font-medium">{modal.sub.client_name || 'Internal Workspace'}</div>
                                                {modal.sub.quote_file_url && (
                                                    <a
                                                        href={modal.sub.quote_file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                                    >
                                                        <FileText size={12} />
                                                        View Quote
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setModal(null)}
                                            className={styles.closeBtn}
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>

                                    {/* Metrics Panel */}
                                    <div className={styles.statsGrid}>
                                        <div className={styles.statCard}>
                                            <span className={styles.statLabel}>Cost</span>
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="text-2xl font-bold font-mono text-white tracking-tight">
                                                    ₱ {modal.sub.amount.toFixed(0)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.statCard}>
                                            <span className={styles.statLabel}>Cycle</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                                    <RefreshCw size={16} />
                                                </div>
                                                <span className="text-lg font-semibold text-white/90 tracking-tight">
                                                    {formatBillingCycle(modal.sub.billing_type).split(' ')[0]}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.statCard}>
                                            <span className={styles.statLabel}>Applied Date</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                                                    <Calendar size={16} />
                                                </div>
                                                <span className="text-sm font-semibold text-white/90 tracking-tight" style={{ whiteSpace: 'nowrap' }}>{modal.sub.renewal_date}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details List */}
                                    <div className={styles.detailsList}>
                                        {/* Description */}
                                        <div className={styles.detailItem}>
                                            <h4 className={styles.detailHeader}>
                                                <FileText size={12} /> Description
                                            </h4>
                                            <div className={styles.descriptionBox}>
                                                {modal.sub.description || <span className="italic text-white/30">No description provided.</span>}
                                            </div>
                                        </div>

                                        {/* Requester Inline Card */}
                                        <div className={styles.detailItem}>
                                            <h4 className={styles.detailHeader}>
                                                <User size={12} /> Requester
                                            </h4>
                                            <div className={styles.requesterCard}>
                                                <div className="text-sm font-semibold text-white">
                                                    {modal.sub.requester_name || (modal.sub.user_id ? userMap[modal.sub.user_id] : 'Unknown')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contract Section Removed - Moved to Header */}

                                        {/* Receipt */}
                                        <div className={styles.detailItem}>
                                            <h4 className={styles.detailHeader}>
                                                <FileCheck size={12} /> Receipt
                                            </h4>
                                            <div className={styles.contractCard}>
                                                {modal.sub.receipt_url ? (
                                                    <div className="flex items-center justify-between w-full">
                                                        <a
                                                            href={modal.sub.receipt_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`${styles.viewDocBtn} bg-[#3b82f6] hover:bg-[#2563eb] shadow-blue-500/20`}
                                                            style={{ textDecoration: 'none' }}
                                                        >
                                                            <span>View Receipt</span>
                                                            <ArrowUpRight size={12} />
                                                        </a>

                                                        {modal.sub.receipt_status === 'pending_review' && (
                                                            <button
                                                                onClick={handleMarkReviewed}
                                                                disabled={!!actionLoading}
                                                                className={styles.markReviewedBtn}
                                                            >
                                                                {actionLoading === modal.sub.id ? (
                                                                    <Loader2 size={14} className="animate-spin" />
                                                                ) : (
                                                                    <CheckCircle size={14} className="stroke-[2.5]" />
                                                                )}
                                                                Mark Reviewed
                                                            </button>
                                                        )}

                                                        {modal.sub.receipt_status === 'reviewed' && (
                                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                                <CheckCircle size={14} className="text-emerald-400 stroke-[2.5]" />
                                                                <span className="text-xs font-bold uppercase tracking-wide text-emerald-400">Reviewed</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/30 italic">No Receipt Uploaded</span>
                                                )}
                                            </div>
                                        </div>

                                    </div>

                                    {/* Close Button */}
                                    <button
                                        className={styles.bottomCloseBtn}
                                        onClick={() => setModal(null)}
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </>
                        )}

                        {/* DELETE MODAL */}
                        {modal.type === 'delete' && (
                            <>
                                <h3 className={styles.modalTitle}>Delete Subscription</h3>
                                <p className={styles.modalDescription}>
                                    Are you sure you want to remove <strong>{modal.sub.tool_name}</strong>? This action cannot be undone.
                                </p>
                                <div className={styles.modalActions}>
                                    <button className={`${styles.modalBtn} ${styles.btnCancel}`} onClick={() => setModal(null)}>
                                        Cancel
                                    </button>
                                    <button
                                        className={`${styles.modalBtn} ${styles.btnDelete}`}
                                        onClick={handleDelete}
                                        disabled={!!actionLoading}
                                    >
                                        {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Delete'}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* EDIT MODAL */}
                        {modal.type === 'edit' && (
                            <>
                                <h3 className={styles.modalTitle}>Edit Subscription</h3>
                                <div className="text-left space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Tool Name</label>
                                        <input
                                            className={styles.input}
                                            value={editForm.tool_name || ''}
                                            onChange={e => setEditForm({ ...editForm, tool_name: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Description / Remarks</label>
                                        <textarea
                                            className={styles.input}
                                            value={editForm.description || ''}
                                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                            rows={2}
                                            style={{ minHeight: '60px', resize: 'vertical' }}
                                        />
                                    </div>
                                    <div className={editForm.billing_type === 'usage_based' ? '' : 'grid grid-cols-2 gap-4'}>
                                        {editForm.billing_type !== 'usage_based' && (
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>Amount</label>
                                                <input
                                                    type="number"
                                                    className={styles.input}
                                                    value={editForm.amount || 0}
                                                    onChange={e => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                        )}
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Currency</label>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                value="₱"
                                                readOnly
                                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', cursor: 'not-allowed' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Billing Cycle</label>
                                            <select
                                                className={styles.select}
                                                value={editForm.billing_type || 'monthly'}
                                                onChange={e => setEditForm({ ...editForm, billing_type: e.target.value })}
                                            >
                                                <option value="monthly">Monthly</option>
                                                <option value="annual">Annual</option>
                                                <option value="usage_based">Usage Based</option>
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Status</label>
                                            <select
                                                className={styles.select}
                                                value={editForm.status || 'active'}
                                                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Applied Date</label>
                                        <input
                                            type="date"
                                            className={styles.input}
                                            value={editForm.renewal_date || ''}
                                            onChange={e => setEditForm({ ...editForm, renewal_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className={styles.modalActions}>
                                    <button className={`${styles.modalBtn} ${styles.btnCancel}`} onClick={() => setModal(null)}>
                                        Cancel
                                    </button>
                                    <button
                                        className={`${styles.modalBtn} ${styles.btnSave}`}
                                        onClick={handleSaveEdit}
                                        disabled={!!actionLoading}
                                    >
                                        {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
