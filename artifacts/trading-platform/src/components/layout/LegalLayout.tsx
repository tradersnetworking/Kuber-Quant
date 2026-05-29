import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border dark:border-white/10 bg-background/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 min-w-0">
          <BrandMark href="/" titleSize="md" className="shrink-0 min-w-0" />
          <Link href="/" className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">Back to Home</span>
            <span className="xs:hidden">Home</span>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="border-b border-border dark:border-white/10 bg-gradient-to-b from-amber-500/5 to-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Legal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 break-words text-foreground">{title}</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-w-0 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="prose-legal space-y-6 sm:space-y-8 max-w-none break-words">
          {children}
        </div>

        {/* Footer Nav */}
        <div className="mt-16 pt-8 border-t border-border dark:border-white/10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
          <Link href="/privacy-policy" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms-of-service" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Terms of Service</Link>
          <Link href="/risk-disclosure" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Risk Disclosure</Link>
          <Link href="/cookie-policy" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Cookie Policy</Link>
          <Link href="/aml-policy" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">AML & KYC Policy</Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">© 2026 Kuber Quant. All rights reserved.</p>
      </div>

      <style>{`
        .prose-legal section { margin-bottom: 2.5rem; }
        .prose-legal h2 {
          font-size: 1.125rem;
          font-weight: 700;
          color: hsl(var(--foreground));
          margin-bottom: 0.875rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid hsl(var(--border));
        }
        .prose-legal h3 {
          font-size: 1rem;
          font-weight: 600;
          color: hsl(var(--foreground));
        }
        @media (min-width: 640px) {
          .prose-legal h2 { font-size: 1.25rem; }
        }
        .prose-legal p { color: hsl(var(--muted-foreground)); line-height: 1.75; margin-bottom: 0.875rem; }
        .prose-legal ul { list-style: disc; padding-left: 1.5rem; color: hsl(var(--muted-foreground)); }
        .prose-legal ul li { margin-bottom: 0.4rem; line-height: 1.6; }
        .prose-legal strong { color: hsl(var(--foreground)); font-weight: 600; }
        .prose-legal table {
          display: block;
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          color: hsl(var(--muted-foreground));
        }
        .prose-legal th { color: hsl(var(--muted-foreground)); white-space: nowrap; }
        .prose-legal td { min-width: 8rem; }
      `}</style>
    </div>
  );
}
