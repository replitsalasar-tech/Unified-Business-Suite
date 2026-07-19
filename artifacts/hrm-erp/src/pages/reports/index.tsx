import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { customFetch } from '@workspace/api-client-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type SalesSummary = {
  totalOrders: number;
  totalRevenue: number | string;
  avgOrderValue: number | string;
};

type TopCustomer = {
  customerId: string;
  customerName: string;
  totalOrders: number;
  totalRevenue: number | string;
};

type MonthlyRevenue = {
  month: string;
  revenue: number | string;
};

type Headcount = {
  departmentId: string;
  departmentName: string;
  count: number;
};

type DashboardKPI = {
  totalEmployees?: number;
  totalRevenue?: number | string;
  pendingOrders?: number;
  overdueInvoices?: number;
  lowStockItems?: number;
  totalCustomers?: number;
};

const TABS = ['ERP Reports', 'HR Reports', 'Executive Dashboard'];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('ERP Reports');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const dateParams = [dateFrom ? `from=${dateFrom}` : '', dateTo ? `to=${dateTo}` : '']
    .filter(Boolean)
    .join('&');

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['/api/v1/reports/erp/sales', dateFrom, dateTo],
    queryFn: () =>
      customFetch<{ data: SalesSummary }>(
        '/api/v1/reports/erp/sales' + (dateParams ? `?${dateParams}` : '')
      ),
    enabled: activeTab === 'ERP Reports',
  });

  const { data: topCustomersData } = useQuery({
    queryKey: ['/api/v1/reports/erp/customers', dateFrom, dateTo],
    queryFn: () =>
      customFetch<{ data: TopCustomer[] }>(
        '/api/v1/reports/erp/customers' + (dateParams ? `?${dateParams}` : '')
      ),
    enabled: activeTab === 'ERP Reports',
  });

  const { data: monthlyData } = useQuery({
    queryKey: ['/api/v1/reports/erp/monthly', dateFrom, dateTo],
    queryFn: () =>
      customFetch<{ data: MonthlyRevenue[] }>(
        '/api/v1/reports/erp/monthly' + (dateParams ? `?${dateParams}` : '')
      ),
    enabled: activeTab === 'ERP Reports',
  });

  const { data: headcountData, isLoading: hcLoading } = useQuery({
    queryKey: ['/api/v1/reports/hr/headcount'],
    queryFn: () => customFetch<{ data: Headcount[] }>('/api/v1/reports/hr/headcount'),
    enabled: activeTab === 'HR Reports',
  });

  const { data: dashboardData, isLoading: dashLoading } = useQuery({
    queryKey: ['/api/v1/reports/dashboard'],
    queryFn: () => customFetch<{ data: DashboardKPI }>('/api/v1/reports/dashboard'),
    enabled: activeTab === 'Executive Dashboard',
  });

  const sales: SalesSummary | null = (salesData as any)?.data ?? null;
  const topCustomers: TopCustomer[] = (topCustomersData as any)?.data ?? [];
  const monthly: MonthlyRevenue[] = (monthlyData as any)?.data ?? [];
  const headcount: Headcount[] = (headcountData as any)?.data ?? [];
  const kpi: DashboardKPI | null = (dashboardData as any)?.data ?? null;

  const maxRevenue = monthly.reduce((m, r) => Math.max(m, Number(r.revenue)), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Analytics and insights across ERP and HR operations.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ERP Reports Tab */}
      {activeTab === 'ERP Reports' && (
        <div className="space-y-6">
          {/* Date Range */}
          <Card className="p-4">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setDateFrom(''); setDateTo(''); }}
              >
                Clear
              </Button>
            </div>
          </Card>

          {/* Sales Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Orders</p>
              <p className="text-2xl font-bold mt-1">
                {salesLoading ? '—' : (sales?.totalOrders ?? 0)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</p>
              <p className="text-2xl font-bold mt-1">
                {salesLoading ? '—' : `₹${Number(sales?.totalRevenue ?? 0).toLocaleString('en-IN')}`}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Order Value</p>
              <p className="text-2xl font-bold mt-1">
                {salesLoading ? '—' : `₹${Number(sales?.avgOrderValue ?? 0).toLocaleString('en-IN')}`}
              </p>
            </Card>
          </div>

          {/* Monthly Revenue Chart */}
          {monthly.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4">Monthly Revenue</h3>
              <div className="flex items-end gap-2 h-32">
                {monthly.map((m) => {
                  const height = Math.max(4, (Number(m.revenue) / maxRevenue) * 100);
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/70 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`₹${Number(m.revenue).toLocaleString('en-IN')}`}
                      />
                      <span className="text-xs text-muted-foreground truncate w-full text-center">
                        {m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Top Customers */}
          <Card>
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold">Top Customers</h3>
            </div>
            {topCustomers.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No data available</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Orders</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topCustomers.map((c) => (
                      <tr key={c.customerId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{c.customerName}</td>
                        <td className="px-4 py-3 text-right">{c.totalOrders}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          ₹{Number(c.totalRevenue).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* HR Reports Tab */}
      {activeTab === 'HR Reports' && (
        <div className="space-y-6">
          <Card>
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold">Headcount by Department</h3>
            </div>
            {hcLoading ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Loading...</div>
            ) : headcount.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No data available</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Headcount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {headcount.map((d) => (
                      <tr key={d.departmentId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{d.departmentName}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant="secondary">{d.count}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/30">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-sm">Total</td>
                      <td className="px-4 py-3 text-right font-semibold text-sm">
                        {headcount.reduce((s, d) => s + d.count, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Executive Dashboard Tab */}
      {activeTab === 'Executive Dashboard' && (
        <div className="space-y-6">
          {dashLoading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">Loading...</div>
          ) : !kpi ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No dashboard data available
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {kpi.totalEmployees !== undefined && (
                <Card className="p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Employees</p>
                  <p className="text-2xl font-bold mt-1">{kpi.totalEmployees}</p>
                </Card>
              )}
              {kpi.totalRevenue !== undefined && (
                <Card className="p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                  <p className="text-2xl font-bold mt-1">₹{Number(kpi.totalRevenue).toLocaleString('en-IN')}</p>
                </Card>
              )}
              {kpi.totalCustomers !== undefined && (
                <Card className="p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Customers</p>
                  <p className="text-2xl font-bold mt-1">{kpi.totalCustomers}</p>
                </Card>
              )}
              {kpi.pendingOrders !== undefined && (
                <Card className="p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Orders</p>
                  <p className="text-2xl font-bold mt-1 text-amber-600">{kpi.pendingOrders}</p>
                </Card>
              )}
              {kpi.overdueInvoices !== undefined && (
                <Card className="p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue Invoices</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">{kpi.overdueInvoices}</p>
                </Card>
              )}
              {kpi.lowStockItems !== undefined && (
                <Card className="p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Low Stock Items</p>
                  <p className="text-2xl font-bold mt-1 text-amber-600">{kpi.lowStockItems}</p>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
