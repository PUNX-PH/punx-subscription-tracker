// import { createClient } from '@/utils/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export default async function TransactionsPage() {
    // const supabase = await createClient();

    // Mock data
    const transactions = [
        {
            id: 'tx_1',
            date: '2025-05-01',
            tool: 'Slack Pro',
            amount: 450.00,
            currency: 'USD',
            invoice_no: 'INV-2025-001',
            status: 'paid'
        },
        {
            id: 'tx_2',
            date: '2025-05-03',
            tool: 'Figma Professional',
            amount: 45.00,
            currency: 'USD',
            invoice_no: 'INV-2025-055',
            status: 'paid'
        },
        {
            id: 'tx_3',
            date: '2025-05-15',
            tool: 'AWS',
            amount: 1250.00,
            currency: 'USD',
            invoice_no: 'INV-2025-098',
            status: 'pending'
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 text-[var(--foreground)]">Transactions</h1>
                    <p className="text-[var(--muted-foreground)]">Payment history and invoices</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Download size={16} />
                        Export
                    </Button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden border-[var(--border)]">
                <div className="p-4 border-b border-[var(--border)] flex flex-col md:flex-row gap-4 justify-between items-center bg-[var(--card)]/50">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted-foreground)]" size={16} />
                        <Input
                            placeholder="Search invoices..."
                            className="pl-9 h-9"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button variant="ghost" size="sm" className="gap-2 border border-[var(--border)]">
                            <Filter size={14} />
                            Filter
                        </Button>
                    </div>
                </div>

                <Table>
                    <TableHeader className="bg-[var(--muted)]/30">
                        <TableHead>Date</TableHead>
                        <TableHead>Tool</TableHead>
                        <TableHead>Invoice No.</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableHeader>
                    <tbody>
                        {transactions.map((tx) => (
                            <tr key={tx.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/30 transition-colors">
                                <TableCell>{tx.date}</TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-[var(--secondary)] flex items-center justify-center text-[10px] font-bold">
                                            {tx.tool.substring(0, 1)}
                                        </div>
                                        {tx.tool}
                                    </div>
                                </TableCell>
                                <TableCell className="text-[var(--muted-foreground)] font-mono text-xs">{tx.invoice_no}</TableCell>
                                <TableCell className="font-medium">
                                    ₱ {tx.amount.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={tx.status === 'paid' ? 'success' : 'warning'}>
                                        {tx.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-8 text-xs">View</Button>
                                </TableCell>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                {transactions.length > 0 && (
                    <div className="p-4 border-t border-[var(--border)] flex justify-center">
                        <Button variant="ghost" size="sm" className="text-xs text-[var(--muted-foreground)]">Load More</Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
