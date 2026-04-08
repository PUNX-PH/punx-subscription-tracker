'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './onboarding.module.css';

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        department: '',
        role: '' // User will enter their specific role
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, id } = e.target;
        const fieldName = name || id;
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (!user) {
                throw new Error('No user logged in');
            }

            // Save user profile to Firestore
            await setDoc(doc(db, 'user_profiles', user.uid), {
                uid: user.uid,
                email: user.email,
                fullName: formData.fullName,
                department: formData.department,
                role: formData.role,
                onboardingCompleted: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            console.log('Profile created successfully');

            // Redirect to Dashboard
            router.push('/dashboard');
        } catch (error: any) {
            console.error('Failed to complete onboarding:', error);
            setError(error.message || 'Failed to save profile. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const isFormValid = formData.fullName && formData.department && formData.role;

    return (
        <div className={styles.pageContainer}>
            {/* Ambient Background */}
            <div className={styles.glowTopLeft} />
            <div className={styles.glowBottomRight} />

            <div className={styles.cardWrapper}>
                <div className={styles.onboardingCard}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Welcome to PUNX</h1>
                        <p className={styles.subtitle}>
                            Let's set up your profile to customize your workspace.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {/* Full Name */}
                        <div>
                            <Input
                                id="fullName"
                                name="fullName"
                                label="Full Name"
                                placeholder="e.g. Alex Chen"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Department - TextField as requested */}
                        <div>
                            <Input
                                id="department"
                                name="department"
                                label="Department"
                                placeholder="e.g. Marketing, Engineering, Design"
                                value={formData.department}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Role - Text Input */}
                        <div>
                            <Input
                                id="role"
                                name="role"
                                label="Role"
                                placeholder="e.g. AI Artist, Game Developer, HR Manager"
                                value={formData.role}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            variant="gradient"
                            size="lg"
                            className="w-full mt-2"
                            isLoading={isLoading}
                            disabled={!isFormValid}
                        >
                            Complete Setup
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
