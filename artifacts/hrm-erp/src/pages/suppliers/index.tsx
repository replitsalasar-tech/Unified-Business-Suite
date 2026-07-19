import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Plus, Loader2, ChevronRight, X } from 'lucide-react';
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

type Supplier = {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  paymentTerms: string | null;
  currency: string;
  isActive: boolean;
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: string;
  totalAmount: number | string;
  expectedDate: string | null;
};

type Product = { id: string; name: string; sku: string };
type Warehouse = { id: string; name: string };

const EMPTY_SUPPLIER = {
  code: '',
  name: '',
  contactName: '',
  email: '',
  phone: '',
  paymentTerms: 'NET30',
  currency: 'INR',
  notes: '',
};

const EMPTY_PO = {
  supplierId: '',
  warehouseId: '',
  expectedDate: '',
  notes: '',
};

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-50 text-slate-700 border-slate-200',
  SENT: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-purple-50 text-purple-700 border-purple-200',
  RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

export default function SuppliersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);
  const [poForm, setPoForm] = useState(EMPTY_PO);
  const [poItems, setPoItems] = useState<{ productId: string; qty: string; unitCost: string }[]>([
    { productId: '', qty: '', unitCost: '' },
  ]);

  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ['/api/v1/suppliers'],
    queryFn: () => customFetch<{ data: Supplier[] }>('/api/v1/suppliers'),
  });

  const { data: supplierPOsData } = useQuery({
    queryKey: ['/api/v1/purchase-orders', selectedSupplier?.id],
    queryFn: () =>
      customFetch<{ data: PurchaseOrder[] }>(
        `/api/v1/purchase-orders?supplierId=${selectedSupplier!.id}`
      ),
    enabled: !!selectedSupplier,
  });

  const { data: productsData } = useQuery({
    queryKey: ['/api/v1/products'],
    queryFn: () => customFetch<{ data: Product[] }>('/api/v1/products'),
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['/api/v1/inventory/warehouses'],
    queryFn: () => customFetch<{ data: Warehouse[] }>('/api/v1/inventory/warehouses'),
  });

  const createSupplierMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch('/api/v1/suppliers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: 'Supplier created' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/suppliers'] });
      setShowCreate(false);
      setSupplierForm(EMPTY_SUPPLIER);
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to create supplier', description: e?.message }),
  });

  const createPOMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch('/api/v1/purchase-orders', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: 'Purchase order created' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/purchase-orders'] });
      setShowCreatePO(false);
      setPoForm(EMPTY_PO);
      setPoItems([{ productId: '', qty: '', unitCost: '' }]);
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to create PO', description: e?.message }),
  });

  const suppliers = suppliersData?.data ?? [];
  const supplierPOs = supplierPOsData?.data ?? [];
  const products = productsData?.data ?? [];
  const warehouses = warehousesData?.data ?? [];

  const addPoItem = () => setPoItems((items) => [...items, { productId: '', qty: '', unitCost: '' }]);
  const removePoItem = (i: number) => setPoItems((items) => items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage supplier relationships and purchase orders.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setPoForm((f) => ({ ...f, supplierId: selectedSupplier?.id ?? '' }));
              setShowCreatePO(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Create PO
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Supplier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suppliers Table */}
        <div className="lg:col-span-2">
          <Card>
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading...</div>
            ) : suppliers.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No suppliers yet.
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
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Terms</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {suppliers.map((supplier) => (
                      <tr
                        key={supplier.id}
                        className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                          selectedSupplier?.id === supplier.id ? 'bg-accent/30' : ''
                        }`}
                        onClick={() => setSelectedSupplier(supplier)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">{supplier.code}</td>
                        <td className="px-4 py-3 font-medium">{supplier.name}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{supplier.contactName ?? '—'}</td>
                        <td className="px-4 py-3 text-xs">{supplier.email ?? '—'}</td>
                        <td className="px-4 py-3 text-xs">{supplier.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-xs">{supplier.paymentTerms ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                            {supplier.isActive ? 'Active' : 'Inactive'}
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

        {/* Supplier Detail / POs */}
        <div className="lg:col-span-1">
          {!selectedSupplier ? (
            <Card className="h-full min-h-[300px] flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
              Select a supplier to view purchase orders
            </Card>
          ) : (
            <Card className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{selectedSupplier.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedSupplier.code}</p>
                  {selectedSupplier.contactName && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedSupplier.contactName}</p>
                  )}
                  {selectedSupplier.email && (
                    <p className="text-xs text-muted-foreground">{selectedSupplier.email}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPoForm((f) => ({ ...f, supplierId: selectedSupplier.id }));
                    setShowCreatePO(true);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" /> PO
                </Button>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Purchase Orders
                </h4>
                {supplierPOs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No purchase orders</p>
                ) : (
                  <div className="space-y-2">
                    {supplierPOs.map((po) => (
                      <div key={po.id} className="flex items-center justify-between p-2 rounded border text-xs">
                        <div>
                          <p className="font-medium">{po.poNumber}</p>
                          <p className="text-muted-foreground">
                            ₹{Number(po.totalAmount).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full border font-medium ${PO_STATUS_COLORS[po.status] ?? ''}`}>
                          {po.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add Supplier Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code <span className="text-muted-foreground text-xs">(auto-hint: SUP-001)</span></Label>
                <Input
                  placeholder="SUP-001"
                  value={supplierForm.code}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input
                  placeholder="INR"
                  value={supplierForm.currency}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, currency: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input
                placeholder="e.g. Acme Supplies Pvt Ltd"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Name</Label>
              <Input
                placeholder="e.g. Rajan Mehta"
                value={supplierForm.contactName}
                onChange={(e) => setSupplierForm((f) => ({ ...f, contactName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="supplier@email.com"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms</Label>
              <Select
                value={supplierForm.paymentTerms}
                onValueChange={(v) => setSupplierForm((f) => ({ ...f, paymentTerms: v }))}
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
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                rows={2}
                value={supplierForm.notes}
                onChange={(e) => setSupplierForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createSupplierMutation.mutate(supplierForm)}
              disabled={createSupplierMutation.isPending || !supplierForm.name || !supplierForm.code}
            >
              {createSupplierMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create PO Dialog */}
      <Dialog open={showCreatePO} onOpenChange={setShowCreatePO}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select
                  value={poForm.supplierId}
                  onValueChange={(v) => setPoForm((f) => ({ ...f, supplierId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Warehouse</Label>
                <Select
                  value={poForm.warehouseId}
                  onValueChange={(v) => setPoForm((f) => ({ ...f, warehouseId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expected Date</Label>
              <Input
                type="date"
                value={poForm.expectedDate}
                onChange={(e) => setPoForm((f) => ({ ...f, expectedDate: e.target.value }))}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addPoItem}>
                  <Plus className="w-3 h-3 mr-1" /> Add Row
                </Button>
              </div>
              <div className="space-y-2">
                {poItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
                    <div>
                      <Select
                        value={item.productId}
                        onValueChange={(v) =>
                          setPoItems((items) => items.map((it, idx) => idx === i ? { ...it, productId: v } : it))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Product" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Qty"
                      type="number"
                      value={item.qty}
                      onChange={(e) =>
                        setPoItems((items) => items.map((it, idx) => idx === i ? { ...it, qty: e.target.value } : it))
                      }
                    />
                    <Input
                      className="h-8 text-xs"
                      placeholder="Unit Cost"
                      type="number"
                      value={item.unitCost}
                      onChange={(e) =>
                        setPoItems((items) => items.map((it, idx) => idx === i ? { ...it, unitCost: e.target.value } : it))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => removePoItem(i)}
                      disabled={poItems.length === 1}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Notes..."
                rows={2}
                value={poForm.notes}
                onChange={(e) => setPoForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePO(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createPOMutation.mutate({
                  ...poForm,
                  items: poItems
                    .filter((i) => i.productId && i.qty)
                    .map((i) => ({
                      productId: i.productId,
                      quantity: Number(i.qty),
                      unitCost: Number(i.unitCost),
                    })),
                })
              }
              disabled={createPOMutation.isPending || !poForm.supplierId || !poForm.warehouseId}
            >
              {createPOMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
