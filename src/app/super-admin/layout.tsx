'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireOnboarding } from '@/components/auth/RequireOnboarding';
import { RequireAdmin } from '@/components/auth/RequireAdmin';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    return (
        // <RequireAuth>
        // <RequireOnboarding>
        // <RequireAdmin>
        <div className="min-h-screen bg-[#0a0a0a] relative font-sans text-foreground overflow-x-hidden">
            {/* Vibrant Super Admin Theme - Matching Login Page */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* 1. Top Right Strong Red Glow */}
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[120px]"></div>

                {/* 2. Bottom Left Orange Glow */}
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-orange-500/20 rounded-full blur-[120px]"></div>

                {/* 3. Center Warmth */}
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-[1400px] mx-auto p-6 md:p-12">
                <div className="mb-8">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="gap-2 text-white/60 hover:text-white pl-0 hover:bg-transparent transition-colors">
                            <ArrowLeft size={16} />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>
                {children}
            </div>
        </div>
        // </RequireAdmin>
        // </RequireOnboarding>
        // </RequireAuth>
    );
}
