import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { DollarSign, Plus, Play, CheckCircle, ChevronRight, Loader2 } from 'lucide-react';
import { customFetch } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PayPeriod = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  payDate: string;
  status: 'DRAFT' | 'PROCESSING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  createdAt: string;
  processedAt: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

export default function PayrollPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayPeriod | null>(null);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', payDate: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['/api/v1/payroll/periods'],
    queryFn: () => customFetch<{ data: PayPeriod[]; pagination: any }>('/api/v1/payroll/periods'),
  });

  const { data: runData, isLoading: runLoading } = useQuery({
    queryKey: ['/api/v1/payroll/run', selectedPeriod?.id],
    queryFn: () =>
      customFetch<{ period: PayPeriod; payslips: any[] }>(
        `/api/v1/payroll/run/${selectedPeriod!.id}`
      ),
    enabled: !!selectedPeriod,
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      customFetch('/api/v1/payroll/periods', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: 'Pay period created' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/payroll/periods'] });
      setShowCreate(false);
      setForm({ name: '', startDate: '', endDate: '', payDate: '' });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to create pay period', description: e?.message }),
  });

  const runMutation = useMutation({
    mutationFn: (periodId: string) =>
      customFetch(`/api/v1/payroll/run/${periodId}`, { method: 'POST', body: '{}' }),
    onSuccess: (_, periodId) => {
      toast({ title: 'Payroll computed successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/payroll/periods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/payroll/run', periodId] });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Payroll run failed', description: e?.message }),
  });

  const approveMutation = useMutation({
    mutationFn: (periodId: string) =>
      customFetch(`/api/v1/payroll/approve/${periodId}`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: 'BANK_TRANSFER' }),
      }),
    onSuccess: () => {
      toast({ title: 'Payroll approved and marked as paid' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/payroll/periods'] });
      if (selectedPeriod)
        queryClient.invalidateQueries({ queryKey: ['/api/v1/payroll/run', selectedPeriod.id] });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Approval failed', description: e?.message }),
  });

  const periods = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage pay periods, run payroll, and approve payslips.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Pay Period
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pay Periods List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Pay Periods
          </h2>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : periods.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No pay periods yet. Create one to get started.
            </Card>
          ) : (
            periods.map((period) => (
              <Card
                key={period.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${
                  selectedPeriod?.id === period.id ? 'border-primary/40 bg-accent/30' : ''
                }`}
                onClick={() => setSelectedPeriod(period)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{period.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pay date: {format(new Date(period.payDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        STATUS_COLORS[period.status]
                      }`}
                    >
                      {period.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(period.startDate), 'dd MMM')} –{' '}
                  {format(new Date(period.endDate), 'dd MMM yyyy')}
                </p>
              </Card>
            ))
          )}
        </div>

        {/* Period Detail / Payslips */}
        <div className="lg:col-span-2">
          {!selectedPeriod ? (
            <Card className="h-full min-h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Select a pay period to view details
            </Card>
          ) : (
            <Card className="p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">{selectedPeriod.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedPeriod.startDate), 'dd MMM yyyy')} –{' '}
                    {format(new Date(selectedPeriod.endDate), 'dd MMM yyyy')} · Pay date:{' '}
                    {format(new Date(selectedPeriod.payDate), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {(selectedPeriod.status === 'DRAFT' ||
                    selectedPeriod.status === 'PROCESSING') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runMutation.mutate(selectedPeriod.id)}
                      disabled={runMutation.isPending}
                    >
                      {runMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Run Payroll
                    </Button>
                  )}
                  {selectedPeriod.status === 'PROCESSING' && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => approveMutation.mutate(selectedPeriod.id)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Approve &amp; Pay
                    </Button>
                  )}
                </div>
              </div>

              {runLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Loading payslips...
                </div>
              ) : !runData || runData.payslips.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg">
                  No payslips yet. Click <strong>Run Payroll</strong> to compute payslips for all
                  active employees.
                </div>
              ) : (
                <div className="overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Gross
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Deductions
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Net Pay
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {runData.payslips.map((ps: any) => (
                        <tr key={ps.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {ps.employee?.firstName} {ps.employee?.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {ps.employee?.employeeCode}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            ₹{Number(ps.grossEarnings).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-red-600">
                            ₹{Number(ps.totalDeductions).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-emerald-700">
                            ₹{Number(ps.netPay).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                                STATUS_COLORS[ps.status] ?? ''
                              }`}
                            >
                              {ps.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-muted/30">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-sm">
                          Total ({runData.payslips.length} employees)
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-sm">
                          ₹
                          {runData.payslips
                            .reduce((s: number, p: any) => s + Number(p.grossEarnings), 0)
                            .toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-sm text-red-600">
                          ₹
                          {runData.payslips
                            .reduce((s: number, p: any) => s + Number(p.totalDeductions), 0)
                            .toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-sm text-emerald-700">
                          ₹
                          {runData.payslips
                            .reduce((s: number, p: any) => s + Number(p.netPay), 0)
                            .toLocaleString('en-IN')}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Create Pay Period Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Pay Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="e.g. July 2025"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Pay Date</Label>
              <Input
                type="date"
                value={form.payDate}
                onChange={(e) => setForm((f) => ({ ...f, payDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.name || !form.startDate || !form.endDate || !form.payDate}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
