import { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export const Table = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <div className={`w-full overflow-auto rounded-lg border border-[var(--border)] ${className}`}>
        <table className="w-full text-sm text-left">
            {children}
        </table>
    </div>
);

export const TableHeader = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <thead className={`bg-[var(--secondary)] text-[var(--muted-foreground)] uppercase ${className}`}>
        <tr>{children}</tr>
    </thead>
);

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    children: ReactNode;
    className?: string;
}

export const TableRow = ({ children, className = '', ...props }: TableRowProps) => (
    <tr className={`border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors ${className}`} {...props}>
        {children}
    </tr>
);

interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
    children?: ReactNode;
}

export const TableHead = ({ children, className = '', ...props }: TableHeadProps) => (
    <th className={`px-6 py-3 font-medium tracking-wider text-left ${className}`} {...props}>
        {children}
    </th>
);

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
    children?: ReactNode;
}

export const TableCell = ({ children, className = '', ...props }: TableCellProps) => (
    <td className={`px-6 py-4 whitespace-nowrap text-[var(--foreground)] ${className}`} {...props}>
        {children}
    </td>
);
