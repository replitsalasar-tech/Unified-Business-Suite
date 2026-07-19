import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, Loader2 } from 'lucide-react';
import { useLoginUser } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const loginMutation = useLoginUser();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const res = await loginMutation.mutateAsync({ data });
      
      if (res.accessToken && res.refreshToken && res.user) {
        login(res.accessToken, res.refreshToken, res.user);
        toast({ title: 'Welcome back', description: 'You have successfully logged in.' });
        setLocation('/dashboard');
      } else if (res.requiresMfa) {
        toast({ title: 'MFA Required', description: 'Please enter your 2FA code (Not fully implemented in Phase 1 demo).' });
      }
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Login failed', 
        description: err?.message || 'Invalid credentials' 
      });
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Brand Panel */}
      <div className="hidden md:flex md:w-1/2 bg-sidebar text-sidebar-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-sidebar-primary flex items-center justify-center text-primary-foreground">
            <Building2 className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-sidebar-primary-foreground">HRM Platform</span>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Corporate Command Center
          </h1>
          <p className="text-sidebar-foreground/70 text-lg max-w-md">
            Manage your workforce, track attendance, and process leave requests in one unified platform built for Indian enterprises.
          </p>
        </div>
        
        <div className="text-sm text-sidebar-foreground/50">
          © {new Date().getFullYear()} HRM Platform. All rights reserved.
        </div>
      </div>

      {/* Login Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center md:text-left">
            <div className="md:hidden flex items-center justify-center gap-2 mb-6">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight">HRM Platform</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Sign in</h2>
            <p className="text-muted-foreground text-sm">Enter your credentials to access your account</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label>Email</Label>
                    <FormControl>
                      <Input placeholder="name@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <Label>Password</Label>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full font-medium" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Sign In
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>Demo Credentials:</p>
            <p className="mt-1">Admin: admin@example.com / Password123!</p>
            <p>Manager: manager@example.com / Password123!</p>
            <p>Employee: employee@example.com / Password123!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
