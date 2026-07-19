import { useState } from 'react';
import { Plus, Search, Building, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useListDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export default function Departments() {
  const { data, isLoading } = useListDepartments();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const departments = data || [];
  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.code ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNewDialog = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (dept: any) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingDept) {
        await updateMutation.mutateAsync({ 
          id: editingDept.id, 
          data: { name, code } 
        });
        toast({ title: 'Department updated successfully' });
      } else {
        await createMutation.mutateAsync({ 
          data: { name, code } 
        });
        toast({ title: 'Department created successfully' });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/v1/departments'] });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: err?.message || 'Failed to save department' 
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: 'Department deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/departments'] });
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: err?.message || 'Failed to delete department' 
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground text-sm">
            Manage company departments and their heads.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" /> Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
              <DialogDescription>
                {editingDept ? 'Update department details below.' : 'Add a new department to the organization.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">Code</Label>
                <Input id="code" value={code} onChange={e => setCode(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 flex gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
            className="pl-9 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      <div className="border rounded-md bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading departments...</div>
        ) : filteredDepts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No departments found.</div>
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-muted/50">
                <tr className="border-b transition-colors">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Department</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Code</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Headcount</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Head</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[80px]"></th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredDepts.map((dept: (typeof departments)[number]) => (
                  <tr key={dept.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                          <Building className="w-4 h-4" />
                        </div>
                        <div className="font-medium">{dept.name}</div>
                      </div>
                    </td>
                    <td className="p-4 align-middle font-mono text-xs">{dept.code}</td>
                    <td className="p-4 align-middle">
                      {dept.employeeCount || 0} employees
                    </td>
                    <td className="p-4 align-middle">
                      {dept.headName || <span className="text-muted-foreground italic">Not assigned</span>}
                    </td>
                    <td className="p-4 align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(dept)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDelete(dept.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
