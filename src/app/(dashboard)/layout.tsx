import DashboardLayout from '@/components/layout/DashboardLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireOnboarding } from '@/components/auth/RequireOnboarding';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <RequireAuth>
            <RequireOnboarding>
                <DashboardLayout>{children}</DashboardLayout>
            </RequireOnboarding>
        </RequireAuth>
    );
}
