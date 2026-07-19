import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { customFetch } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type Shipment = {
  id: string;
  shipmentNumber: string;
  orderId: string;
  order?: { orderNumber: string };
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

type Order = { id: string; orderNumber: string };
type Warehouse = { id: string; name: string };
type Product = { id: string; name: string; sku: string };

const SHIPMENT_STATUSES = ['ALL', 'PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-50 text-slate-700 border-slate-200',
  DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_TRANSIT: 'bg-amber-50 text-amber-700 border-amber-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RETURNED: 'bg-red-50 text-red-700 border-red-200',
};

const EMPTY_SHIPMENT = { orderId: '', warehouseId: '', carrier: '', trackingNumber: '' };

export default function ShipmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [shipmentForm, setShipmentForm] = useState(EMPTY_SHIPMENT);
  const [shipItems, setShipItems] = useState([{ productId: '', qty: '' }]);

  const { data: shipmentsData, isLoading } = useQuery({
    queryKey: ['/api/v1/shipments', activeTab],
    queryFn: () =>
      customFetch<{ data: Shipment[] }>(
        '/api/v1/shipments' + (activeTab !== 'ALL' ? `?status=${activeTab}` : '')
      ),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['/api/v1/orders'],
    queryFn: () => customFetch<{ data: Order[] }>('/api/v1/orders'),
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['/api/v1/inventory/warehouses'],
    queryFn: () => customFetch<{ data: Warehouse[] }>('/api/v1/inventory/warehouses'),
  });

  const { data: productsData } = useQuery({
    queryKey: ['/api/v1/products'],
    queryFn: () => customFetch<{ data: Product[] }>('/api/v1/products'),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch('/api/v1/shipments', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: 'Shipment created' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/shipments'] });
      setShowCreate(false);
      setShipmentForm(EMPTY_SHIPMENT);
      setShipItems([{ productId: '', qty: '' }]);
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to create shipment', description: e?.message }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      customFetch(`/api/v1/shipments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/shipments'] });
      toast({ title: 'Shipment status updated' });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to update status', description: e?.message }),
  });

  const shipments = shipmentsData?.data ?? [];
  const orders = ordersData?.data ?? [];
  const warehouses = warehousesData?.data ?? [];
  const products = productsData?.data ?? [];

  const addShipItem = () => setShipItems((items) => [...items, { productId: '', qty: '' }]);
  const removeShipItem = (i: number) => setShipItems((items) => items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track shipments and manage delivery status.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create Shipment
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {SHIPMENT_STATUSES.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
          >
            {tab.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Shipments Table */}
      <Card>
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading...</div>
        ) : shipments.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No shipments found.
          </div>
        ) : (
          <div className="overflow-auto rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Shipment #</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order #</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Carrier</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tracking #</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Shipped At</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Delivered At</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{shipment.shipmentNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs">{shipment.order?.orderNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[shipment.status] ?? ''}`}>
                        {shipment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{shipment.carrier ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{shipment.trackingNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {shipment.shippedAt ? format(new Date(shipment.shippedAt), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {shipment.deliveredAt ? format(new Date(shipment.deliveredAt), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {shipment.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => updateStatusMutation.mutate({ id: shipment.id, status: 'DISPATCHED' })}
                            disabled={updateStatusMutation.isPending}
                          >
                            Dispatch
                          </Button>
                        )}
                        {(shipment.status === 'DISPATCHED' || shipment.status === 'IN_TRANSIT') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => updateStatusMutation.mutate({ id: shipment.id, status: 'DELIVERED' })}
                            disabled={updateStatusMutation.isPending}
                          >
                            Delivered
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Shipment Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Shipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Order</Label>
              <Select
                value={shipmentForm.orderId}
                onValueChange={(v) => setShipmentForm((f) => ({ ...f, orderId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.orderNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Warehouse</Label>
              <Select
                value={shipmentForm.warehouseId}
                onValueChange={(v) => setShipmentForm((f) => ({ ...f, warehouseId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Carrier</Label>
                <Input
                  placeholder="e.g. BlueDart"
                  value={shipmentForm.carrier}
                  onChange={(e) => setShipmentForm((f) => ({ ...f, carrier: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tracking Number</Label>
                <Input
                  placeholder="e.g. BD123456789"
                  value={shipmentForm.trackingNumber}
                  onChange={(e) => setShipmentForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addShipItem}>
                  <Plus className="w-3 h-3 mr-1" /> Add Row
                </Button>
              </div>
              <div className="space-y-2">
                {shipItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_32px] gap-2 items-end">
                    <Select
                      value={item.productId}
                      onValueChange={(v) =>
                        setShipItems((items) => items.map((it, idx) => idx === i ? { ...it, productId: v } : it))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Qty"
                      type="number"
                      value={item.qty}
                      onChange={(e) =>
                        setShipItems((items) => items.map((it, idx) => idx === i ? { ...it, qty: e.target.value } : it))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => removeShipItem(i)}
                      disabled={shipItems.length === 1}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  ...shipmentForm,
                  items: shipItems
                    .filter((i) => i.productId && i.qty)
                    .map((i) => ({ productId: i.productId, quantity: Number(i.qty) })),
                })
              }
              disabled={createMutation.isPending || !shipmentForm.orderId || !shipmentForm.warehouseId}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
