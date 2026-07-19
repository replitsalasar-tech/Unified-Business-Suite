import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Plus, Loader2, X } from 'lucide-react';
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

type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: { id: string; name: string };
  status: string;
  paymentStatus: string;
  totalAmount: number | string;
  createdAt: string;
  items?: OrderItem[];
  notes?: string | null;
  shippingAddress?: string | null;
};

type OrderItem = {
  id: string;
  productId: string;
  product?: { name: string; sku: string };
  quantity: number;
  unitPrice: number | string;
  discount: number | string;
  taxRate: number | string;
  subtotal: number | string;
};

type Customer = { id: string; name: string; code: string };
type Product = { id: string; name: string; sku: string; sellingPrice: number | string; taxRate: number | string };

const ORDER_STATUSES = ['ALL', 'DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-50 text-slate-700 border-slate-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
  PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200',
  SHIPPED: 'bg-purple-50 text-purple-700 border-purple-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PARTIAL: 'bg-blue-50 text-blue-700 border-blue-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
  REFUNDED: 'bg-slate-50 text-slate-700 border-slate-200',
};

const EMPTY_ORDER_ITEM = { productId: '', qty: '', unitPrice: '', discount: '0', taxRate: '18' };

export default function OrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [orderForm, setOrderForm] = useState({ customerId: '', notes: '', shippingAddress: '' });
  const [orderItems, setOrderItems] = useState([{ ...EMPTY_ORDER_ITEM }]);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['/api/v1/orders', activeTab],
    queryFn: () =>
      customFetch<{ data: Order[] }>(
        '/api/v1/orders' + (activeTab !== 'ALL' ? `?status=${activeTab}` : '')
      ),
  });

  const { data: orderDetailData } = useQuery({
    queryKey: ['/api/v1/orders', selectedOrder?.id, 'detail'],
    queryFn: () => customFetch<{ data: Order }>(`/api/v1/orders/${selectedOrder!.id}`),
    enabled: !!selectedOrder,
    select: (d: any) => d?.data ?? d,
  });

  const { data: customersData } = useQuery({
    queryKey: ['/api/v1/customers'],
    queryFn: () => customFetch<{ data: Customer[] }>('/api/v1/customers'),
  });

  const { data: productsData } = useQuery({
    queryKey: ['/api/v1/products'],
    queryFn: () => customFetch<{ data: Product[] }>('/api/v1/products'),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch('/api/v1/orders', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: 'Order created' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      setShowCreate(false);
      setOrderForm({ customerId: '', notes: '', shippingAddress: '' });
      setOrderItems([{ ...EMPTY_ORDER_ITEM }]);
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to create order', description: e?.message }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      customFetch(`/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      if (selectedOrder)
        queryClient.invalidateQueries({ queryKey: ['/api/v1/orders', selectedOrder.id, 'detail'] });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to update status', description: e?.message }),
  });

  const orders = ordersData?.data ?? [];
  const customers = customersData?.data ?? [];
  const products = productsData?.data ?? [];

  const totalOrders = orders.length;
  const pending = orders.filter((o) => o.status === 'DRAFT' || o.status === 'PROCESSING').length;
  const confirmed = orders.filter((o) => o.status === 'CONFIRMED').length;
  const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0);

  const addItem = () => setOrderItems((items) => [...items, { ...EMPTY_ORDER_ITEM }]);
  const removeItem = (i: number) => setOrderItems((items) => items.filter((_, idx) => idx !== i));

  const liveTotal = orderItems.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const tax = Number(item.taxRate) || 0;
    const base = qty * price * (1 - disc / 100);
    return sum + base * (1 + tax / 100);
  }, 0);

  const orderDetail = orderDetailData as Order | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage sales orders from draft to delivery.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create Order
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Orders</p>
          <p className="text-2xl font-bold mt-1">{totalOrders}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmed</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{confirmed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</p>
          <p className="text-2xl font-bold mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </Card>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {ORDER_STATUSES.map((tab) => (
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
        {/* Orders Table */}
        <div className="lg:col-span-2">
          <Card>
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No orders found.
              </div>
            ) : (
              <div className="overflow-auto rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order #</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Payment</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                          selectedOrder?.id === order.id ? 'bg-accent/30' : ''
                        }`}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                        <td className="px-4 py-3 font-medium">{order.customer?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[order.status] ?? ''}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PAYMENT_STATUS_COLORS[order.paymentStatus] ?? ''}`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), 'dd MMM yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Order Detail */}
        <div className="lg:col-span-1">
          {!selectedOrder ? (
            <Card className="h-full min-h-[300px] flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
              Select an order to view details
            </Card>
          ) : (
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="font-bold">{selectedOrder.orderNumber}</h3>
                <p className="text-xs text-muted-foreground">{selectedOrder.customer?.name}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[selectedOrder.status] ?? ''}`}>
                    {selectedOrder.status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PAYMENT_STATUS_COLORS[selectedOrder.paymentStatus] ?? ''}`}>
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}</p>
              </div>

              {/* Items */}
              {orderDetail?.items && orderDetail.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Items</h4>
                  <div className="space-y-1">
                    {orderDetail.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs p-2 border rounded">
                        <span>{item.product?.name ?? 'Product'}</span>
                        <span className="font-mono">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {selectedOrder.status === 'DRAFT' && (
                  <Button
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: 'CONFIRMED' })}
                    disabled={updateStatusMutation.isPending}
                  >
                    Confirm Order
                  </Button>
                )}
                {selectedOrder.status === 'CONFIRMED' && (
                  <Button
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: 'PROCESSING' })}
                    disabled={updateStatusMutation.isPending}
                  >
                    Mark Processing
                  </Button>
                )}
                {!['CANCELLED', 'DELIVERED'].includes(selectedOrder.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: 'CANCELLED' })}
                    disabled={updateStatusMutation.isPending}
                  >
                    Cancel Order
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create Order Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Sales Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select
                value={orderForm.customerId}
                onValueChange={(v) => setOrderForm((f) => ({ ...f, customerId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Order Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-3 h-3 mr-1" /> Add Row
                </Button>
              </div>
              <div className="space-y-2">
                {orderItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_60px_80px_60px_60px_32px] gap-1 items-end">
                    <Select
                      value={item.productId}
                      onValueChange={(v) => {
                        const prod = products.find((p) => p.id === v);
                        setOrderItems((items) =>
                          items.map((it, idx) =>
                            idx === i
                              ? { ...it, productId: v, unitPrice: String(prod?.sellingPrice ?? ''), taxRate: String(prod?.taxRate ?? '18') }
                              : it
                          )
                        );
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input className="h-8 text-xs" placeholder="Qty" type="number" value={item.qty}
                      onChange={(e) => setOrderItems((items) => items.map((it, idx) => idx === i ? { ...it, qty: e.target.value } : it))} />
                    <Input className="h-8 text-xs" placeholder="Price" type="number" value={item.unitPrice}
                      onChange={(e) => setOrderItems((items) => items.map((it, idx) => idx === i ? { ...it, unitPrice: e.target.value } : it))} />
                    <Input className="h-8 text-xs" placeholder="Disc%" type="number" value={item.discount}
                      onChange={(e) => setOrderItems((items) => items.map((it, idx) => idx === i ? { ...it, discount: e.target.value } : it))} />
                    <Input className="h-8 text-xs" placeholder="Tax%" type="number" value={item.taxRate}
                      onChange={(e) => setOrderItems((items) => items.map((it, idx) => idx === i ? { ...it, taxRate: e.target.value } : it))} />
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0"
                      onClick={() => removeItem(i)} disabled={orderItems.length === 1}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <div className="text-right text-sm font-semibold pt-1 border-t">
                  Total: ₹{liveTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Shipping Address</Label>
              <Textarea
                placeholder="Shipping address..."
                rows={2}
                value={orderForm.shippingAddress}
                onChange={(e) => setOrderForm((f) => ({ ...f, shippingAddress: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Order notes..."
                rows={2}
                value={orderForm.notes}
                onChange={(e) => setOrderForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  ...orderForm,
                  items: orderItems
                    .filter((i) => i.productId && i.qty)
                    .map((i) => ({
                      productId: i.productId,
                      quantity: Number(i.qty),
                      unitPrice: Number(i.unitPrice),
                      discount: Number(i.discount),
                      taxRate: Number(i.taxRate),
                    })),
                })
              }
              disabled={createMutation.isPending || !orderForm.customerId}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
