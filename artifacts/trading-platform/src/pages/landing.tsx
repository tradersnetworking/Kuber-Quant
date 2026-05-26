import { Link } from "wouter";
import logo from "@/assets/logo.png";
import {
  Cpu, Users, ArrowRightLeft, Shield, BarChart3, Globe, ChevronRight, TrendingUp,
  Award, Zap, Bot, LineChart, Activity, Lock, Target, BarChart2, Layers,
  Twitter, Send, Youtube, Instagram, TrendingDown, Star, Clock, CheckCircle,
  DollarSign, Percent, Calendar, ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { useListPlans, type InvestmentPlan } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { getPostLoginPath, getRoleAwareHref } from "@/lib/nav-config";
import { BrandTitle } from "@/components/brand/BrandTitle";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { usePartnersSection } from "@/hooks/use-partners-section";
import { useCompanyAbout, type AboutCategory } from "@/hooks/use-company-about";

const ALGO_STRATEGIES = [
  {
    name: "Quantum Momentum",
    type: "Momentum",
    description: "AI-driven momentum strategy that captures trending moves across forex and indices with dynamic position sizing.",
    returnRate: "38.2%",
    winRate: "72%",
    maxDrawdown: "8.4%",
    trades: "1,240",
    color: "from-blue-500 to-cyan-400",
    iconColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    icon: Zap,
  },
  {
    name: "Alpha Arbitrage",
    type: "Arbitrage",
    description: "Cross-market arbitrage exploiting price inefficiencies between correlated instruments with microsecond execution.",
    returnRate: "24.6%",
    winRate: "84%",
    maxDrawdown: "3.2%",
    trades: "8,900",
    color: "from-emerald-500 to-green-400",
    iconColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    icon: ArrowRightLeft,
  },
  {
    name: "Neural Grid",
    type: "Grid Trading",
    description: "Deep learning grid system adapting to volatility regimes, capturing profits in ranging and trending markets.",
    returnRate: "31.8%",
    winRate: "68%",
    maxDrawdown: "11.5%",
    trades: "3,420",
    color: "from-purple-500 to-violet-400",
    iconColor: "text-purple-400",
    bgColor: "bg-purple-500/10",
    icon: Layers,
  },
  {
    name: "Sentinel Scalper",
    type: "Scalping",
    description: "High-frequency scalping bot executing hundreds of precision trades daily on major forex pairs with tight spreads.",
    returnRate: "42.1%",
    winRate: "65%",
    maxDrawdown: "14.2%",
    trades: "24,500",
    color: "from-amber-500 to-yellow-400",
    iconColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    icon: Activity,
  },
];

const EA_STRATEGIES = [
  {
    name: "FX Precision Pro",
    pair: "EURUSD / GBPUSD",
    description: "Battle-tested forex EA using multi-timeframe confluence analysis and smart money concepts for high-probability entries.",
    roi: "+28.4%",
    duration: "6 months",
    risk: "Low",
    riskColor: "text-emerald-400 bg-emerald-500/10",
    icon: Target,
    color: "from-emerald-500 to-teal-400",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    price: "$49/mo",
  },
  {
    name: "Gold Hunter EA",
    pair: "XAUUSD",
    description: "Specialised gold trading system capitalising on institutional order flow and safe-haven demand cycles.",
    roi: "+44.7%",
    duration: "6 months",
    risk: "Medium",
    riskColor: "text-amber-400 bg-amber-500/10",
    icon: Star,
    color: "from-amber-400 to-yellow-500",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    price: "$79/mo",
  },
  {
    name: "Crypto Matrix",
    pair: "BTCUSD / ETHUSD",
    description: "Crypto-native EA leveraging on-chain data signals and technical confluence to trade BTC and ETH with precision.",
    roi: "+67.2%",
    duration: "6 months",
    risk: "High",
    riskColor: "text-red-400 bg-red-500/10",
    icon: Bot,
    color: "from-blue-500 to-indigo-400",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    price: "$99/mo",
  },
  {
    name: "Index Titan",
    pair: "US30 / NAS100 / SPX500",
    description: "Indices-focused EA trading the world's top equity indices with volatility-adjusted position management.",
    roi: "+33.9%",
    duration: "6 months",
    risk: "Medium",
    riskColor: "text-amber-400 bg-amber-500/10",
    icon: BarChart2,
    color: "from-purple-500 to-pink-400",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    price: "$69/mo",
  },
];

const FEATURES = [
  { icon: Cpu, title: "Algo Trading", desc: "Access premium, backtested algorithmic strategies executed with millisecond precision.", color: "text-blue-400", bg: "bg-blue-500/10" },
  { icon: Users, title: "Copy Trading", desc: "Automatically mirror the trades of our top-performing fund managers in real-time.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: Zap, title: "MT5 Integration", desc: "Seamlessly connect your MetaTrader 5 accounts for institutional-grade execution.", color: "text-amber-400", bg: "bg-amber-500/10" },
  { icon: Shield, title: "KYC Security", desc: "Bank-grade identity verification and multi-signature security for your peace of mind.", color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: ArrowRightLeft, title: "Crypto Payments", desc: "Instant deposits and withdrawals via BTC, ETH, and USDT with zero processing fees.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { icon: Award, title: "Expert Managers", desc: "Our desk consists of Wall Street veterans managing diversified risk-adjusted portfolios.", color: "text-rose-400", bg: "bg-rose-500/10" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const { data: plans } = useListPlans();
  const { user } = useAuth();
  const branding = useSiteBranding();
  const partnersSection = usePartnersSection();
  const companyAbout = useCompanyAbout();
  const isLoggedIn = !!user;
  const role = (user?.role as string) || "user";
  const dashboardHref = isLoggedIn ? getPostLoginPath(role) : "/register";
  const appHref = (path: string) => (isLoggedIn ? getRoleAwareHref(role, path) : "/register");
  const logoSrc = branding.logoUrl || logo;

  return (
    <div className="min-h-screen bg-[#050A14] text-white flex flex-col font-sans selection:bg-amber-500/30">
      {/* Navigation */}
      <header className="border-b border-white/10 py-4 px-6 md:px-12 bg-[#050A14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Logo + site title — one line on all screen sizes */}
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoSrc} alt={branding.siteName} className="h-10 w-10 object-contain shrink-0" />
            <BrandTitle size="lg" className="truncate leading-tight" />
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex gap-8 items-center">
            <a href="#features" className="text-sm font-medium text-white/70 hover:text-amber-400 transition-colors">Features</a>
            <a href="#algo" className="text-sm font-medium text-white/70 hover:text-amber-400 transition-colors">Algo Trading</a>
            <a href="#ea" className="text-sm font-medium text-white/70 hover:text-amber-400 transition-colors">EA Strategies</a>
            <a href="#investments" className="text-sm font-medium text-white/70 hover:text-amber-400 transition-colors">Investments</a>
            {companyAbout.items.length > 0 && (
              <a href="#about" className="text-sm font-medium text-white/70 hover:text-amber-400 transition-colors">About</a>
            )}
          </div>

          {/* Auth buttons — full row below logo/title on mobile */}
          <div className="flex gap-3 items-center w-full md:w-auto">
            {isLoggedIn ? (
              <Link href={dashboardHref} className="w-full md:w-auto">
                <Button className="w-full md:w-auto bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20 border-0">
                  My Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="flex-1 md:flex-none">
                  <Button
                    variant="outline"
                    className="w-full md:w-auto border-amber-500/70 bg-amber-500/10 text-amber-400 hover:bg-amber-500/25 hover:text-amber-300 hover:border-amber-400 font-bold shadow-sm shadow-amber-500/10"
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/register" className="flex-1 md:flex-none">
                  <Button className="w-full md:w-auto bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20 border-0">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative w-full px-4 py-28 md:py-44 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1)_0,transparent_70%)] pointer-events-none" />
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] -z-10" />
          <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -z-10" />
          <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Badge variant="outline" className="border-amber-500/30 text-amber-500 px-4 py-1 rounded-full bg-amber-500/5 backdrop-blur-sm">
                Next-Generation Wealth Management
              </Badge>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-6xl md:text-8xl font-extrabold tracking-tighter max-w-5xl leading-[1.05] mb-8">
              Where Wealth <br />
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-600 bg-clip-text text-transparent">Multiplies.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-xl md:text-2xl text-white/60 max-w-2xl mb-12 font-light leading-relaxed">
              Institutional-grade algorithmic trading and wealth management for the modern investor. Precision engineering for serious capital.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
              {isLoggedIn ? (
                <Link href={dashboardHref}>
                  <Button size="lg" className="h-14 px-10 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold text-lg rounded-full hover:scale-105 transition-all shadow-xl shadow-amber-500/25 border-0">
                    Go to Dashboard <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="h-14 px-10 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold text-lg rounded-full hover:scale-105 transition-all shadow-xl shadow-amber-500/25 border-0">
                      Join the Elite <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="h-14 px-10 border-white/10 bg-white/5 backdrop-blur-md text-white font-semibold text-lg rounded-full hover:bg-white/10 transition-all">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </section>

        {/* Stats Bar */}
        <section id="stats" className="w-full py-12 bg-white/5 backdrop-blur-md border-y border-white/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { val: "₹500Cr+", label: "AUM Managed", color: "text-amber-400" },
                { val: "10,000+", label: "Global Investors", color: "text-emerald-400" },
                { val: "36%", label: "Max Annual ROI", color: "text-blue-400" },
                { val: "99.9%", label: "Platform Uptime", color: "text-purple-400" },
              ].map(({ val, label, color }) => (
                <div key={label} className="flex flex-col items-center">
                  <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                    className={`text-3xl md:text-4xl font-bold mb-1 ${color}`}>{val}</motion.div>
                  <div className="text-xs text-white/40 font-medium uppercase tracking-[0.2em]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="w-full py-28 px-6 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] -z-10" />
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-amber-500/20 text-amber-500 mb-4 bg-amber-500/5">Platform Features</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">The Future of <span className="text-amber-500">Asset Management</span></h2>
              <p className="text-white/50 text-lg max-w-2xl mx-auto">Combining advanced technology with hedge-fund expertise to deliver consistent alpha in all market conditions.</p>
            </div>
            <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURES.map((f, idx) => (
                <motion.div key={idx} variants={itemVariants}
                  className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-all group">
                  <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`h-6 w-6 ${f.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-white/50 leading-relaxed text-sm">{f.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Algo Trading Strategies */}
        <section id="algo" className="w-full py-28 px-6 bg-white/[0.02] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] -z-10" />
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-blue-500/20 text-blue-400 mb-4 bg-blue-500/5">Algorithmic Trading</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                Algo Trading <span className="text-blue-400">Strategies</span>
              </h2>
              <p className="text-white/50 text-lg max-w-2xl mx-auto">
                Fully automated, AI-powered strategies executing with institutional precision — 24/7, no emotion, pure logic.
              </p>
            </div>
            <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ALGO_STRATEGIES.map((strat, idx) => (
                <motion.div key={idx} variants={itemVariants} whileHover={{ y: -4 }} className="group">
                  <Card className="bg-[#080f1e] border-white/10 overflow-hidden h-full group-hover:border-white/20 transition-all duration-300">
                    <div className={`h-1 w-full bg-gradient-to-r ${strat.color}`} />
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-11 h-11 ${strat.bgColor} rounded-xl flex items-center justify-center shrink-0`}>
                          <strat.icon className={`h-5 w-5 ${strat.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-white">{strat.name}</h3>
                            <Badge className={`text-xs ${strat.bgColor} ${strat.iconColor} border-0`}>{strat.type}</Badge>
                          </div>
                          <p className="text-white/50 text-sm mt-1 leading-relaxed">{strat.description}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/5">
                        <div className="text-center">
                          <div className={`text-lg font-bold ${strat.iconColor}`}>{strat.returnRate}</div>
                          <div className="text-xs text-white/40 mt-0.5">Annual ROI</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-400">{strat.winRate}</div>
                          <div className="text-xs text-white/40 mt-0.5">Win Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-400">{strat.maxDrawdown}</div>
                          <div className="text-xs text-white/40 mt-0.5">Max DD</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">{strat.trades}</div>
                          <div className="text-xs text-white/40 mt-0.5">Trades</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
            <div className="text-center mt-10">
              <Link href={isLoggedIn ? appHref("/algo-trading") : "/register"}>
                <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                  {isLoggedIn ? "Explore All Strategies" : "Get Started"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* EA Strategies */}
        <section id="ea" className="w-full py-28 px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -z-10" />
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 mb-4 bg-emerald-500/5">Expert Advisors</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                EA <span className="text-emerald-400">Strategies</span>
              </h2>
              <p className="text-white/50 text-lg max-w-2xl mx-auto">
                Institutional-grade Expert Advisors for MetaTrader. Plug in, set up, and let the machine trade for you.
              </p>
            </div>
            <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {EA_STRATEGIES.map((ea, idx) => (
                <motion.div key={idx} variants={itemVariants} whileHover={{ y: -6 }} className="group">
                  <Card className="bg-[#080f1e] border-white/10 overflow-hidden h-full group-hover:border-white/20 transition-all duration-300 flex flex-col">
                    <div className={`h-1 w-full bg-gradient-to-r ${ea.color}`} />
                    <CardContent className="p-5 flex flex-col flex-1">
                      <div className={`w-10 h-10 ${ea.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                        <ea.icon className={`h-5 w-5 ${ea.iconColor}`} />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1">{ea.name}</h3>
                      <p className="text-xs text-white/40 mb-2 font-mono">{ea.pair}</p>
                      <p className="text-white/50 text-xs leading-relaxed mb-4 flex-1">{ea.description}</p>
                      <div className="space-y-2 pt-3 border-t border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-white/40">6-Month ROI</span>
                          <span className={`text-sm font-bold ${ea.iconColor}`}>{ea.roi}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-white/40">Risk Level</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ea.riskColor}`}>{ea.risk}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-white/40">From</span>
                          <span className="text-sm font-bold text-white">{ea.price}</span>
                        </div>
                      </div>
                      <Link href={isLoggedIn ? appHref("/ea-strategies") : "/register"}>
                        <Button size="sm" className={`w-full mt-4 bg-gradient-to-r ${ea.color} text-black font-bold text-xs h-8 border-0`}>
                          {isLoggedIn ? "Subscribe" : "Get Access"}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
            <div className="text-center mt-10">
              <Link href={isLoggedIn ? appHref("/ea-strategies") : "/register"}>
                <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  {isLoggedIn ? "Browse All EAs" : "Get Full Access"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Investment Plans */}
        <section id="investments" className="w-full py-28 px-6 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-amber-500/20 text-amber-500 mb-4 bg-amber-500/5">Wealth Plans</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Investment Plans</h2>
              <p className="text-white/50 text-lg max-w-2xl mx-auto">Select a strategy that aligns with your financial goals and risk tolerance.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {plans ? plans.map((plan: InvestmentPlan) => (
                <motion.div key={plan.id} whileHover={{ y: -8 }} className="relative group">
                  <Card className="bg-[#0A0F1A] border-white/10 overflow-hidden h-full flex flex-col group-hover:border-amber-500/50 transition-all duration-300">
                    <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-yellow-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6 flex flex-col flex-1">
                      <div className="mb-5">
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 mb-3 text-xs">{plan.category}</Badge>
                        <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                        <p className="text-white/40 text-xs line-clamp-2">{plan.description}</p>
                      </div>
                      <div className="space-y-3 mb-6 flex-1">
                        <div className="flex justify-between items-end">
                          <span className="text-white/40 text-xs">Target ROI</span>
                          <span className="text-2xl font-bold text-amber-400">{plan.roiPercent}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/40 text-xs">Duration</span>
                          <span className="text-white font-medium text-sm">{plan.durationDays} Days</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/40 text-xs">Min. Deposit</span>
                          <span className="text-white font-medium text-sm">${plan.minAmount}</span>
                        </div>
                      </div>
                      <Link href={isLoggedIn ? appHref("/plans") : "/register"}>
                        <Button className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold text-sm shadow-lg shadow-amber-500/20 transition-all border-0">
                          {isLoggedIn ? "Invest Now" : "Select Plan"}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )) : [1, 2, 3, 4].map(i => (
                <div key={i} className="h-80 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
              ))}
            </div>
          </div>
        </section>

        {/* About Kuber Quant */}
        {companyAbout.items.length > 0 && (
          <section id="about" className="w-full py-24 border-t border-white/10 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center max-w-3xl mx-auto mb-14">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                  {companyAbout.sectionTitle}
                </h2>
                <p className="text-white/50 leading-relaxed">{companyAbout.intro}</p>
              </div>

              {(Object.keys(companyAbout.categoryLabels) as AboutCategory[]).map(category => {
                const items = companyAbout.grouped[category] || [];
                if (!items.length) return null;
                return (
                  <div key={category} className="mb-12 last:mb-0">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/80 mb-5">
                      {companyAbout.categoryLabels[category]}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map(item => (
                        <Card key={item.id} className="bg-white/5 border-white/10 hover:border-amber-500/30 transition-colors">
                          <CardContent className="p-5 space-y-2">
                            <p className="font-semibold text-white">{item.title}</p>
                            {item.subtitle && <p className="text-sm text-white/50">{item.subtitle}</p>}
                            {item.description && <p className="text-xs text-white/40 leading-relaxed">{item.description}</p>}
                            <div className="pt-2 space-y-1 text-xs text-white/35">
                              {item.referenceNumber && (
                                <p><span className="text-white/25">Ref:</span> <span className="font-mono text-white/50">{item.referenceNumber}</span></p>
                              )}
                              {item.issuedBy && <p><span className="text-white/25">Issued by:</span> {item.issuedBy}</p>}
                              {(item.issuedDate || item.expiryDate) && (
                                <p>
                                  {item.issuedDate && <>Issued {item.issuedDate}</>}
                                  {item.issuedDate && item.expiryDate && " · "}
                                  {item.expiryDate && <>Expires {item.expiryDate}</>}
                                </p>
                              )}
                            </div>
                            {item.documentUrl && (
                              <a
                                href={item.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-2"
                              >
                                View document <ChevronRight className="h-3 w-3" />
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Partners */}
        <section className="w-full py-20 border-t border-white/10 overflow-hidden">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-center text-white/30 text-xs font-semibold uppercase tracking-[0.3em] mb-10">{partnersSection.title}</p>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
              {partnersSection.partners.map((partner) => (
                partner.websiteUrl ? (
                  <a
                    key={partner.id}
                    href={partner.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xl font-black italic tracking-tighter hover:text-amber-400 transition-colors"
                  >
                    {partner.logoUrl ? (
                      <img src={partner.logoUrl} alt={partner.name} className="h-8 object-contain" />
                    ) : (
                      partner.name
                    )}
                  </a>
                ) : (
                  <div key={partner.id} className="text-xl font-black italic tracking-tighter">
                    {partner.logoUrl ? (
                      <img src={partner.logoUrl} alt={partner.name} className="h-8 object-contain" />
                    ) : (
                      partner.name
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full py-36 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter">
              Ready to multiply your <span className="text-amber-500">wealth?</span>
            </h2>
            <p className="text-xl text-white/50 mb-10 max-w-2xl mx-auto">
              Join 10,000+ investors who trust Kuber Quant for their wealth management needs.
            </p>
            <Link href={isLoggedIn ? dashboardHref : "/register"}>
              <Button size="lg" className="h-16 px-12 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold text-xl rounded-full hover:scale-105 transition-all shadow-2xl shadow-amber-500/30 border-0">
                {isLoggedIn ? "Go to Dashboard" : "Create Your Account Now"}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-14 px-6 md:px-12 border-t border-white/10 bg-[#050A14] relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <img src={logo} alt="Kuber Quant" className="h-8 w-8 object-contain" />
              <div className="text-xl font-bold text-white tracking-tight">Kuber Quant</div>
            </div>
            <p className="text-white/40 max-w-sm mb-6 leading-relaxed text-sm">
              {companyAbout.footerDescription}
            </p>
            <div className="flex gap-3">
              {[
                { icon: Twitter, label: "Twitter" },
                { icon: Send, label: "Telegram" },
                { icon: Instagram, label: "Instagram" },
                { icon: Youtube, label: "YouTube" },
              ].map(({ icon: Icon, label }) => (
                <button key={label} aria-label={label}
                  className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-amber-500/20 hover:text-amber-400 transition-all text-white/40">
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
            <div className="mt-6 space-y-1">
              <p className="text-xs text-white/30">Email: <a href="mailto:support@kuberquant.com" className="hover:text-amber-400 transition-colors">support@kuberquant.com</a></p>
              <p className="text-xs text-white/30">Website: <a href="https://kuberquant.com" className="hover:text-amber-400 transition-colors">kuberquant.com</a></p>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-5 text-sm uppercase tracking-wider">Platform</h4>
            <ul className="space-y-3 text-white/40 text-sm">
              {isLoggedIn && <li><Link href={dashboardHref} className="hover:text-amber-400 transition-colors">Dashboard</Link></li>}
              <li><Link href={isLoggedIn ? appHref("/plans") : "/register"} className="hover:text-amber-400 transition-colors">Investments</Link></li>
              <li><Link href={isLoggedIn ? appHref("/algo-trading") : "/register"} className="hover:text-amber-400 transition-colors">Algo Trading</Link></li>
              <li><Link href={isLoggedIn ? appHref("/copy-trading") : "/register"} className="hover:text-amber-400 transition-colors">Copy Trading</Link></li>
              <li><Link href={isLoggedIn ? appHref("/ea-strategies") : "/register"} className="hover:text-amber-400 transition-colors">EA Strategies</Link></li>
              <li><Link href={isLoggedIn ? appHref("/mt5-accounts") : "/register"} className="hover:text-amber-400 transition-colors">Account Handling Services</Link></li>
              <li><Link href={isLoggedIn ? appHref("/wallet") : "/register"} className="hover:text-amber-400 transition-colors">Wallet & Payments</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-5 text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-3 text-white/40 text-sm">
              <li><a href="/privacy-policy" className="hover:text-amber-400 transition-colors">Privacy Policy</a></li>
              <li><a href="/terms-of-service" className="hover:text-amber-400 transition-colors">Terms of Service</a></li>
              <li><a href="/risk-disclosure" className="hover:text-amber-400 transition-colors">Risk Disclosure</a></li>
              <li><a href="/cookie-policy" className="hover:text-amber-400 transition-colors">Cookie Policy</a></li>
              <li><Link href={isLoggedIn ? appHref("/agreements") : "/register"} className="hover:text-amber-400 transition-colors">Legal Agreements</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/25">
          <div>&copy; {new Date().getFullYear()} Kuber Quant. All rights reserved. | kuberquant.com</div>
          <div className="flex gap-6">
            <span>Powered by Institutional Grade Algorithms</span>
            <span>|</span>
            <span>Regulated & Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
