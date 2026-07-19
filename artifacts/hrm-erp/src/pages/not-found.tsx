import { Building2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary mb-6">
        <Building2 className="w-6 h-6" />
      </div>
      <h1 className="text-6xl font-bold tracking-tighter mb-2">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md text-center mb-8">
        The page you are looking for doesn't exist or has been moved to a different location in the system.
      </p>
      <Link href="/dashboard" asChild>
        <Button>Return to Dashboard</Button>
      </Link>
    </div>
  );
}
