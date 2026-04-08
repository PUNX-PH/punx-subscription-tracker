import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
    children: ReactNode;
}

import styles from './layout.module.css';

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className={styles.layout}>
            <Sidebar />
            <main className={styles.mainContent}>
                <div className={styles.container}>
                    {children}
                </div>
            </main>
        </div>
    );
}
