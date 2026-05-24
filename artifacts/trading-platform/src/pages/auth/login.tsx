import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import logo from "@/assets/kuber-quant-logo.png";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          login(data.token, data.user);
          setLocation("/dashboard");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#050A14] flex flex-col md:flex-row">
      {/* Left side: Brand Info */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#050A14] to-[#0a1528] items-center justify-center p-12 border-r border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-lg">
          <div className="mb-8">
            <div className="mb-6">
              <img src={logo} alt="Kuber Quant" className="h-20 w-20 object-contain" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
              Kuber <span className="text-amber-500">Quant</span>
            </h1>
            <p className="text-xl text-zinc-400 font-light leading-relaxed">
              "Precision. Profit. Performance." — Experience premium hedge-fund management and institutional-grade trading solutions.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mt-12">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-amber-500 font-bold text-2xl mb-1">36%</div>
              <div className="text-zinc-500 text-sm">Max ROI</div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-amber-500 font-bold text-2xl mb-1">99.9%</div>
              <div className="text-zinc-500 text-sm">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-6 md:hidden">
              <div className="text-3xl font-bold text-amber-500 tracking-tight">Kuber Quant</div>
            </div>
            <CardTitle className="text-3xl font-bold text-center text-white">Sign In</CardTitle>
            <CardDescription className="text-center text-zinc-400">
              Access your premium wealth dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {loginMutation.isError && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-400">
                  <AlertDescription>Invalid credentials. Please try again.</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20 h-12"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-zinc-300">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white focus:border-amber-500/50 focus:ring-amber-500/20 h-12"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold text-lg shadow-lg shadow-amber-500/20 transition-all duration-300"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-zinc-400 text-center">
              Don't have an account?{" "}
              <Link href="/register" className="text-amber-500 hover:text-amber-400 hover:underline font-semibold transition-colors">
                Register here
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
