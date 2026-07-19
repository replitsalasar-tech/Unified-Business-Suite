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
import Departments from '@/pages/departments';
import JobTitles from '@/pages/job-titles';
import Attendance from '@/pages/attendance';
import Leave from '@/pages/leave';
import Settings from '@/pages/settings';
import NotFound from '@/pages/not-found';

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
      <Route path="/employees/:id"><PrivateRoute component={EmployeeDetail} /></Route>
      <Route path="/employees"><PrivateRoute component={Employees} /></Route>
      <Route path="/departments"><PrivateRoute component={Departments} /></Route>
      <Route path="/job-titles"><PrivateRoute component={JobTitles} /></Route>
      <Route path="/attendance"><PrivateRoute component={Attendance} /></Route>
      <Route path="/leave"><PrivateRoute component={Leave} /></Route>
      <Route path="/settings"><PrivateRoute component={Settings} /></Route>

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
