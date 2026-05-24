import { useState } from "react";
import { useRegister } from "@workspace/api-client-react";
import logo from "@/assets/kuber-quant-logo.png";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [, setLocation] = useLocation();
  const registerMutation = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(
      { data: { email, password, fullName, ...({ referralCode: referralCode || undefined } as any) } },
      {
        onSuccess: () => {
          setLocation("/login");
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
              Join the elite circle of investors. Secure your financial future with Kuber Quant's institutional-grade trading infrastructure.
            </p>
          </div>
          
          <div className="space-y-4 mt-12">
            {[
              "Real-time Algo Trading",
              "Expert Copy Trading",
              "Multi-asset Support",
              "24/7 Premium Support"
            ].map((feature, i) => (
              <div key={i} className="flex items-center space-x-3 text-zinc-300">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-md shadow-2xl my-8">
          <CardHeader className="space-y-1 pt-8">
            <div className="flex justify-center mb-6 md:hidden">
              <div className="text-3xl font-bold text-amber-500 tracking-tight">Kuber Quant</div>
            </div>
            <CardTitle className="text-3xl font-bold text-center text-white">Create Account</CardTitle>
            <CardDescription className="text-center text-zinc-400">
              Start your journey with Kuber Quant today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {registerMutation.isError && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-400">
                  <AlertDescription>Failed to create account. Please try again.</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-zinc-300">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" title="At least 6 characters" className="text-zinc-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white/5 border-white/10 text-white focus:border-amber-500/50 focus:ring-amber-500/20 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-zinc-300">Referral Code (Optional)</Label>
                <Input
                  id="referralCode"
                  type="text"
                  placeholder="Enter referral code if any"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20 h-11 uppercase"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold text-lg shadow-lg shadow-amber-500/20 transition-all duration-300 mt-2"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pb-8">
            <div className="text-sm text-zinc-400 text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-amber-500 hover:text-amber-400 hover:underline font-semibold transition-colors">
                Sign In
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
