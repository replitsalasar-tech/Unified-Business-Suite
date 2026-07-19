import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users2, Plus, Loader2, ChevronRight } from 'lucide-react';
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

type Customer = {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  paymentTerms: string | null;
  creditLimit: number | string | null;
  currency: string;
  isActive: boolean;
};

type Activity = {
  id: string;
  type: string;
  subject: string;
  notes: string | null;
  outcome: string | null;
  createdAt: string;
};

const EMPTY_CUSTOMER = {
  code: '',
  name: '',
  contactName: '',
  email: '',
  phone: '',
  paymentTerms: 'NET30',
  creditLimit: '',
  currency: 'INR',
  notes: '',
};

const EMPTY_ACTIVITY = {
  type: 'CALL',
  subject: '',
  notes: '',
  outcome: '',
};

const ACTIVITY_COLORS: Record<string, string> = {
  CALL: 'bg-blue-50 text-blue-700 border-blue-200',
  EMAIL: 'bg-purple-50 text-purple-700 border-purple-200',
  MEETING: 'bg-amber-50 text-amber-700 border-amber-200',
  NOTE: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function CustomersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER);
  const [activityForm, setActivityForm] = useState(EMPTY_ACTIVITY);

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['/api/v1/customers'],
    queryFn: () => customFetch<{ data: Customer[] }>('/api/v1/customers'),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['/api/v1/orders', selectedCustomer?.id],
    queryFn: () =>
      customFetch<{ data: any[] }>(`/api/v1/orders?customerId=${selectedCustomer!.id}`),
    enabled: !!selectedCustomer,
  });

  const { data: activitiesData } = useQuery({
    queryKey: ['/api/v1/customers', selectedCustomer?.id, 'activities'],
    queryFn: () =>
      customFetch<{ data: Activity[] }>(
        `/api/v1/customers/${selectedCustomer!.id}/activities`
      ),
    enabled: !!selectedCustomer,
  });

  const createCustomerMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch('/api/v1/customers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: 'Customer created' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/customers'] });
      setShowCreate(false);
      setCustomerForm(EMPTY_CUSTOMER);
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to create customer', description: e?.message }),
  });

  const logActivityMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch(`/api/v1/customers/${selectedCustomer!.id}/activities`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast({ title: 'Activity logged' });
      queryClient.invalidateQueries({
        queryKey: ['/api/v1/customers', selectedCustomer?.id, 'activities'],
      });
      setShowLogActivity(false);
      setActivityForm(EMPTY_ACTIVITY);
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to log activity', description: e?.message }),
  });

  const customers = customersData?.data ?? [];
  const recentOrders = ordersData?.data ?? [];
  const activities = activitiesData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage customer accounts, orders, and activities.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customers Table */}
        <div className="lg:col-span-2">
          <Card>
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading...</div>
            ) : customers.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                <Users2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No customers yet.
              </div>
            ) : (
              <div className="overflow-auto rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Terms</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Credit Limit</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                          selectedCustomer?.id === customer.id ? 'bg-accent/30' : ''
                        }`}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">{customer.code}</td>
                        <td className="px-4 py-3 font-medium">{customer.name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{customer.contactName ?? '—'}</td>
                        <td className="px-4 py-3 text-xs">{customer.email ?? '—'}</td>
                        <td className="px-4 py-3 text-xs">{customer.paymentTerms ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {customer.creditLimit ? `₹${Number(customer.creditLimit).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                            {customer.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Customer Detail Panel */}
        <div className="lg:col-span-1">
          {!selectedCustomer ? (
            <Card className="h-full min-h-[300px] flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
              Select a customer to view details
            </Card>
          ) : (
            <Card className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{selectedCustomer.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedCustomer.code}</p>
                  {selectedCustomer.contactName && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedCustomer.contactName}</p>
                  )}
                  {selectedCustomer.email && (
                    <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
                  )}
                  {selectedCustomer.phone && (
                    <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                  )}
                  {selectedCustomer.creditLimit && (
                    <p className="text-xs mt-1">
                      Credit: <span className="font-medium">₹{Number(selectedCustomer.creditLimit).toLocaleString('en-IN')}</span>
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLogActivity(true)}
                >
                  + Activity
                </Button>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Recent Orders
                </h4>
                {recentOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No orders</p>
                ) : (
                  <div className="space-y-1">
                    {recentOrders.slice(0, 4).map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-2 rounded border text-xs">
                        <span className="font-mono">{order.orderNumber}</span>
                        <span>₹{Number(order.totalAmount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Activity Log
                </h4>
                {activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No activities</p>
                ) : (
                  <div className="space-y-2">
                    {activities.slice(0, 5).map((act) => (
                      <div key={act.id} className="text-xs border rounded p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <span className={`px-1.5 py-0.5 rounded-full border font-medium ${ACTIVITY_COLORS[act.type] ?? ''}`}>
                            {act.type}
                          </span>
                          <span className="font-medium">{act.subject}</span>
                        </div>
                        {act.notes && <p className="text-muted-foreground">{act.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  placeholder="CUST-001"
                  value={customerForm.code}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input
                  placeholder="INR"
                  value={customerForm.currency}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, currency: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input
                placeholder="e.g. Tech Solutions Ltd"
                value={customerForm.name}
                onChange={(e) => setCustomerForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Name</Label>
              <Input
                placeholder="e.g. Priya Sharma"
                value={customerForm.contactName}
                onChange={(e) => setCustomerForm((f) => ({ ...f, contactName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="customer@email.com"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Terms</Label>
                <Select
                  value={customerForm.paymentTerms}
                  onValueChange={(v) => setCustomerForm((f) => ({ ...f, paymentTerms: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                    <SelectItem value="NET15">Net 15</SelectItem>
                    <SelectItem value="NET30">Net 30</SelectItem>
                    <SelectItem value="NET60">Net 60</SelectItem>
                    <SelectItem value="NET90">Net 90</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Credit Limit (₹)</Label>
                <Input
                  type="number"
                  placeholder="100000"
                  value={customerForm.creditLimit}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, creditLimit: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                rows={2}
                value={customerForm.notes}
                onChange={(e) => setCustomerForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createCustomerMutation.mutate({
                  ...customerForm,
                  creditLimit: customerForm.creditLimit ? Number(customerForm.creditLimit) : undefined,
                })
              }
              disabled={createCustomerMutation.isPending || !customerForm.name || !customerForm.code}
            >
              {createCustomerMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Activity Dialog */}
      <Dialog open={showLogActivity} onOpenChange={setShowLogActivity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Activity — {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={activityForm.type}
                onValueChange={(v) => setActivityForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">Call</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                  <SelectItem value="NOTE">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                placeholder="e.g. Follow-up call on proposal"
                value={activityForm.subject}
                onChange={(e) => setActivityForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                placeholder="Details about the activity..."
                value={activityForm.notes}
                onChange={(e) => setActivityForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <Input
                placeholder="e.g. Customer agreed to demo"
                value={activityForm.outcome}
                onChange={(e) => setActivityForm((f) => ({ ...f, outcome: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogActivity(false)}>Cancel</Button>
            <Button
              onClick={() => logActivityMutation.mutate(activityForm)}
              disabled={logActivityMutation.isPending || !activityForm.subject}
            >
              {logActivityMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Log Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
