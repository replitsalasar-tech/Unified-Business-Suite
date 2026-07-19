import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package2, Plus, Loader2, Tag } from 'lucide-react';
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

type Category = {
  id: string;
  name: string;
  code: string;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
  unit: string;
  purchasePrice: number | string;
  sellingPrice: number | string;
  taxRate: number | string;
  reorderLevel: number | null;
  description: string | null;
  isActive: boolean;
  stockQty?: number;
};

const EMPTY_FORM = {
  sku: '',
  name: '',
  categoryId: '',
  unit: 'PIECE',
  purchasePrice: '',
  sellingPrice: '',
  taxRate: '',
  reorderLevel: '',
  description: '',
};

export default function ProductsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: categoriesData } = useQuery({
    queryKey: ['/api/v1/products/categories'],
    queryFn: () => customFetch<{ data: Category[] }>('/api/v1/products/categories'),
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['/api/v1/products', selectedCategoryId],
    queryFn: () =>
      customFetch<{ data: Product[] }>(
        '/api/v1/products' + (selectedCategoryId ? `?categoryId=${selectedCategoryId}` : '')
      ),
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['/api/v1/inventory'],
    queryFn: () => customFetch<{ data: any[] }>('/api/v1/inventory'),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch('/api/v1/products', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: 'Product created' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
      setShowCreate(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to create product', description: e?.message }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      customFetch(`/api/v1/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to update product', description: e?.message }),
  });

  const categories = categoriesData?.data ?? [];
  const products = productsData?.data ?? [];

  const inventoryMap: Record<string, number> = {};
  (inventoryData?.data ?? []).forEach((inv: any) => {
    if (inv.productId) {
      inventoryMap[inv.productId] = (inventoryMap[inv.productId] ?? 0) + Number(inv.quantityAvailable ?? 0);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your product catalog, pricing, and categories.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Categories
          </h2>
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedCategoryId === null
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-foreground'
            }`}
          >
            <Tag className="w-4 h-4" /> All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategoryId === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-foreground'
              }`}
            >
              <Tag className="w-4 h-4" /> {cat.name}
            </button>
          ))}
        </div>

        {/* Products Table */}
        <div className="lg:col-span-3">
          <Card>
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading...</div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                <Package2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No products found.
              </div>
            ) : (
              <div className="overflow-auto rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Purchase (₹)</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Selling (₹)</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stock</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tax %</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                        <td className="px-4 py-3 font-medium">{product.name}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {product.category?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs">{product.unit}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          ₹{Number(product.purchasePrice).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          ₹{Number(product.sellingPrice).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {inventoryMap[product.id] ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right">{Number(product.taxRate)}%</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() =>
                              toggleActiveMutation.mutate({ id: product.id, isActive: !product.isActive })
                            }
                            disabled={toggleActiveMutation.isPending}
                          >
                            <Badge variant={product.isActive ? 'default' : 'secondary'}>
                              {product.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input
                  placeholder="e.g. PROD-001"
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIECE">Piece</SelectItem>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="LITRE">Litre</SelectItem>
                    <SelectItem value="BOX">Box</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Product Name</Label>
              <Input
                placeholder="e.g. Premium Widget"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Purchase Price (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.purchasePrice}
                  onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Selling Price (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.sellingPrice}
                  onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  placeholder="18"
                  value={form.taxRate}
                  onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={form.reorderLevel}
                  onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Product description..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  ...form,
                  categoryId: form.categoryId || undefined,
                  purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
                  sellingPrice: form.sellingPrice ? Number(form.sellingPrice) : undefined,
                  taxRate: form.taxRate ? Number(form.taxRate) : 0,
                  reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
                })
              }
              disabled={createMutation.isPending || !form.sku || !form.name}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
