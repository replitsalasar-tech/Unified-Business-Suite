import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Star, Plus, Send, Loader2, ChevronRight } from 'lucide-react';
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
import { useListEmployees } from '@workspace/api-client-react';

type ReviewCycle = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
};

type PerformanceReview = {
  id: string;
  cycleId: string;
  employeeId: string;
  reviewerId: string;
  rating: string | null;
  score: string | null;
  strengths: string | null;
  improvements: string | null;
  comments: string | null;
  submittedAt: string | null;
  createdAt: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode: string };
  reviewer?: { id: string; firstName: string; lastName: string };
  cycle?: { id: string; name: string; isActive: boolean };
};

const RATING_LABELS: Record<string, { label: string; color: string }> = {
  OUTSTANDING: { label: 'Outstanding', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  EXCEEDS_EXPECTATIONS: { label: 'Exceeds', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  MEETS_EXPECTATIONS: { label: 'Meets', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  BELOW_EXPECTATIONS: { label: 'Below', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  UNSATISFACTORY: { label: 'Unsatisfactory', color: 'bg-red-50 text-red-700 border-red-200' },
};

export default function PerformancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCycle, setSelectedCycle] = useState<ReviewCycle | null>(null);
  const [showCreateCycle, setShowCreateCycle] = useState(false);
  const [showCreateReview, setShowCreateReview] = useState(false);
  const [cycleForm, setCycleForm] = useState({ name: '', startDate: '', endDate: '' });
  const [reviewForm, setReviewForm] = useState({
    employeeId: '',
    reviewerId: '',
    rating: '',
    score: '',
    strengths: '',
    improvements: '',
    comments: '',
  });

  const { data: cyclesData, isLoading: cyclesLoading } = useQuery({
    queryKey: ['/api/v1/performance/cycles'],
    queryFn: () => customFetch<ReviewCycle[]>('/api/v1/performance/cycles'),
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['/api/v1/performance/reviews', selectedCycle?.id],
    queryFn: () =>
      customFetch<{ data: PerformanceReview[] }>(
        `/api/v1/performance/reviews?cycleId=${selectedCycle!.id}`
      ),
    enabled: !!selectedCycle,
  });

  const { data: employeesData } = useListEmployees({ limit: 200 });

  const createCycleMutation = useMutation({
    mutationFn: (body: typeof cycleForm) =>
      customFetch('/api/v1/performance/cycles', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: 'Review cycle created' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/performance/cycles'] });
      setShowCreateCycle(false);
      setCycleForm({ name: '', startDate: '', endDate: '' });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const createReviewMutation = useMutation({
    mutationFn: (body: object) =>
      customFetch('/api/v1/performance/reviews', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: 'Review created' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/performance/reviews', selectedCycle?.id] });
      setShowCreateReview(false);
      setReviewForm({ employeeId: '', reviewerId: '', rating: '', score: '', strengths: '', improvements: '', comments: '' });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const submitReviewMutation = useMutation({
    mutationFn: (reviewId: string) =>
      customFetch(`/api/v1/performance/reviews/${reviewId}/submit`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      toast({ title: 'Review submitted' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/performance/reviews', selectedCycle?.id] });
    },
    onError: (e: any) =>
      toast({ variant: 'destructive', title: 'Failed', description: e?.message }),
  });

  const cycles = Array.isArray(cyclesData) ? cyclesData : [];
  const reviews = reviewsData?.data ?? [];
  const employees = employeesData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Reviews</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage review cycles and employee performance evaluations.
          </p>
        </div>
        <Button onClick={() => setShowCreateCycle(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Cycle
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cycles List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Review Cycles
          </h2>
          {cyclesLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : cycles.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No review cycles yet.
            </Card>
          ) : (
            cycles.map((cycle) => (
              <Card
                key={cycle.id}
                className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                  selectedCycle?.id === cycle.id ? 'border-primary/40 bg-accent/30' : ''
                }`}
                onClick={() => setSelectedCycle(cycle)}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{cycle.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={cycle.isActive ? 'default' : 'secondary'} className="text-xs">
                      {cycle.isActive ? 'Active' : 'Closed'}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(cycle.startDate), 'dd MMM')} –{' '}
                  {format(new Date(cycle.endDate), 'dd MMM yyyy')}
                </p>
              </Card>
            ))
          )}
        </div>

        {/* Reviews Panel */}
        <div className="lg:col-span-2">
          {!selectedCycle ? (
            <Card className="h-full min-h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Select a review cycle to view evaluations
            </Card>
          ) : (
            <Card className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{selectedCycle.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedCycle.startDate), 'dd MMM')} –{' '}
                    {format(new Date(selectedCycle.endDate), 'dd MMM yyyy')}
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowCreateReview(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Review
                </Button>
              </div>

              {reviewsLoading ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
              ) : reviews.length === 0 ? (
                <div className="py-10 text-center border rounded-lg text-muted-foreground text-sm">
                  No reviews in this cycle yet. Click <strong>Add Review</strong> to start.
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-sm">
                            {review.employee?.firstName} {review.employee?.lastName}
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              {review.employee?.employeeCode}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Reviewer: {review.reviewer?.firstName} {review.reviewer?.lastName}
                          </p>
                          {review.score && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Score: <strong>{review.score}</strong>/100
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {review.rating && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                                RATING_LABELS[review.rating]?.color ?? ''
                              }`}
                            >
                              {RATING_LABELS[review.rating]?.label ?? review.rating}
                            </span>
                          )}
                          {review.submittedAt ? (
                            <Badge variant="secondary" className="text-xs">Submitted</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => submitReviewMutation.mutate(review.id)}
                              disabled={submitReviewMutation.isPending}
                            >
                              <Send className="w-3 h-3 mr-1" /> Submit
                            </Button>
                          )}
                        </div>
                      </div>
                      {(review.strengths || review.improvements) && (
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          {review.strengths && (
                            <div>
                              <p className="font-medium text-emerald-700 mb-1">Strengths</p>
                              <p className="text-muted-foreground">{review.strengths}</p>
                            </div>
                          )}
                          {review.improvements && (
                            <div>
                              <p className="font-medium text-amber-700 mb-1">Areas to Improve</p>
                              <p className="text-muted-foreground">{review.improvements}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Create Cycle Dialog */}
      <Dialog open={showCreateCycle} onOpenChange={setShowCreateCycle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Review Cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Cycle Name</Label>
              <Input
                placeholder="e.g. Q3 2025 Performance Review"
                value={cycleForm.name}
                onChange={(e) => setCycleForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={cycleForm.startDate}
                  onChange={(e) => setCycleForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={cycleForm.endDate}
                  onChange={(e) => setCycleForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCycle(false)}>Cancel</Button>
            <Button
              onClick={() => createCycleMutation.mutate(cycleForm)}
              disabled={createCycleMutation.isPending || !cycleForm.name}
            >
              {createCycleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Review Dialog */}
      <Dialog open={showCreateReview} onOpenChange={setShowCreateReview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Performance Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <Select
                  value={reviewForm.employeeId}
                  onValueChange={(v) => setReviewForm((f) => ({ ...f, employeeId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reviewer</Label>
                <Select
                  value={reviewForm.reviewerId}
                  onValueChange={(v) => setReviewForm((f) => ({ ...f, reviewerId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rating</Label>
                <Select
                  value={reviewForm.rating}
                  onValueChange={(v) => setReviewForm((f) => ({ ...f, rating: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RATING_LABELS).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Score (0–100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="e.g. 85"
                  value={reviewForm.score}
                  onChange={(e) => setReviewForm((f) => ({ ...f, score: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Strengths</Label>
              <Textarea
                placeholder="Key strengths demonstrated..."
                rows={2}
                value={reviewForm.strengths}
                onChange={(e) => setReviewForm((f) => ({ ...f, strengths: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Areas to Improve</Label>
              <Textarea
                placeholder="Development opportunities..."
                rows={2}
                value={reviewForm.improvements}
                onChange={(e) => setReviewForm((f) => ({ ...f, improvements: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Comments</Label>
              <Textarea
                placeholder="Overall comments..."
                rows={2}
                value={reviewForm.comments}
                onChange={(e) => setReviewForm((f) => ({ ...f, comments: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateReview(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createReviewMutation.mutate({
                  cycleId: selectedCycle!.id,
                  ...reviewForm,
                  score: reviewForm.score || undefined,
                  rating: reviewForm.rating || undefined,
                })
              }
              disabled={
                createReviewMutation.isPending ||
                !reviewForm.employeeId ||
                !reviewForm.reviewerId
              }
            >
              {createReviewMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
