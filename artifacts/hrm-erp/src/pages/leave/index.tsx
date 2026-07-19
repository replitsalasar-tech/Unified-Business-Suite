import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, CheckCircle, XCircle, Search, Clock } from 'lucide-react';
import { useListLeaves, useApproveLeave, useRejectLeave } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LeaveRequests() {
  const { data, isLoading } = useListLeaves();
  const approveMutation = useApproveLeave();
  const rejectMutation = useRejectLeave();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');

  const leaves = data?.data || [];
  
  const filteredLeaves = leaves.filter(leave => 
    leave.status === activeTab && 
    (leave.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await approveMutation.mutateAsync({ id, data: { note: 'Approved via dashboard' } });
        toast({ title: 'Leave approved successfully' });
      } else {
        await rejectMutation.mutateAsync({ id, data: { note: 'Rejected via dashboard' } });
        toast({ title: 'Leave rejected successfully' });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/v1/leaves'] });
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error processing request', 
        description: err?.message || 'Please try again' 
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Requests</h1>
          <p className="text-muted-foreground text-sm">
            Review and manage time-off applications.
          </p>
        </div>
      </div>

      <Card className="p-4 flex gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee name..."
            className="pl-9 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          <div className="border rounded-md bg-card">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading leave requests...</div>
            ) : filteredLeaves.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <Calendar className="w-12 h-12 text-muted mb-4" />
                <p>No {activeTab.toLowerCase()} leave requests found.</p>
              </div>
            ) : (
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b bg-muted/50">
                    <tr className="border-b transition-colors">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Employee</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Dates</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Days</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Reason</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[200px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {filteredLeaves.map((leave) => (
                      <tr key={leave.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle">
                          <div className="font-medium">{leave.employeeName}</div>
                          <div className="text-xs text-muted-foreground">{leave.departmentName || 'Unknown Dept'}</div>
                        </td>
                        <td className="p-4 align-middle">
                          <Badge variant="outline">{leave.leaveType}</Badge>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="text-xs">
                            {format(new Date(leave.startDate), 'MMM dd')} - {format(new Date(leave.endDate), 'MMM dd, yyyy')}
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {leave.totalDays}
                          </span>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="max-w-[200px] truncate text-xs" title={leave.reason}>
                            {leave.reason}
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right">
                          {leave.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleAction(leave.id, 'reject')}
                                disabled={rejectMutation.isPending}
                              >
                                <XCircle className="w-4 h-4 mr-1" /> Reject
                              </Button>
                              <Button 
                                size="sm" 
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleAction(leave.id, 'approve')}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" /> Approve
                              </Button>
                            </div>
                          ) : (
                            <Badge variant={leave.status === 'APPROVED' ? 'default' : 'destructive'}
                                   className={leave.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : ''}>
                              {leave.status}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
