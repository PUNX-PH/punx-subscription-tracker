import { ReactNode } from 'react';

export const Card = ({
    children,
    className = '',
    hoverable = false
}: {
    children: ReactNode;
    className?: string;
    hoverable?: boolean;
}) => (
    <div className={`
        rounded-[var(--radius)] 
        bg-[var(--card)] 
        text-[var(--card-foreground)]
        p-6
        ${hoverable ? 'hover:bg-[var(--secondary)] transition-colors duration-200 cursor-pointer' : ''}
        ${className}
    `}>
        {children}
    </div>
);
