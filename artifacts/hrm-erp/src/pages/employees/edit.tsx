import { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import type { Department, JobTitle } from '@workspace/api-client-react';
import { useGetEmployee, useUpdateEmployee, useListDepartments, useListJobTitles } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const editSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  departmentId: z.string().min(1, 'Department is required'),
  jobTitleId: z.string().min(1, 'Job title is required'),
  employmentType: z.string().min(1, 'Employment type is required'),
  status: z.string().min(1, 'Status is required'),
  baseSalary: z.coerce.number().min(0, 'Salary must be positive'),
  probationEndDate: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

export default function EmployeeEdit() {
  const [, params] = useRoute('/employees/:id/edit');
  const [, setLocation] = useLocation();
  const employeeId = params?.id || '';
  const { toast } = useToast();

  const { data: employee, isLoading } = useGetEmployee(employeeId, {
    query: { enabled: !!employeeId },
  });
  const updateMutation = useUpdateEmployee();
  const { data: deptData } = useListDepartments();
  const { data: jobData } = useListJobTitles();

  const departments = deptData || [];
  const jobTitles = jobData || [];

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      gender: '',
      dateOfBirth: '',
      departmentId: '',
      jobTitleId: '',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      baseSalary: 0,
      probationEndDate: '',
    },
  });

  // Pre-populate form when employee data arrives
  useEffect(() => {
    if (employee) {
      form.reset({
        firstName: employee.firstName ?? '',
        lastName: employee.lastName ?? '',
        phone: employee.phone ?? '',
        gender: employee.gender ?? '',
        dateOfBirth: employee.dateOfBirth ?? '',
        departmentId: (employee as any).departmentId ?? employee.department?.id ?? '',
        jobTitleId: (employee as any).jobTitleId ?? employee.jobTitle?.id ?? '',
        employmentType: employee.employmentType ?? 'FULL_TIME',
        status: employee.status ?? 'ACTIVE',
        baseSalary: Number(employee.baseSalary) ?? 0,
        probationEndDate: employee.probationEndDate ?? '',
      });
    }
  }, [employee, form]);

  const onSubmit = async (data: EditFormValues) => {
    try {
      await updateMutation.mutateAsync({ id: employeeId, data });
      toast({ title: 'Employee updated successfully' });
      setLocation(`/employees/${employeeId}`);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to update employee',
        description: err?.message || 'Please check the form and try again',
      });
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading employee data...</div>;
  }

  if (!employee) {
    return <div className="p-8 text-center text-muted-foreground">Employee not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/employees/${employeeId}`} className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Employee</h1>
          <p className="text-muted-foreground text-sm">
            Update details for {employee.firstName} {employee.lastName}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Basic details about the employee</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl><Input placeholder="John" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl><Input placeholder="Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input placeholder="+91..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
                <CardDescription>Role, department, and compensation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="PROBATION">Probation</SelectItem>
                        <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="departmentId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept: Department) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="jobTitleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select job title" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {jobTitles.map((job: JobTitle) => (
                          <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="employmentType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                        <SelectItem value="CONTRACT">Contract</SelectItem>
                        <SelectItem value="INTERN">Intern</SelectItem>
                        <SelectItem value="CONSULTANT">Consultant</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="baseSalary" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Salary (Annual, INR)</FormLabel>
                    <FormControl><Input type="number" min="0" step="1000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setLocation(`/employees/${employeeId}`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
