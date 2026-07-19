import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';

import { AuthProvider } from '@/lib/auth';
import { PrivateRoute } from '@/components/layout/private-route';

import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Employees from '@/pages/employees';
import NewEmployee from '@/pages/employees/new';
import EmployeeDetail from '@/pages/employees/detail';
import EmployeeEdit from '@/pages/employees/edit';
import Departments from '@/pages/departments';
import JobTitles from '@/pages/job-titles';
import Attendance from '@/pages/attendance';
import Leave from '@/pages/leave';
import Payroll from '@/pages/payroll';
import Performance from '@/pages/performance';
import Recruitment from '@/pages/recruitment';
import Settings from '@/pages/settings';
import NotFound from '@/pages/not-found';

// ERP Pages
import Products from '@/pages/products';
import Inventory from '@/pages/inventory';
import Suppliers from '@/pages/suppliers';
import Customers from '@/pages/customers';
import Orders from '@/pages/orders';
import Invoices from '@/pages/invoices';
import Shipments from '@/pages/shipments';
import Reports from '@/pages/reports';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard"><PrivateRoute component={Dashboard} /></Route>
      <Route path="/employees/new"><PrivateRoute component={NewEmployee} /></Route>
      <Route path="/employees/:id/edit"><PrivateRoute component={EmployeeEdit} /></Route>
      <Route path="/employees/:id"><PrivateRoute component={EmployeeDetail} /></Route>
      <Route path="/employees"><PrivateRoute component={Employees} /></Route>
      <Route path="/departments"><PrivateRoute component={Departments} /></Route>
      <Route path="/job-titles"><PrivateRoute component={JobTitles} /></Route>
      <Route path="/attendance"><PrivateRoute component={Attendance} /></Route>
      <Route path="/leave"><PrivateRoute component={Leave} /></Route>
      <Route path="/payroll"><PrivateRoute component={Payroll} /></Route>
      <Route path="/performance"><PrivateRoute component={Performance} /></Route>
      <Route path="/recruitment"><PrivateRoute component={Recruitment} /></Route>
      <Route path="/settings"><PrivateRoute component={Settings} /></Route>

      {/* ERP Routes */}
      <Route path="/products"><PrivateRoute component={Products} /></Route>
      <Route path="/inventory"><PrivateRoute component={Inventory} /></Route>
      <Route path="/suppliers"><PrivateRoute component={Suppliers} /></Route>
      <Route path="/customers"><PrivateRoute component={Customers} /></Route>
      <Route path="/orders"><PrivateRoute component={Orders} /></Route>
      <Route path="/invoices"><PrivateRoute component={Invoices} /></Route>
      <Route path="/shipments"><PrivateRoute component={Shipments} /></Route>
      <Route path="/reports"><PrivateRoute component={Reports} /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
