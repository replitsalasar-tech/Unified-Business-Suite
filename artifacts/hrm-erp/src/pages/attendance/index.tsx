import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { CheckCircle2, Clock, Search, Filter, Plus } from 'lucide-react';
import { useListAttendance, useLogAttendance, useListEmployees } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Attendance() {
  const { data, isLoading } = useListAttendance();
  const { data: empData } = useListEmployees();
  const logMutation = useLogAttendance();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState('PRESENT');
  const [checkIn, setCheckIn] = useState('09:00');
  const [checkOut, setCheckOut] = useState('17:00');

  const attendance = data?.data || [];
  const employees = empData?.data || [];

  const filteredLogs = attendance.filter(log => 
    (log.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    try {
      await logMutation.mutateAsync({ 
        data: { 
          employeeId,
          date,
          status,
          checkIn: status === 'PRESENT' ? checkIn : undefined,
          checkOut: status === 'PRESENT' ? checkOut : undefined,
          source: 'MANUAL'
        } 
      });
      toast({ title: 'Attendance logged successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/attendance'] });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: err?.message || 'Failed to log attendance' 
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Log</h1>
          <p className="text-muted-foreground text-sm">
            Monitor daily check-ins, check-outs, and overall attendance.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Log Attendance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Attendance</DialogTitle>
              <DialogDescription>
                Manually record attendance for an employee.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="HALF_DAY">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {status === 'PRESENT' && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Check In</Label>
                    <Input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Check Out</Label>
                    <Input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="col-span-3" />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={logMutation.isPending || !employeeId}>
                Save Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee name..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="w-full sm:w-auto">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </Card>

      <div className="border rounded-md bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading attendance records...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No attendance records found.</div>
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-muted/50">
                <tr className="border-b transition-colors">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Employee</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Check In</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Check Out</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Hours</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <div className="font-medium">{format(new Date(log.date), 'MMM dd, yyyy')}</div>
                    </td>
                    <td className="p-4 align-middle">
                      {log.employeeName || 'Unknown'}
                    </td>
                    <td className="p-4 align-middle">
                      <Badge variant={log.status === 'PRESENT' ? 'default' : log.status === 'ABSENT' ? 'destructive' : 'secondary'}
                             className={log.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : ''}>
                        {log.status === 'PRESENT' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {log.status}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle font-mono text-xs">{log.checkIn || '-'}</td>
                    <td className="p-4 align-middle font-mono text-xs">{log.checkOut || '-'}</td>
                    <td className="p-4 align-middle">
                      {log.hoursWorked ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {log.hoursWorked}h
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
