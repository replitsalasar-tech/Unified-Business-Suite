import { useState } from 'react';
import { Plus, Search, Briefcase, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useListJobTitles, useCreateJobTitle, useUpdateJobTitle, useDeleteJobTitle } from '@workspace/api-client-react';
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

export default function JobTitles() {
  const { data, isLoading } = useListJobTitles();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMutation = useCreateJobTitle();
  const updateMutation = useUpdateJobTitle();
  const deleteMutation = useDeleteJobTitle();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState(1);

  const jobTitles = data || [];
  const filteredJobs = jobTitles.filter((j) =>
    j.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNewDialog = () => {
    setEditingJob(null);
    setTitle('');
    setLevel(1);
    setIsDialogOpen(true);
  };

  const openEditDialog = (job: any) => {
    setEditingJob(job);
    setTitle(job.title);
    setLevel(job.level);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingJob) {
        await updateMutation.mutateAsync({ 
          id: editingJob.id, 
          data: { title, level: Number(level) } 
        });
        toast({ title: 'Job title updated successfully' });
      } else {
        await createMutation.mutateAsync({ 
          data: { title, level: Number(level) } 
        });
        toast({ title: 'Job title created successfully' });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/v1/job-titles'] });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: err?.message || 'Failed to save job title' 
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job title?')) return;
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: 'Job title deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/job-titles'] });
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: err?.message || 'Failed to delete job title' 
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Titles</h1>
          <p className="text-muted-foreground text-sm">
            Manage roles and seniority levels across the company.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" /> Add Job Title
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingJob ? 'Edit Job Title' : 'Create Job Title'}</DialogTitle>
              <DialogDescription>
                {editingJob ? 'Update job title details below.' : 'Add a new job title to the organization.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Title</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="level" className="text-right">Level</Label>
                <Input id="level" type="number" min="1" max="10" value={level} onChange={e => setLevel(Number(e.target.value))} className="col-span-3" />
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
            placeholder="Search job titles..."
            className="pl-9 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      <div className="border rounded-md bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading job titles...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No job titles found.</div>
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-muted/50">
                <tr className="border-b transition-colors">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Job Title</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Seniority Level</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[80px]"></th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredJobs.sort((a: (typeof jobTitles)[number], b: (typeof jobTitles)[number]) => b.level - a.level).map((job) => (
                  <tr key={job.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div className="font-medium">{job.title}</div>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center">
                        Level {job.level}
                        <div className="flex ml-2 gap-0.5">
                          {Array.from({length: Math.min(job.level, 5)}).map((_, i) => (
                            <div key={i} className="w-1.5 h-3 bg-primary/40 rounded-sm"></div>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(job)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDelete(job.id)}>
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
