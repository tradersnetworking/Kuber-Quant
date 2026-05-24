import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import logo from "@/assets/logo.png";

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-[#050A14] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#050A14]/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <img src={logo} alt="Kuber Quant" className="h-8 w-8 object-contain" />
            <span className="font-bold text-lg bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Kuber Quant
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-amber-400 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="border-b border-white/10 bg-gradient-to-b from-amber-500/5 to-transparent">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-6 w-6 text-amber-400" />
            <span className="text-sm text-amber-400 font-medium uppercase tracking-wider">Legal</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">{title}</h1>
          <p className="text-muted-foreground text-sm">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div
          className="prose-legal space-y-8"
          style={{
            ["--tw-prose-body" as string]: "rgb(161 161 170)",
            ["--tw-prose-headings" as string]: "rgb(255 255 255)",
          }}
        >
          {children}
        </div>

        {/* Footer Nav */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-6 text-sm text-muted-foreground">
          <Link href="/privacy-policy" className="hover:text-amber-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms-of-service" className="hover:text-amber-400 transition-colors">Terms of Service</Link>
          <Link href="/risk-disclosure" className="hover:text-amber-400 transition-colors">Risk Disclosure</Link>
          <Link href="/cookie-policy" className="hover:text-amber-400 transition-colors">Cookie Policy</Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">© 2026 Kuber Quant. All rights reserved.</p>
      </div>

      <style>{`
        .prose-legal section { margin-bottom: 2.5rem; }
        .prose-legal h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.875rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .prose-legal p { color: rgb(161 161 170); line-height: 1.75; margin-bottom: 0.875rem; }
        .prose-legal ul { list-style: disc; padding-left: 1.5rem; color: rgb(161 161 170); }
        .prose-legal ul li { margin-bottom: 0.4rem; line-height: 1.6; }
        .prose-legal strong { color: rgb(212 212 216); font-weight: 600; }
        .prose-legal table { color: rgb(161 161 170); }
        .prose-legal th { color: rgb(161 161 170); }
      `}</style>
    </div>
  );
}
