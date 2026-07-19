import { useGetDashboardStats } from '@workspace/api-client-react';
import { Users, UserCheck, UserX, UserMinus, CalendarCheck, TrendingUp, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Overview of your company's workforce and daily operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Headcount</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeEmployees} active employees
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presentToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Attendance rate: {(stats.attendanceRateThisMonth * 100).toFixed(1)}% this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave Today</CardTitle>
            <UserMinus className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onLeaveToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.absentToday} absent without leave
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <CalendarCheck className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLeaveRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Leave requests waiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Department Breakdown</CardTitle>
            <CardDescription>
              Headcount and today's attendance across departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.departmentBreakdown?.map((dept) => (
                <div key={dept.departmentId} className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                    <Building className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{dept.departmentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {dept.presentToday} / {dept.employeeCount} present today
                    </p>
                  </div>
                  <div className="font-medium text-sm">
                    {dept.employeeCount > 0 ? Math.round((dept.presentToday / dept.employeeCount) * 100) : 0}%
                  </div>
                </div>
              ))}
              {(!stats.departmentBreakdown || stats.departmentBreakdown.length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-4">No department data available.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Leave Requests</CardTitle>
            <CardDescription>
              Latest applications from your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentLeaveRequests?.map((leave) => (
                <div key={leave.id} className="flex items-start justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{leave.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {leave.leaveType} • {format(new Date(leave.startDate), 'MMM dd')} - {format(new Date(leave.endDate), 'MMM dd')}
                    </p>
                  </div>
                  <div className="text-xs bg-muted px-2 py-1 rounded-md capitalize font-medium">
                    {leave.status.toLowerCase()}
                  </div>
                </div>
              ))}
              {(!stats.recentLeaveRequests || stats.recentLeaveRequests.length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-4">No recent leave requests.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
