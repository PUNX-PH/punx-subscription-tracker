import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'outline';
}

export const Badge = ({ className = '', variant = 'default', children, ...props }: BadgeProps) => {

    const variants = {
        default: 'bg-[var(--secondary)] text-[var(--foreground)] border border-[var(--border)]',
        success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
        warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
        danger: 'bg-[var(--destructive)]/15 text-[var(--destructive)] border border-[var(--destructive)]/20',
        info: 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/20',
        secondary: 'bg-[var(--secondary)] text-[var(--muted-foreground)] border border-[var(--border)]',
        outline: 'bg-transparent text-[var(--muted-foreground)] border border-[var(--border)]',
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
};
