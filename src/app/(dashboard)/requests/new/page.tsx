'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
// import { createClient } from '@/utils/supabase/client';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TagInput } from '@/components/ui/TagInput';
// import { Card } from '@/components/ui/Card'; // Custom card used
import { ArrowLeft, UploadCloud, X, File } from 'lucide-react';
import Link from 'next/link';
import styles from './forms.module.css';

export default function NewRequestPage() {
    const router = useRouter();
    const { user } = useAuth();
    // const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        tool_name: '',
        billing_type: 'monthly',
        amount: '',
        justification: '',
        client: [] as string[],
        token_credits: '',
        planned_unsubscribe_date: '',
    });

    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFileError(null);
        setError(null);

        try {
            if (!user) {
                router.replace('/login?next=/requests/new');
                return;
            }

            // Convert amount to number (skip validation for usage_based)
            let numericAmount = 0;
            if (formData.billing_type !== 'usage_based') {
                numericAmount = parseFloat(formData.amount);
                if (isNaN(numericAmount)) {
                    setError('Please enter a valid amount.');
                    setLoading(false);
                    return;
                }
            }

            // Convert token credits to number if applicable
            let numericTokenCredits = 0;
            if (formData.billing_type === 'token_based') {
                numericTokenCredits = parseInt(formData.token_credits);
                if (isNaN(numericTokenCredits)) {
                    setError('Please enter valid token credits.');
                    setLoading(false);
                    return;
                }
            }

            let fileUrl = null;

            // Upload file to Firebase Storage if file is selected
            if (selectedFile) {
                try {
                    if (!storage) {
                        throw new Error('Firebase Storage is not configured.');
                    }

                    // Create a unique file name
                    const timestamp = Date.now();
                    const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const fileName = `quotes/${user.uid}/${timestamp}_${sanitizedFileName}`; // Organize by user
                    const storageRef = ref(storage, fileName);

                    console.log('Uploading file...');
                    await uploadBytes(storageRef, selectedFile);
                    fileUrl = await getDownloadURL(storageRef);
                } catch (uploadError: any) {
                    console.error("Upload error:", uploadError);
                    setError('Failed to upload file. ' + (uploadError.message || ''));
                    setLoading(false);
                    return;
                }
            }

            if (!db) {
                throw new Error('Database connection failed.');
            }

            // Save request to Firestore
            await addDoc(collection(db, "subscription_requests"), {
                ...formData,
                amount: numericAmount, // Store as number
                token_credits: numericTokenCredits, // Store as number
                status: 'pending_approval',
                created_at: new Date().toISOString(),
                requester_id: user.uid,
                quote_file_url: fileUrl,
                quote_file_name: selectedFile?.name || null,
            });

            console.log('Request submitted successfully!');
            router.push('/requests');
        } catch (err: any) {
            console.error("Submission error:", err);
            setError(err.message || 'An error occurred while submitting the request.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const validateAndSetFile = (file: File) => {
        setFileError(null);

        // Validate file type
        const allowedTypes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            setFileError('Invalid file type. Please upload PDF, PNG, JPG, DOC, or DOCX files.');
            return;
        }

        // Validate file size (5MB = 5 * 1024 * 1024 bytes)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            setFileError('File size exceeds 5MB limit.');
            return;
        }

        setSelectedFile(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    const handleFileRemove = () => {
        setSelectedFile(null);
        setFileError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUploadAreaClick = () => {
        fileInputRef.current?.click();
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Link href="/requests" className={styles.backLink}>
                    <ArrowLeft size={20} />
                </Link>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>New Subscription Request</h1>
                    <p className={styles.subtitle}>Submit a request for a new tool or license.</p>
                </div>
            </div>

            <div className={styles.card}>
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded mb-6 text-sm">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.group}>
                        <Input
                            id="tool_name"
                            label="Tool / Application Name"
                            placeholder="e.g. Figma, Adobe Creative Cloud"
                            value={formData.tool_name}
                            onChange={handleChange}
                            required
                            className={styles.inputOverride}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <Select
                                id="billing_type"
                                label="Billing Cycle"
                                options={[
                                    { value: 'monthly', label: 'Monthly' },
                                    { value: 'annual', label: 'Annual' },
                                    { value: 'usage_based', label: 'Usage Based' },
                                    { value: 'token_based', label: 'Token Based' },
                                    { value: 'one_time', label: 'One-time Purchase' },
                                ]}
                                value={formData.billing_type}
                                onChange={handleChange}
                                className={styles.inputOverride}
                            />
                        </div>

                        {formData.billing_type === 'token_based' && (
                            <div className="md:col-span-1">
                                <Input
                                    id="token_credits"
                                    label="Token Credits"
                                    type="number"
                                    placeholder="0"
                                    value={formData.token_credits}
                                    onChange={handleChange}
                                    required
                                    className={`${styles.inputOverride} ${styles.noSpinners}`}
                                />
                            </div>
                        )}

                        {formData.billing_type !== 'usage_based' && (
                            <div className="md:col-span-1">
                                <Input
                                    id="amount"
                                    label="Amount (₱)"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    required
                                    className={`${styles.inputOverride} ${styles.noSpinners}`}
                                />
                            </div>
                        )}
                    </div>

                    {formData.billing_type === 'monthly' && (
                        <div className={styles.group}>
                            <label htmlFor="planned_unsubscribe_date" className={styles.label}>
                                Planned Unsubscribe Date
                            </label>
                            <input
                                id="planned_unsubscribe_date"
                                type="date"
                                value={formData.planned_unsubscribe_date}
                                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                onChange={handleChange}
                                className={styles.inputOverride}
                                style={{ colorScheme: 'dark', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.72rem', color: 'rgba(142,156,162,0.5)', marginTop: '0.25rem', display: 'block' }}>
                                Optional — set a target date to stop this monthly subscription.
                            </span>
                        </div>
                    )}

                    <div className={styles.group}>
                        <label htmlFor="client" className={styles.label}>
                            Client / Project
                        </label>
                        <TagInput
                            id="client"
                            tags={formData.client}
                            onChange={(tags) => setFormData({ ...formData, client: tags })}
                            placeholder="Type and press Enter to add..."
                        />
                    </div>

                    <div className={styles.group}>
                        <label htmlFor="justification" className={styles.label}>
                            Description / Remarks
                        </label>
                        <textarea
                            id="justification"
                            className={`${styles.inputOverride} min-h-[100px] p-2 rounded border border-[var(--border)] w-full`}
                            placeholder="Describe the purpose of this subscription and any relevant remarks for the admin."
                            value={formData.justification}
                            onChange={handleChange}
                            maxLength={200}
                            required
                        />
                        <span style={{ fontSize: '0.75rem', color: 'rgba(142, 156, 162, 0.5)', textAlign: 'right', display: 'block' }}>
                            {formData.justification.length} / 200
                        </span>
                    </div>

                    <div className={styles.group}>
                        <label className={styles.label}>Quote Document</label>
                        <div
                            className={styles.uploadArea}
                            onClick={handleUploadAreaClick}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                onChange={handleFileSelect}
                                className={styles.fileInput}
                                style={{ display: 'none' }}
                            />

                            {selectedFile ? (
                                <div className={styles.fileSelected}>
                                    <File className={styles.fileIcon} size={24} />
                                    <div className={styles.fileInfo}>
                                        <p className={styles.fileName}>{selectedFile.name}</p>
                                        <p className={styles.fileSize}>
                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFileRemove();
                                        }}
                                        className={styles.removeButton}
                                        aria-label="Remove file"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <UploadCloud className={styles.uploadIcon} size={32} />
                                    <p className={styles.uploadText}>Upload Quote</p>
                                    <p className={styles.uploadSub}>PDF, PNG, JPG, DOC, DOCX up to 5MB</p>
                                </>
                            )}
                        </div>
                        {fileError && (
                            <span className={styles.errorText}>{fileError}</span>
                        )}
                    </div>

                    <div className={styles.footer}>
                        <Link href="/requests">
                            <Button type="button" variant="ghost">Cancel</Button>
                        </Link>
                        <Button type="submit" isLoading={loading} variant="gradient">Submit Request</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
