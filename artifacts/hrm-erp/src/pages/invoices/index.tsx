import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { customFetch } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: { id: string; name: string };
  status: string;
  totalAmount: number | string;
  amountDue: number | string;
  dueDate: string | null;
  createdAt: string;
};

type Customer = { id: string; name: string; code: string };
type Order = { id: string; orderNumber: string };

const INVOICE_STATUSES = ['ALL', 'DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE'];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-50 text-slate-700 border-slate-200',
  SENT: 'bg-blue-50 text-blue-700 border-blue-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

const EMPTY_INVOICE = { customerId: '', orderId: '', dueDate: '', notes: '' };
const EMPTY_PAYMENT = { amount: '', method: 'BANK_TRANSFER', reference: '' };

export default function InvoicesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['/api/v1/invoices', activeTab],
    queryFn: () =>
      customFetch<{ data: Invoice[] }>(
        '/api/v1/invoices' + (activeTab !== 'ALL' ? `?status=${activeTab}` : '')
      ),
  });

  const { data: customersData } = useQuery({
    queryKey: ['/api/v1/customers'],
    queryFn: () => customFetch<{ data: Customer[] }>('/api/v1/customers'),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['/api/v1/orders'],
    queryFn: () => customFetch<{ data: Order[] }>('/api/v1/orders'),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch('/api/v1/invoices', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: 'Invoice created' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/invoices'] });
      setShowCreate(false);
      setInvoiceForm(EMPTY_INVOICE);
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to create invoice', description: e?.message }),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch(`/api/v1/invoices/${selectedInvoice!.id}/payments`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast({ title: 'Payment recorded' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/invoices'] });
      setShowPayment(false);
      setPaymentForm(EMPTY_PAYMENT);
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to record payment', description: e?.message }),
  });

  const invoices = invoicesData?.data ?? [];
  const customers = customersData?.data ?? [];
  const orders = ordersData?.data ?? [];

  const totalInvoices = invoices.length;
  const overdue = invoices.filter((i) => i.status === 'OVERDUE').length;
  const totalDue = invoices.reduce((s, i) => s + Number(i.amountDue ?? 0), 0);
  const totalPaid = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage invoices and track payments.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create Invoice
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Invoices</p>
          <p className="text-2xl font-bold mt-1">{totalInvoices}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{overdue}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Due</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">₹{totalDue.toLocaleString('en-IN')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Paid</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">₹{totalPaid.toLocaleString('en-IN')}</p>
        </Card>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {INVOICE_STATUSES.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoices Table */}
        <div className="lg:col-span-2">
          <Card>
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading...</div>
            ) : invoices.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No invoices found.
              </div>
            ) : (
              <div className="overflow-auto rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice #</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount Due</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                          selectedInvoice?.id === invoice.id ? 'bg-accent/30' : ''
                        }`}
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">{invoice.invoiceNumber}</td>
                        <td className="px-4 py-3 font-medium">{invoice.customer?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[invoice.status] ?? ''}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          ₹{Number(invoice.totalAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-amber-700">
                          ₹{Number(invoice.amountDue).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Invoice Detail */}
        <div className="lg:col-span-1">
          {!selectedInvoice ? (
            <Card className="h-full min-h-[300px] flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
              Select an invoice to view details
            </Card>
          ) : (
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="font-bold">{selectedInvoice.invoiceNumber}</h3>
                <p className="text-xs text-muted-foreground">{selectedInvoice.customer?.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium mt-2 inline-block ${STATUS_COLORS[selectedInvoice.status] ?? ''}`}>
                  {selectedInvoice.status}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-mono font-semibold">₹{Number(selectedInvoice.totalAmount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Due</span>
                  <span className="font-mono font-semibold text-amber-600">₹{Number(selectedInvoice.amountDue).toLocaleString('en-IN')}</span>
                </div>
                {selectedInvoice.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date</span>
                    <span>{format(new Date(selectedInvoice.dueDate), 'dd MMM yyyy')}</span>
                  </div>
                )}
              </div>
              {!['PAID', 'CANCELLED'].includes(selectedInvoice.status) && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setShowPayment(true)}
                >
                  Record Payment
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select
                value={invoiceForm.customerId}
                onValueChange={(v) => setInvoiceForm((f) => ({ ...f, customerId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Linked Order (optional)</Label>
              <Select
                value={invoiceForm.orderId}
                onValueChange={(v) => setInvoiceForm((f) => ({ ...f, orderId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select order (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.orderNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Invoice notes..."
                rows={3}
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  ...invoiceForm,
                  orderId: invoiceForm.orderId || undefined,
                  dueDate: invoiceForm.dueDate || undefined,
                })
              }
              disabled={createMutation.isPending || !invoiceForm.customerId}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment — {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                placeholder={String(selectedInvoice?.amountDue ?? '')}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select
                value={paymentForm.method}
                onValueChange={(v) => setPaymentForm((f) => ({ ...f, method: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input
                placeholder="Transaction ID / Cheque No."
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button
              onClick={() =>
                recordPaymentMutation.mutate({
                  amount: Number(paymentForm.amount),
                  method: paymentForm.method,
                  reference: paymentForm.reference || undefined,
                })
              }
              disabled={recordPaymentMutation.isPending || !paymentForm.amount}
            >
              {recordPaymentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
