import { useRoute } from 'wouter';
import { format } from 'date-fns';
import { ArrowLeft, User, Building, Mail, Phone, Calendar, IndianRupee, MapPin } from 'lucide-react';
import { useGetEmployee, useListAttendance, useListLeaves, getGetEmployeeQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EmployeeDetail() {
  const [, params] = useRoute('/employees/:id');
  const employeeId = params?.id || '';

  const { data: employee, isLoading: isLoadingEmp } = useGetEmployee(employeeId, {
    query: { enabled: !!employeeId, queryKey: getGetEmployeeQueryKey(employeeId) }
  });

  const { data: attendanceData } = useListAttendance(
    { employeeId, limit: 30 }
  );

  const { data: leaveData } = useListLeaves(
    { employeeId, limit: 10 }
  );

  if (isLoadingEmp) {
    return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;
  }

  if (!employee) {
    return <div className="p-8 text-center text-muted-foreground">Employee not found.</div>;
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const attendance = attendanceData?.data || [];
  const leaves = leaveData?.data || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/employees" className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Profile</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 border mb-4">
                <AvatarImage src={employee.photoUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {employee.firstName[0]}{employee.lastName[0]}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="text-xl font-bold">{employee.firstName} {employee.lastName}</h2>
              <p className="text-muted-foreground">{employee.jobTitle?.title}</p>
              
              <div className="mt-4 flex gap-2">
                <Badge variant={employee.status === 'ACTIVE' ? 'default' : 'secondary'}
                       className={employee.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : ''}>
                  {employee.status}
                </Badge>
                <Badge variant="outline">{employee.employmentType.replace('_', ' ')}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="text-sm break-all">{employee.email}</div>
              </div>
              {employee.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">{employee.phone}</div>
                </div>
              )}
              {employee.address?.city && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {employee.address.city}{employee.address.state ? `, ${employee.address.state}` : ''}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="leave">Leave History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Employment Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> Employee ID
                    </div>
                    <div className="font-medium font-mono">{employee.employeeCode}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Building className="w-3 h-3" /> Department
                    </div>
                    <div className="font-medium">{employee.department?.name || 'Unassigned'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Hire Date
                    </div>
                    <div className="font-medium">{format(new Date(employee.hireDate), 'MMMM dd, yyyy')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" /> Base Salary
                    </div>
                    <div className="font-medium">{formatCurrency(employee.baseSalary, employee.currency)} / year</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Manager</div>
                    <div className="font-medium">
                      {employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : 'None'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {employee.emergencyContact?.name && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Emergency Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-y-4 gap-x-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Name</div>
                      <div className="font-medium">{employee.emergencyContact.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Relation</div>
                      <div className="font-medium">{employee.emergencyContact.relation || 'Not specified'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Phone</div>
                      <div className="font-medium">{employee.emergencyContact.phone || 'Not specified'}</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="attendance" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendance.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">No attendance records found.</div>
                  ) : (
                    <div className="relative w-full overflow-auto">
                      <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Check In</th>
                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Check Out</th>
                            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Hours</th>
                          </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                          {attendance.map((record) => (
                            <tr key={record.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                              <td className="p-4 align-middle">{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                              <td className="p-4 align-middle">
                                <Badge variant={record.status === 'PRESENT' ? 'default' : record.status === 'ABSENT' ? 'destructive' : 'secondary'}
                                      className={record.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200' : ''}>
                                  {record.status}
                                </Badge>
                              </td>
                              <td className="p-4 align-middle font-mono text-xs">{record.checkIn || '-'}</td>
                              <td className="p-4 align-middle font-mono text-xs">{record.checkOut || '-'}</td>
                              <td className="p-4 align-middle">{record.hoursWorked ? `${record.hoursWorked}h` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="leave" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Leave History</CardTitle>
                </CardHeader>
                <CardContent>
                  {leaves.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">No leave requests found.</div>
                  ) : (
                    <div className="space-y-4">
                      {leaves.map((leave) => (
                        <div key={leave.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{leave.leaveType} Leave</span>
                              <Badge variant={
                                leave.status === 'APPROVED' ? 'default' : 
                                leave.status === 'REJECTED' ? 'destructive' : 
                                'secondary'
                              } className={leave.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : ''}>
                                {leave.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(leave.startDate), 'MMM dd, yyyy')} - {format(new Date(leave.endDate), 'MMM dd, yyyy')}
                              <span className="mx-2">•</span>
                              {leave.totalDays} day(s)
                            </div>
                            {leave.reason && (
                              <div className="text-sm mt-2 italic text-muted-foreground">"{leave.reason}"</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
