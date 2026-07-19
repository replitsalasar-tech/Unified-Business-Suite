import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Briefcase, Plus, Users, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
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
import { useListDepartments } from '@workspace/api-client-react';

type Job = {
  id: string;
  title: string;
  type: string;
  location: string | null;
  isPublished: boolean;
  closingDate: string | null;
  createdAt: string;
  department?: { id: string; name: string } | null;
  hiringManager?: { id: string; firstName: string; lastName: string } | null;
  applications?: Application[];
};

type Application = {
  id: string;
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  phone: string | null;
  status: string;
  stage: number;
  appliedAt: string;
  interviews?: any[];
};

const APP_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-slate-50 text-slate-700 border-slate-200',
  SCREENING: 'bg-blue-50 text-blue-700 border-blue-200',
  INTERVIEW: 'bg-purple-50 text-purple-700 border-purple-200',
  OFFER: 'bg-amber-50 text-amber-700 border-amber-200',
  HIRED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

const APP_STATUSES = ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

export default function RecruitmentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showAddApplication, setShowAddApplication] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    departmentId: '',
    description: '',
    requirements: '',
    type: 'FULL_TIME',
    location: '',
    salaryMin: '',
    salaryMax: '',
    isPublished: false,
    closingDate: '',
  });
  const [appForm, setAppForm] = useState({
    candidateName: '',
    candidateEmail: '',
    phone: '',
    coverLetter: '',
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/v1/recruitment/jobs'],
    queryFn: () => customFetch<{ data: Job[]; pagination: any }>('/api/v1/recruitment/jobs'),
  });

  const { data: jobDetail, isLoading: jobDetailLoading } = useQuery({
    queryKey: ['/api/v1/recruitment/jobs', selectedJob?.id],
    queryFn: () => customFetch<{ data: Job }>(`/api/v1/recruitment/jobs/${selectedJob!.id}`),
    enabled: !!selectedJob,
    select: (d: any) => d?.data ?? d,
  });

  const { data: deptData } = useListDepartments();

  const createJobMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch('/api/v1/recruitment/jobs', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (created: any) => {
      toast({ title: 'Job posting created' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/recruitment/jobs'] });
      setShowCreateJob(false);
      setJobForm({
        title: '', departmentId: '', description: '', requirements: '',
        type: 'FULL_TIME', location: '', salaryMin: '', salaryMax: '',
        isPublished: false, closingDate: '',
      });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to create job', description: e?.message }),
  });

  const addApplicationMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch(`/api/v1/recruitment/jobs/${selectedJob!.id}/applications`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast({ title: 'Application added' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/recruitment/jobs', selectedJob?.id] });
      setShowAddApplication(false);
      setAppForm({ candidateName: '', candidateEmail: '', phone: '', coverLetter: '' });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: string }) =>
      customFetch(`/api/v1/recruitment/applications/${appId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/recruitment/jobs', selectedJob?.id] });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed to update status', description: e?.message }),
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ jobId, isPublished }: { jobId: string; isPublished: boolean }) =>
      customFetch(`/api/v1/recruitment/jobs/${jobId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/recruitment/jobs'] });
      if (selectedJob)
        queryClient.invalidateQueries({ queryKey: ['/api/v1/recruitment/jobs', selectedJob.id] });
    },
  });

  const jobs = jobsData?.data ?? [];
  const departments = deptData ?? [];
  const applications: Application[] = (jobDetail as any)?.applications ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recruitment</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Post job openings, track candidates, and manage the hiring pipeline.
          </p>
        </div>
        <Button onClick={() => setShowCreateJob(true)}>
          <Plus className="w-4 h-4 mr-2" /> Post Job
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Job Postings
          </h2>
          {jobsLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : jobs.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No job postings yet.
            </Card>
          ) : (
            jobs.map((job) => (
              <Card
                key={job.id}
                className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                  selectedJob?.id === job.id ? 'border-primary/40 bg-accent/30' : ''
                }`}
                onClick={() => setSelectedJob(job)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {job.department?.name ?? 'No department'} · {job.type.replace('_', ' ')}
                    </p>
                    {job.location && (
                      <p className="text-xs text-muted-foreground">{job.location}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Badge
                      variant={job.isPublished ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {job.isPublished ? 'Live' : 'Draft'}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                {job.closingDate && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Closes: {format(new Date(job.closingDate), 'dd MMM yyyy')}
                  </p>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Job Detail & Applications */}
        <div className="lg:col-span-2">
          {!selectedJob ? (
            <Card className="h-full min-h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Select a job posting to view applications
            </Card>
          ) : (
            <Card className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">{selectedJob.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedJob.department?.name} · {selectedJob.type.replace('_', ' ')}
                    {selectedJob.location && ` · ${selectedJob.location}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      togglePublishMutation.mutate({
                        jobId: selectedJob.id,
                        isPublished: !selectedJob.isPublished,
                      })
                    }
                    disabled={togglePublishMutation.isPending}
                  >
                    {selectedJob.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button size="sm" onClick={() => setShowAddApplication(true)}>
                    <Users className="w-4 h-4 mr-2" /> Add Applicant
                  </Button>
                </div>
              </div>

              {/* Pipeline Stats */}
              <div className="flex gap-2 flex-wrap">
                {APP_STATUSES.map((s) => {
                  const cnt = applications.filter((a) => a.status === s).length;
                  return (
                    <div
                      key={s}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border font-medium ${APP_STATUS_COLORS[s]}`}
                    >
                      {s} <span className="font-bold">{cnt}</span>
                    </div>
                  );
                })}
              </div>

              {/* Applications Table */}
              {jobDetailLoading ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
              ) : applications.length === 0 ? (
                <div className="py-10 text-center border rounded-lg text-muted-foreground text-sm">
                  No applications yet. Click <strong>Add Applicant</strong> to add one.
                </div>
              ) : (
                <div className="overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Candidate</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Applied</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Move To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {applications.map((app) => (
                        <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium">{app.candidateName}</div>
                            <div className="text-xs text-muted-foreground">{app.candidateEmail}</div>
                            {app.phone && (
                              <div className="text-xs text-muted-foreground">{app.phone}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {format(new Date(app.appliedAt), 'dd MMM yyyy')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                                APP_STATUS_COLORS[app.status] ?? ''
                              }`}
                            >
                              {app.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={app.status}
                              onValueChange={(v) =>
                                updateStatusMutation.mutate({ appId: app.id, status: v })
                              }
                            >
                              <SelectTrigger className="h-7 text-xs w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {APP_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs">
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Create Job Dialog */}
      <Dialog open={showCreateJob} onOpenChange={setShowCreateJob}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post a Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input
                placeholder="e.g. Senior Software Engineer"
                value={jobForm.title}
                onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select
                  value={jobForm.departmentId}
                  onValueChange={(v) => setJobForm((f) => ({ ...f, departmentId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(departments) ? departments : []).map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={jobForm.type}
                  onValueChange={(v) => setJobForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="INTERN">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                placeholder="e.g. Bengaluru, Remote"
                value={jobForm.location}
                onChange={(e) => setJobForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Salary (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 800000"
                  value={jobForm.salaryMin}
                  onChange={(e) => setJobForm((f) => ({ ...f, salaryMin: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max Salary (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1500000"
                  value={jobForm.salaryMax}
                  onChange={(e) => setJobForm((f) => ({ ...f, salaryMax: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Closing Date</Label>
              <Input
                type="date"
                value={jobForm.closingDate}
                onChange={(e) => setJobForm((f) => ({ ...f, closingDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Job description and responsibilities..."
                rows={3}
                value={jobForm.description}
                onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Requirements</Label>
              <Textarea
                placeholder="Required skills and qualifications..."
                rows={3}
                value={jobForm.requirements}
                onChange={(e) => setJobForm((f) => ({ ...f, requirements: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateJob(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createJobMutation.mutate({
                  ...jobForm,
                  departmentId: jobForm.departmentId || undefined,
                  salaryMin: jobForm.salaryMin || undefined,
                  salaryMax: jobForm.salaryMax || undefined,
                  closingDate: jobForm.closingDate || undefined,
                })
              }
              disabled={
                createJobMutation.isPending || !jobForm.title || !jobForm.description || !jobForm.requirements
              }
            >
              {createJobMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Application Dialog */}
      <Dialog open={showAddApplication} onOpenChange={setShowAddApplication}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Applicant — {selectedJob?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="e.g. Priya Sharma"
                value={appForm.candidateName}
                onChange={(e) => setAppForm((f) => ({ ...f, candidateName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="candidate@email.com"
                value={appForm.candidateEmail}
                onChange={(e) => setAppForm((f) => ({ ...f, candidateEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                placeholder="+91 98765 43210"
                value={appForm.phone}
                onChange={(e) => setAppForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cover Letter / Notes</Label>
              <Textarea
                rows={3}
                placeholder="Brief introduction or notes..."
                value={appForm.coverLetter}
                onChange={(e) => setAppForm((f) => ({ ...f, coverLetter: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddApplication(false)}>Cancel</Button>
            <Button
              onClick={() => addApplicationMutation.mutate(appForm)}
              disabled={
                addApplicationMutation.isPending ||
                !appForm.candidateName ||
                !appForm.candidateEmail
              }
            >
              {addApplicationMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Add Applicant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
