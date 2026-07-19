import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, Plus, Loader2, AlertTriangle, Package } from 'lucide-react';
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

type Warehouse = { id: string; name: string; code: string };
type InventoryItem = {
  id: string;
  productId: string;
  warehouseId: string;
  product?: { id: string; name: string; sku: string; reorderLevel: number | null; sellingPrice: number | string };
  warehouse?: { id: string; name: string };
  quantityAvailable: number;
  quantityReserved: number;
  reorderLevel?: number | null;
};
type Product = { id: string; name: string; sku: string };

const EMPTY_ADJUST = {
  productId: '',
  warehouseId: '',
  quantity: '',
  type: 'ADJUSTMENT',
  notes: '',
};

function getStockStatus(item: InventoryItem) {
  const reorder = item.reorderLevel ?? item.product?.reorderLevel ?? 0;
  if (item.quantityAvailable <= 0) return 'OUT';
  if (reorder && item.quantityAvailable <= reorder) return 'LOW';
  return 'OK';
}

export default function InventoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'low'>('all');
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustForm, setAdjustForm] = useState(EMPTY_ADJUST);

  const { data: warehousesData } = useQuery({
    queryKey: ['/api/v1/inventory/warehouses'],
    queryFn: () => customFetch<{ data: Warehouse[] }>('/api/v1/inventory/warehouses'),
  });

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['/api/v1/inventory', selectedWarehouseId],
    queryFn: () =>
      customFetch<{ data: InventoryItem[] }>(
        '/api/v1/inventory' + (selectedWarehouseId ? `?warehouseId=${selectedWarehouseId}` : '')
      ),
  });

  const { data: productsData } = useQuery({
    queryKey: ['/api/v1/products'],
    queryFn: () => customFetch<{ data: Product[] }>('/api/v1/products'),
  });

  const adjustMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch('/api/v1/inventory/adjust', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: 'Stock adjusted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/inventory'] });
      setShowAdjust(false);
      setAdjustForm(EMPTY_ADJUST);
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to adjust stock', description: e?.message }),
  });

  const warehouses = warehousesData?.data ?? [];
  const allItems = inventoryData?.data ?? [];
  const products = productsData?.data ?? [];

  const items = activeTab === 'low'
    ? allItems.filter((i) => getStockStatus(i) === 'LOW' || getStockStatus(i) === 'OUT')
    : allItems;

  const totalStockValue = allItems.reduce((sum, item) => {
    const price = Number(item.product?.sellingPrice ?? 0);
    return sum + price * item.quantityAvailable;
  }, 0);
  const lowStockCount = allItems.filter((i) => getStockStatus(i) === 'LOW' || getStockStatus(i) === 'OUT').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor stock levels across warehouses and adjust inventory.
          </p>
        </div>
        <Button onClick={() => setShowAdjust(true)}>
          <Plus className="w-4 h-4 mr-2" /> Stock Adjust
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Products</p>
          <p className="text-2xl font-bold mt-1">{allItems.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Stock Value</p>
          <p className="text-2xl font-bold mt-1">₹{totalStockValue.toLocaleString('en-IN')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Low Stock Items</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{lowStockCount}</p>
        </Card>
      </div>

      {/* Warehouse Selector + Tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-56">
          <Select
            value={selectedWarehouseId}
            onValueChange={setSelectedWarehouseId}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Warehouses</SelectItem>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {(['all', 'low'] as const).map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={activeTab === tab ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'all' ? 'All Stock' : '⚠ Low Stock'}
            </Button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <Archive className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No inventory records found.
          </div>
        ) : (
          <div className="overflow-auto rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Warehouse</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Available</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reserved</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reorder Level</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{item.product?.name ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.product?.sku ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{item.warehouse?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{item.quantityAvailable}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.quantityReserved}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {item.reorderLevel ?? item.product?.reorderLevel ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={status === 'OK' ? 'default' : status === 'LOW' ? 'secondary' : 'destructive'}
                          className={
                            status === 'OK'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status === 'LOW'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Stock Adjust Dialog */}
      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select
                value={adjustForm.productId}
                onValueChange={(v) => setAdjustForm((f) => ({ ...f, productId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Warehouse</Label>
              <Select
                value={adjustForm.warehouseId}
                onValueChange={(v) => setAdjustForm((f) => ({ ...f, warehouseId: v }))}
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
                <Label>Quantity (negative for out)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50 or -10"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={adjustForm.type}
                  onValueChange={(v) => setAdjustForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PURCHASE">Purchase</SelectItem>
                    <SelectItem value="SALE">Sale</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    <SelectItem value="DAMAGE">Damage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Reason for adjustment..."
                rows={2}
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjust(false)}>Cancel</Button>
            <Button
              onClick={() =>
                adjustMutation.mutate({
                  ...adjustForm,
                  quantity: Number(adjustForm.quantity),
                })
              }
              disabled={adjustMutation.isPending || !adjustForm.productId || !adjustForm.warehouseId || !adjustForm.quantity}
            >
              {adjustMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
