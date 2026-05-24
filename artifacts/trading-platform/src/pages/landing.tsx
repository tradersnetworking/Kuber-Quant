import { Link } from "wouter";
import logo from "@/assets/logo.png";
import { Cpu, Users, ArrowRightLeft, Shield, BarChart3, Globe, ChevronRight, TrendingUp, Award, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useListPlans, type InvestmentPlan } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  const { data: plans } = useListPlans();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-[#050A14] text-white flex flex-col font-sans selection:bg-amber-500/30">
      {/* Navigation */}
      <header className="border-b border-white/10 py-4 px-6 md:px-12 flex justify-between items-center bg-[#050A14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Kuber Quant" className="h-10 w-10 object-contain" />
          <div className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-600 bg-clip-text text-transparent tracking-tight">
            Kuber Quant
          </div>
        </div>
        <div className="hidden md:flex gap-8 items-center mr-8">
          <a href="#features" className="text-sm font-medium text-white/70 hover:text-amber-400 transition-colors">Features</a>
          <a href="#investments" className="text-sm font-medium text-white/70 hover:text-amber-400 transition-colors">Investments</a>
          <a href="#stats" className="text-sm font-medium text-white/70 hover:text-amber-400 transition-colors">Performance</a>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/login">
            <Button variant="ghost" className="text-white/70 hover:text-amber-400 hover:bg-white/5">
              Log In
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20 border-0">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full px-4 py-32 md:py-48 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0,transparent_70%)] pointer-events-none" />
          
          <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Badge variant="outline" className="border-amber-500/30 text-amber-500 px-4 py-1 rounded-full bg-amber-500/5 backdrop-blur-sm">
                Next-Generation Wealth Management
              </Badge>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl md:text-8xl font-extrabold tracking-tighter max-w-5xl leading-[1.05] mb-8"
            >
              Where Wealth <br />
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-600 bg-clip-text text-transparent">
                Multiplies.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl md:text-2xl text-white/60 max-w-2xl mb-12 font-light leading-relaxed"
            >
              Institutional-grade algorithmic trading and wealth management for the modern investor. Precision engineering for serious capital.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-6 w-full justify-center items-center"
            >
              <Link href="/register">
                <Button size="lg" className="h-14 px-10 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold text-lg rounded-full hover:scale-105 transition-all shadow-xl shadow-amber-500/25 border-0">
                  Join the Elite <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-14 px-10 border-white/10 bg-white/5 backdrop-blur-md text-white font-semibold text-lg rounded-full hover:bg-white/10 transition-all">
                  View Dashboard
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Stats Bar */}
        <section id="stats" className="w-full py-12 bg-white/5 backdrop-blur-md border-y border-white/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="flex flex-col items-center">
                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="text-3xl md:text-4xl font-bold text-amber-400 mb-1"
                >
                  ₹500Cr+
                </motion.div>
                <div className="text-xs text-white/40 font-medium uppercase tracking-[0.2em]">AUM Managed</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl md:text-4xl font-bold text-amber-400 mb-1">10,000+</div>
                <div className="text-xs text-white/40 font-medium uppercase tracking-[0.2em]">Global Investors</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl md:text-4xl font-bold text-amber-400 mb-1">36%</div>
                <div className="text-xs text-white/40 font-medium uppercase tracking-[0.2em]">Max Annual ROI</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl md:text-4xl font-bold text-amber-400 mb-1">99.9%</div>
                <div className="text-xs text-white/40 font-medium uppercase tracking-[0.2em]">Platform Uptime</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-32 px-6 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] -z-10" />
          
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">The Future of <span className="text-amber-500">Asset Management</span></h2>
              <p className="text-white/50 text-xl max-w-3xl mx-auto">Combining advanced technology with hedge-fund expertise to deliver consistent alpha in all market conditions.</p>
            </div>
            
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {[
                { icon: Cpu, title: "Algo Trading", desc: "Access premium, backtested algorithmic strategies executed with millisecond precision." },
                { icon: Users, title: "Copy Trading", desc: "Automatically mirror the trades of our top-performing fund managers in real-time." },
                { icon: Zap, title: "MT5 Integration", desc: "Seamlessly connect your MetaTrader 5 accounts for institutional-grade execution." },
                { icon: Shield, title: "KYC Security", desc: "Bank-grade identity verification and multi-signature security for your peace of mind." },
                { icon: ArrowRightLeft, title: "Crypto Payments", desc: "Instant deposits and withdrawals via BTC, ETH, and USDT with zero processing fees." },
                { icon: Award, title: "Expert Managers", desc: "Our desk consists of Wall Street veterans managing diversified risk-adjusted portfolios." }
              ].map((feature, idx) => (
                <motion.div key={idx} variants={itemVariants} className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-all group">
                  <div className="w-14 h-14 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-7 w-7 text-amber-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-white/50 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Investment Plans Preview */}
        <section id="investments" className="w-full py-32 px-6 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">Investment Plans</h2>
              <p className="text-white/50 text-xl max-w-3xl mx-auto">Select a strategy that aligns with your financial goals and risk tolerance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {plans ? plans.map((plan: InvestmentPlan) => (
                <motion.div 
                  key={plan.id}
                  whileHover={{ y: -10 }}
                  className="relative group"
                >
                  <Card className="bg-[#0A0F1A] border-white/10 overflow-hidden h-full flex flex-col group-hover:border-amber-500/50 transition-all duration-300">
                    <div className="h-2 w-full bg-gradient-to-r from-amber-400 to-yellow-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-8 flex flex-col flex-1">
                      <div className="mb-6">
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 mb-4">
                          {plan.category}
                        </Badge>
                        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                        <p className="text-white/40 text-sm line-clamp-2">{plan.description}</p>
                      </div>
                      
                      <div className="space-y-4 mb-8 flex-1">
                        <div className="flex justify-between items-end">
                          <span className="text-white/40 text-sm">Target ROI</span>
                          <span className="text-2xl font-bold text-amber-400">{plan.roiPercent}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/40 text-sm">Duration</span>
                          <span className="text-white font-medium">{plan.durationDays} Days</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/40 text-sm">Min. Deposit</span>
                          <span className="text-white font-medium">${plan.minAmount}</span>
                        </div>
                      </div>

                      <Link href="/register">
                        <Button className="w-full bg-white/5 hover:bg-amber-500 hover:text-black border border-white/10 group-hover:border-amber-500 transition-all">
                          Select Plan
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )) : (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-96 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
                ))
              )}
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="w-full py-24 border-t border-white/10 overflow-hidden">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-center text-white/30 text-sm font-semibold uppercase tracking-[0.3em] mb-12">Institutional Partners & Brokers</p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
              <div className="text-2xl font-black italic tracking-tighter">BINANCE</div>
              <div className="text-2xl font-black italic tracking-tighter">COINBASE</div>
              <div className="text-2xl font-black italic tracking-tighter">METATRADER</div>
              <div className="text-2xl font-black italic tracking-tighter">KRAKEN</div>
              <div className="text-2xl font-black italic tracking-tighter">REVOLUT</div>
            </div>
          </div>
        </section>
        
        {/* Final CTA Section */}
        <section className="w-full py-40 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tighter">Ready to multiply your <span className="text-amber-500">wealth?</span></h2>
            <p className="text-xl text-white/50 mb-12 max-w-2xl mx-auto">Join 10,000+ investors who trust Kuber Quant for their wealth management needs.</p>
            <Link href="/register">
              <Button size="lg" className="h-16 px-12 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold text-xl rounded-full hover:scale-105 transition-all shadow-2xl shadow-amber-500/30 border-0">
                Create Your Account Now
              </Button>
            </Link>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="w-full py-12 px-6 md:px-12 border-t border-white/10 bg-[#050A14] relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <img src={logo} alt="Kuber Quant" className="h-8 w-8 object-contain" />
              <div className="text-xl font-bold text-white tracking-tight">
                Kuber Quant
              </div>
            </div>
            <p className="text-white/40 max-w-sm mb-6 leading-relaxed">
              Premium hedge-fund management and algorithmic trading platform. We leverage cutting-edge technology to deliver superior returns for our clients.
            </p>
            <div className="flex gap-4">
              {/* Social icons placeholder */}
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-amber-500/20 transition-colors cursor-pointer">
                <Globe className="h-5 w-5 text-white/40" />
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-amber-500/20 transition-colors cursor-pointer">
                <TrendingUp className="h-5 w-5 text-white/40" />
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6">Platform</h4>
            <ul className="space-y-4 text-white/40">
              <li><Link href="/login" className="hover:text-amber-400 transition-colors">Dashboard</Link></li>
              <li><Link href="/register" className="hover:text-amber-400 transition-colors">Investments</Link></li>
              <li><Link href="/register" className="hover:text-amber-400 transition-colors">Algo Trading</Link></li>
              <li><Link href="/register" className="hover:text-amber-400 transition-colors">Copy Trading</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-white/40">
              <li><a href="#" className="hover:text-amber-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-amber-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-amber-400 transition-colors">Risk Disclosure</a></li>
              <li><a href="#" className="hover:text-amber-400 transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-white/30">
          <div>&copy; {new Date().getFullYear()} Kuber Quant. All rights reserved.</div>
          <div className="flex gap-8">
            <span>Powered by Institutional Grade Algorithms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

