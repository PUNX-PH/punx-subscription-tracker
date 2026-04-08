'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Search, Loader2 } from 'lucide-react';
import styles from './clients.module.css';

interface Client {
    id: string;
    name: string;
    createdAt: string;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const q = query(collection(db, 'clients'), orderBy('name'));
            const querySnapshot = await getDocs(q);
            const clientsData: Client[] = [];
            querySnapshot.forEach((doc) => {
                clientsData.push({ id: doc.id, ...doc.data() } as Client);
            });
            setClients(clientsData);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientName.trim()) return;

        setSubmitting(true);
        try {
            const docRef = await addDoc(collection(db, 'clients'), {
                name: newClientName.trim(),
                createdAt: new Date().toISOString()
            });

            const newClient: Client = {
                id: docRef.id,
                name: newClientName.trim(),
                createdAt: new Date().toISOString()
            };

            setClients([...clients, newClient].sort((a, b) => a.name.localeCompare(b.name)));
            setNewClientName('');
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error adding client:', error);
            alert('Failed to add client. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClient = async () => {
        if (!deleteId) return;

        try {
            await deleteDoc(doc(db, 'clients', deleteId));
            setClients(clients.filter(c => c.id !== deleteId));
            setDeleteId(null);
        } catch (error) {
            console.error('Error deleting client:', error);
            alert('Failed to delete client.');
        }
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <h1 className={styles.title}>Manage Clients</h1>
                    <p className={styles.subtitle}>Add and manage client list for subscription requests</p>
                </div>
                <button className={styles.addBtn} onClick={() => setIsModalOpen(true)}>
                    <Plus size={20} />
                    Add Client
                </button>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.filterBar}>
                    <div className="relative w-full max-w-md">
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.input}
                        />
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead className={styles.thead}>
                            <tr>
                                <th>Client Name</th>
                                <th className={styles.colCenter}>Created At</th>
                                <th className={styles.colRight}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tbody}>
                            {filteredClients.map((client) => (
                                <tr key={client.id}>
                                    <td className={styles.td}>
                                        <div className={styles.clientName}>{client.name}</div>
                                    </td>
                                    <td className={`${styles.td} ${styles.colCenter}`}>
                                        <div className={styles.clientMeta}>
                                            {new Date(client.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className={`${styles.td} ${styles.colRight}`}>
                                        <div className={styles.actions}>
                                            <button
                                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                onClick={() => setDeleteId(client.id)}
                                                title="Delete Client"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredClients.length === 0 && (
                                <tr>
                                    <td colSpan={3} className={styles.emptyState}>
                                        {searchQuery ? 'No clients matching your search.' : 'No clients added yet.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Client Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Add New Client</h3>
                        <form onSubmit={handleAddClient}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Client Name</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value.toUpperCase())}
                                    placeholder="e.g. Acme Corp"
                                    style={{ textTransform: 'uppercase' }}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={`${styles.modalBtn} ${styles.btnCancel}`}
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`${styles.modalBtn} ${styles.btnSubmit}`}
                                    disabled={submitting}
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Add Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className={styles.modalOverlay} onClick={() => setDeleteId(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Confirm Delete</h3>
                        <p className="text-white/70 mb-6">
                            Are you sure you want to delete this client? This might affect existing subscriptions linked to this client.
                        </p>
                        <div className={styles.modalActions}>
                            <button
                                className={`${styles.modalBtn} ${styles.btnCancel}`}
                                onClick={() => setDeleteId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className={`${styles.modalBtn} ${styles.btnDelete}`}
                                onClick={handleDeleteClient}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
