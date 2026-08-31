import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/brand/BrandMark";
import { MobileTopBrandBar } from "@/components/layout/MobileTopBrandBar";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandTitle } from "@/components/brand/BrandTitle";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { usePartnersSection } from "@/hooks/use-partners-section";
import { useCompanyAbout, type AboutCategory } from "@/hooks/use-company-about";
import { useAuth } from "@/hooks/use-auth";
import { getPostLoginPath, getRoleAwareHref } from "@/lib/nav-config";
import {
  Cpu, Users, ArrowRightLeft, Shield, ChevronRight,
  Award, Zap, Bot, Activity, Target, BarChart2, Layers,
  Twitter, Send, Youtube, Instagram, Star, ArrowRight, Mail, Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useListPlans, type InvestmentPlan } from "@workspace/api-client-react";
import { useMemo } from "react";
import { fetchStakingPlans, type StakingPlan } from "@/lib/staking-api";
import { useServiceVisibility } from "@/hooks/use-service-visibility";
import { FALLBACK_INVESTMENT_PLANS, FALLBACK_STAKING_PLANS } from "@/lib/default-plans";
import { APP_CONTENT_WIDTH, LANDING_CONTENT } from "@/lib/ui-system";
import type { ServiceKey } from "@/lib/service-catalog";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { LandingTrustCtaSection } from "@/components/landing/LandingTrustCtaSection";
import { LandingPaymentMethodsSection } from "@/components/landing/LandingPaymentMethodsSection";
import { LandingPublicStatsSection } from "@/components/landing/LandingPublicStatsSection";
import { LandingMobileNav } from "@/components/landing/LandingMobileNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";

const ALGO_STRATEGIES = [
  {
    name: "Quantum Momentum",
    type: "Momentum",
    description: "AI-driven momentum strategy that captures trending moves across forex and indices with dynamic position sizing.",
    returnRate: "38.2%",
    winRate: "72%",
    maxDrawdown: "8.4%",
    trades: "1,240",
    minInvestment: "$500",
    risk: "Medium",
    riskColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    color: "from-blue-500 to-cyan-400",
    iconColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    statBg: "bg-blue-500/10 dark:bg-blue-500/5",
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
    minInvestment: "$250",
    risk: "Low",
    riskColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    color: "from-emerald-500 to-green-400",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    statBg: "bg-emerald-500/10 dark:bg-emerald-500/5",
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
    minInvestment: "$750",
    risk: "Medium",
    riskColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    color: "from-purple-500 to-violet-400",
    iconColor: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    statBg: "bg-purple-500/10 dark:bg-purple-500/5",
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
    minInvestment: "$1,000",
    risk: "High",
    riskColor: "text-red-600 dark:text-red-400 bg-red-500/10",
    color: "from-amber-500 to-yellow-400",
    iconColor: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    statBg: "bg-amber-500/10 dark:bg-amber-500/5",
    icon: Activity,
  },
];

const COPY_TRADERS = [
  {
    name: "Alex Mercer",
    specialty: "Gold & Indices",
    bio: "Gold and indices specialist with a 5-year verified track record on XAUUSD and US30.",
    totalRoi: "142.5%",
    monthlyRoi: "11.8%",
    winRate: "74.2%",
    followers: "384",
    minInvestment: "$500",
    risk: "Medium",
    riskColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    color: "from-emerald-500 to-teal-400",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    statBg: "bg-emerald-500/10 dark:bg-emerald-500/5",
  },
  {
    name: "Priya Nair",
    specialty: "Forex Swing",
    bio: "Forex swing trader focused on major pairs with disciplined risk management and steady monthly gains.",
    totalRoi: "98.3%",
    monthlyRoi: "8.4%",
    winRate: "69.5%",
    followers: "256",
    minInvestment: "$250",
    risk: "Low",
    riskColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    color: "from-blue-500 to-cyan-400",
    iconColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    statBg: "bg-blue-500/10 dark:bg-blue-500/5",
  },
  {
    name: "Marcus Chen",
    specialty: "Crypto & NAS100",
    bio: "High-frequency momentum trader on BTC, ETH, and NAS100 with aggressive but rules-based execution.",
    totalRoi: "210.7%",
    monthlyRoi: "15.2%",
    winRate: "61.8%",
    followers: "512",
    minInvestment: "$1,000",
    risk: "High",
    riskColor: "text-red-600 dark:text-red-400 bg-red-500/10",
    color: "from-purple-500 to-violet-400",
    iconColor: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    statBg: "bg-purple-500/10 dark:bg-purple-500/5",
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
    riskColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    icon: Target,
    color: "from-emerald-500 to-teal-400",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    price: "$49/mo",
  },
  {
    name: "Gold Hunter EA",
    pair: "XAUUSD",
    description: "Specialised gold trading system capitalising on institutional order flow and safe-haven demand cycles.",
    roi: "+44.7%",
    duration: "6 months",
    risk: "Medium",
    riskColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    icon: Star,
    color: "from-amber-400 to-yellow-500",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    price: "$79/mo",
  },
  {
    name: "Crypto Matrix",
    pair: "BTCUSD / ETHUSD",
    description: "Crypto-native EA leveraging on-chain data signals and technical confluence to trade BTC and ETH with precision.",
    roi: "+67.2%",
    duration: "6 months",
    risk: "High",
    riskColor: "text-red-600 dark:text-red-400 bg-red-500/10",
    icon: Bot,
    color: "from-blue-500 to-indigo-400",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    price: "$99/mo",
  },
  {
    name: "Index Titan",
    pair: "US30 / NAS100 / SPX500",
    description: "Indices-focused EA trading the world's top equity indices with volatility-adjusted position management.",
    roi: "+33.9%",
    duration: "6 months",
    risk: "Medium",
    riskColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    icon: BarChart2,
    color: "from-purple-500 to-pink-400",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-600 dark:text-purple-400",
    price: "$69/mo",
  },
];

const PLAN_CARD_THEMES = [
  { color: "from-emerald-500 to-teal-400", accent: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { color: "from-amber-400 to-yellow-500", accent: "text-amber-600 dark:text-amber-400", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { color: "from-blue-500 to-indigo-400", accent: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { color: "from-purple-500 to-pink-400", accent: "text-purple-600 dark:text-purple-400", badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { color: "from-cyan-500 to-sky-400", accent: "text-cyan-600 dark:text-cyan-400", badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  { color: "from-rose-500 to-orange-400", accent: "text-rose-600 dark:text-rose-400", badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
];

const ABOUT_THEMES: Record<AboutCategory, { color: string; accent: string; iconBg: string; icon: typeof Shield }> = {
  registration: { color: "from-blue-500 to-cyan-400", accent: "text-blue-600 dark:text-blue-400", iconBg: "bg-blue-500/10", icon: Shield },
  affiliation: { color: "from-emerald-500 to-teal-400", accent: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-500/10", icon: Users },
  partner: { color: "from-purple-500 to-pink-400", accent: "text-purple-600 dark:text-purple-400", iconBg: "bg-purple-500/10", icon: ArrowRightLeft },
  recognition: { color: "from-amber-400 to-yellow-500", accent: "text-amber-600 dark:text-amber-400", iconBg: "bg-amber-500/10", icon: Award },
  license: { color: "from-rose-500 to-orange-400", accent: "text-rose-600 dark:text-rose-400", iconBg: "bg-rose-500/10", icon: Star },
};

const FEATURES = [
  { icon: Cpu, title: "Algo Trading", desc: "Access premium, backtested algorithmic strategies executed with millisecond precision.", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  { icon: Users, title: "Copy Trading", desc: "Automatically mirror the trades of our top-performing fund managers in real-time.", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: Zap, title: "MT5 Integration", desc: "Seamlessly connect your MetaTrader 5 accounts for institutional-grade execution.", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  { icon: Shield, title: "KYC Security", desc: "Bank-grade identity verification and multi-signature security for your peace of mind.", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
  { icon: ArrowRightLeft, title: "Crypto Payments", desc: "Instant deposits and withdrawals via BTC, ETH, and USDT with zero processing fees.", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10" },
  { icon: Award, title: "Expert Managers", desc: "Our desk consists of Wall Street veterans managing diversified risk-adjusted portfolios.", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
];

const FOOTER_SOCIAL = [
  { icon: Twitter, label: "Twitter", light: "bg-sky-500/15 border-sky-400/40 text-sky-600 hover:bg-sky-500/25 hover:border-sky-500/50", dark: "dark:bg-white/5 dark:border-transparent dark:text-muted-foreground dark:hover:bg-sky-500/20 dark:hover:text-sky-400" },
  { icon: Send, label: "Telegram", light: "bg-cyan-500/15 border-cyan-400/40 text-cyan-600 hover:bg-cyan-500/25 hover:border-cyan-500/50", dark: "dark:hover:bg-cyan-500/20 dark:hover:text-cyan-400" },
  { icon: Instagram, label: "Instagram", light: "bg-fuchsia-500/15 border-fuchsia-400/40 text-fuchsia-600 hover:bg-fuchsia-500/25 hover:border-fuchsia-500/50", dark: "dark:hover:bg-fuchsia-500/20 dark:hover:text-fuchsia-400" },
  { icon: Youtube, label: "YouTube", light: "bg-red-500/15 border-red-400/40 text-red-600 hover:bg-red-500/25 hover:border-red-500/50", dark: "dark:hover:bg-red-500/20 dark:hover:text-red-400" },
] as const;

const FOOTER_PLATFORM_LINKS = [
  { label: "Dashboard", href: (loggedIn: boolean, dash: string) => dash, showWhenLoggedIn: true, hover: "hover:text-amber-600 dark:hover:text-amber-400" },
  { label: "Investments", href: (_: boolean, __: string, app: (p: string) => string) => app("/plans"), hover: "hover:text-emerald-600 dark:hover:text-emerald-400" },
  { label: "Algo Trading", href: (_: boolean, __: string, app: (p: string) => string) => app("/algo-trading"), hover: "hover:text-blue-600 dark:hover:text-blue-400" },
  { label: "Copy Trading", href: (_: boolean, __: string, app: (p: string) => string) => app("/copy-trading"), hover: "hover:text-teal-600 dark:hover:text-teal-400" },
  { label: "EA Strategies", href: (_: boolean, __: string, app: (p: string) => string) => app("/ea-strategies"), hover: "hover:text-purple-600 dark:hover:text-purple-400" },
  { label: "Account Handling Services", href: (_: boolean, __: string, app: (p: string) => string) => app("/mt5-accounts"), hover: "hover:text-indigo-600 dark:hover:text-indigo-400" },
  { label: "Wallet & Payments", href: (_: boolean, __: string, app: (p: string) => string) => app("/wallet"), hover: "hover:text-cyan-600 dark:hover:text-cyan-400" },
] as const;

const FOOTER_LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy", hover: "hover:text-blue-600 dark:hover:text-blue-400" },
  { label: "Terms of Service", href: "/terms-of-service", hover: "hover:text-emerald-600 dark:hover:text-emerald-400" },
  { label: "Risk Disclosure", href: "/risk-disclosure", hover: "hover:text-amber-600 dark:hover:text-amber-400" },
  { label: "Cookie Policy", href: "/cookie-policy", hover: "hover:text-purple-600 dark:hover:text-purple-400" },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const { t } = useTranslation();
  const { data: plans } = useListPlans();
  const { services, isEnabled } = useServiceVisibility();
  const { data: stakingPlansRaw } = useQuery({
    queryKey: ["public-staking-plans"],
    queryFn: fetchStakingPlans,
    staleTime: 60_000,
    retry: 1,
  });
  const displayPlans = useMemo(() => {
    if (plans?.length) return plans;
    return FALLBACK_INVESTMENT_PLANS;
  }, [plans]);
  const displayStakingPlans = useMemo(() => {
    if (stakingPlansRaw?.length) return stakingPlansRaw;
    return FALLBACK_STAKING_PLANS;
  }, [stakingPlansRaw]);
  const { user } = useAuth();
  const branding = useSiteBranding();
  const partnersSection = usePartnersSection();
  const companyAbout = useCompanyAbout();
  const isLoggedIn = !!user;
  const role = (user?.role as string) || "user";
  const dashboardHref = isLoggedIn ? getPostLoginPath(role) : "/register";
  const appHref = (path: string) => (isLoggedIn ? getRoleAwareHref(role, path) : "/register");
  const orderOf = (key: ServiceKey) => {
    const i = services.findIndex(s => s.key === key);
    return i < 0 ? 99 : i;
  };

  const landingNavLinks = useMemo(
    () => [
      { href: "#features", label: t("landing.features") },
      { href: "#copy-trading", label: t("landing.copyTrading"), show: isEnabled("copy_trading") },
      { href: "#algo", label: t("landing.algoTrading"), show: isEnabled("algo_trading") },
      { href: "#ea", label: t("landing.eaStrategies"), show: isEnabled("ea_strategies") },
      { href: "#investments", label: t("landing.investments"), show: isEnabled("investment_plans") },
      { href: "#staking", label: t("landing.staking"), show: isEnabled("staking") },
      { href: "#payments", label: t("landing.payments") },
      { href: "/about", label: t("landing.about") },
    ].filter(l => l.show !== false),
    [isEnabled, services, t],
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-amber-500/30 overflow-x-clip">
      {/* Navigation */}
      <header className="border-b border-border dark:border-white/10 bg-background/95 backdrop-blur-md sticky top-0 z-50 overflow-x-clip pt-[env(safe-area-inset-top,0px)]">
        <div className={cn(APP_CONTENT_WIDTH, "px-3 sm:px-6 md:px-12")}>
          {/* Mobile: brand + language on top row; nav + auth below */}
          <div className="md:hidden">
            <div className="border-b border-border/40 -mx-3 px-3">
              <MobileTopBrandBar href="/" branding={branding} trailing={<ThemeToggle className="h-8 w-8" />} />
            </div>
            <div className="flex items-center gap-2 pb-3 pt-1 min-w-0">
              <LandingMobileNav links={landingNavLinks} className="shrink-0" />
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              {isLoggedIn ? (
                <Link href={dashboardHref} className="flex-1 min-w-0 max-w-[11rem]">
                  <Button className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20 border-0 text-sm h-9 px-3 truncate">
                    {t("landing.viewDashboard")}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="flex-1 min-w-0">
                    <Button
                      variant="outline"
                      className="w-full border-amber-500/70 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-400 font-bold shadow-sm shadow-amber-500/10 text-sm h-9 px-2 sm:px-3 truncate"
                    >
                      {t("landing.login")}
                    </Button>
                  </Link>
                  <Link href="/register" className="flex-1 min-w-0">
                    <Button className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20 border-0 text-sm h-9 px-2 sm:px-3 truncate">
                      {t("landing.getStarted")}
                    </Button>
                  </Link>
                </>
              )}
              </div>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden md:grid md:grid-cols-[auto_1fr_auto] items-center gap-x-8 lg:gap-x-12 xl:gap-x-16 py-4 min-w-0">
            <BrandMark
              href="/"
              className="shrink-0 min-w-0 max-w-[min(100%,14rem)] lg:max-w-[min(100%,18rem)] xl:max-w-[min(100%,20rem)]"
              titleSize="lg"
              branding={branding}
            />
            <nav className="flex flex-wrap justify-center items-center gap-x-5 lg:gap-x-7 xl:gap-x-8 gap-y-2 min-w-0 px-4 lg:px-8 xl:px-10">
              {landingNavLinks.map(link =>
                link.href.startsWith("/") ? (
                  <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap">
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap">
                    {link.label}
                  </a>
                ),
              )}
            </nav>
            <div className="flex items-center gap-3 shrink-0 justify-end pl-4 lg:pl-6">
              <ThemeToggle />
              <LanguageSelector />
              {isLoggedIn ? (
                <Link href={dashboardHref}>
                  <Button className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20 border-0">
                    {t("landing.viewDashboard")}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline" className="border-amber-500/70 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-400 font-bold shadow-sm shadow-amber-500/10">
                      {t("landing.login")}
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20 border-0">
                      {t("landing.getStarted")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative w-full px-4 py-16 sm:py-24 md:py-44 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1)_0,transparent_70%)] pointer-events-none" />
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] -z-10" />
          <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -z-10" />
          <div className={cn(LANDING_CONTENT, "flex flex-col items-center text-center relative z-10")}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-500 px-4 py-1 rounded-full bg-amber-500/5 backdrop-blur-sm">
                {t("landing.heroBadge")}
              </Badge>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter max-w-5xl leading-[1.08] mb-6 sm:mb-8 text-wrap-safe px-1">
              <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 dark:from-amber-200 dark:via-amber-400 dark:to-yellow-600 bg-clip-text text-transparent">
                {t("landing.heroTitle")}
              </span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-base sm:text-lg md:text-2xl text-muted-foreground max-w-2xl mb-8 sm:mb-12 font-light leading-relaxed px-1">
              {t("landing.heroSubtitle")}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md sm:max-w-none justify-center items-stretch sm:items-center px-1">
              {isLoggedIn ? (
                <Link href={dashboardHref} className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-10 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold text-base sm:text-lg rounded-full hover:scale-105 transition-all shadow-xl shadow-amber-500/25 border-0">
                    {t("landing.goToDashboard")} <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-10 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold text-base sm:text-lg rounded-full hover:scale-105 transition-all shadow-xl shadow-amber-500/25 border-0">
                      {t("landing.joinElite")} <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/login" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-10 border-border dark:border-white/10 bg-muted/60 dark:bg-white/5 backdrop-blur-md text-foreground font-semibold text-base sm:text-lg rounded-full hover:bg-muted dark:hover:bg-white/10 transition-all">
                      {t("auth.signIn")}
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </section>

        {/* Stats Bar */}
        <section id="stats" className="w-full py-8 sm:py-12 bg-muted/60 dark:bg-white/5 backdrop-blur-md border-y border-border dark:border-white/10">
          <div className={cn(LANDING_CONTENT, "px-4 sm:px-6")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
              {[
                { val: "₹500Cr+", label: "AUM Managed", color: "text-amber-600 dark:text-amber-400" },
                { val: "10,000+", label: "Global Investors", color: "text-emerald-600 dark:text-emerald-400" },
                { val: "36%", label: "Max Annual ROI", color: "text-blue-600 dark:text-blue-400" },
                { val: "99.9%", label: "Platform Uptime", color: "text-purple-600 dark:text-purple-400" },
              ].map(({ val, label, color }) => (
                <div key={label} className="flex flex-col items-center text-center min-w-0 px-1">
                  <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                    className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-1 ${color}`}>{val}</motion.div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="w-full py-16 sm:py-24 md:py-28 px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] -z-10" />
          <div className={LANDING_CONTENT}>
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-amber-500/20 text-amber-600 dark:text-amber-500 mb-4 bg-amber-500/5">Platform Features</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 tracking-tight text-wrap-safe">The Future of <span className="text-amber-600 dark:text-amber-500">Asset Management</span></h2>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-1">Combining advanced technology with hedge-fund expertise to deliver consistent alpha in all market conditions.</p>
            </div>
            <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURES.map((f, idx) => (
                <motion.div key={idx} variants={itemVariants}
                  className="p-6 rounded-2xl bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 hover:border-amber-500/30 transition-all group">
                  <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`h-6 w-6 ${f.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{f.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Configurable service sections (visibility + order controlled by admin) */}
        <div className="flex flex-col">
        {/* Copy Trading */}
        {isEnabled("copy_trading") && (
        <section id="copy-trading" style={{ order: orderOf("copy_trading") }} className="w-full py-16 sm:py-24 md:py-28 px-4 sm:px-6 bg-muted/40 dark:bg-white/[0.02] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[120px] -z-10" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-[100px] -z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/5 rounded-full blur-[140px] -z-10" />
          <div className={LANDING_CONTENT}>
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mb-4 bg-emerald-500/10">Social Trading</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 tracking-tight text-wrap-safe">
                Copy <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">Trading</span>
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-1">
                Follow vetted expert traders and automatically mirror their trades to your MT4/MT5 account — pay only when you profit.
              </p>
              <p className="text-xs text-muted-foreground/80 max-w-2xl mx-auto mt-3 px-2">
                Illustrative profiles and performance figures shown below are for demonstration only. Past performance is not indicative of future results. Verify live track records inside the platform before investing.
              </p>
            </div>
            <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {COPY_TRADERS.map((trader, idx) => (
                <motion.div key={idx} variants={itemVariants} whileHover={{ y: -4 }} className="group">
                  <Card className="bg-card dark:bg-[#080f1e] border-border dark:border-white/10 overflow-hidden h-full hover:border-emerald-500/40 dark:hover:border-white/20 transition-all duration-300 flex flex-col shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/5">
                    <div className={`h-1.5 w-full bg-gradient-to-r ${trader.color}`} />
                    <CardContent className="p-5 flex flex-col flex-1">
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-11 h-11 ${trader.bgColor} rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${trader.iconColor} ring-2 ring-white/50 dark:ring-white/10 shadow-sm`}>
                          {trader.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-bold text-foreground">{trader.name}</h3>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <Badge className={`text-[10px] ${trader.bgColor} ${trader.iconColor} border-0`}>{trader.specialty}</Badge>
                            <Badge className={`text-[10px] ${trader.riskColor} border-0`}>{trader.risk} Risk</Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{trader.bio}</p>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 border-t border-border/80 dark:border-white/5">
                        <div className={`text-center rounded-lg ${trader.statBg} p-2`}>
                          <div className={`text-base font-bold ${trader.iconColor}`}>{trader.totalRoi}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Total ROI</div>
                        </div>
                        <div className={`text-center rounded-lg ${trader.statBg} p-2`}>
                          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{trader.monthlyRoi}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Monthly</div>
                        </div>
                        <div className={`text-center rounded-lg ${trader.statBg} p-2`}>
                          <div className="text-base font-bold text-foreground">{trader.winRate}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Win Rate</div>
                        </div>
                        <div className={`text-center rounded-lg ${trader.statBg} p-2`}>
                          <div className="text-base font-bold text-foreground">{trader.followers}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Followers</div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        Min. investment: <span className="font-semibold text-foreground">{trader.minInvestment}</span>
                      </p>
                      <Link href={isLoggedIn ? appHref("/copy-trading") : "/register"}>
                        <Button size="sm" className={`w-full mt-3 bg-gradient-to-r ${trader.color} text-black font-bold text-xs h-9 border-0 shadow-md hover:opacity-90 transition-opacity`}>
                          {isLoggedIn ? "Copy Trades" : "Get Started"}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
            <div className="text-center mt-10">
              <Link href={isLoggedIn ? appHref("/copy-trading") : "/register"}>
                <Button variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 bg-emerald-500/5">
                  {isLoggedIn ? "Browse All Traders" : "Start Copy Trading"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
        )}

        {/* Algo Trading Strategies */}
        {isEnabled("algo_trading") && (
        <section id="algo" style={{ order: orderOf("algo_trading") }} className="w-full py-16 sm:py-24 md:py-28 px-4 sm:px-6 bg-muted/40 dark:bg-white/[0.02] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[120px] -z-10" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[100px] -z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/5 rounded-full blur-[140px] -z-10" />
          <div className={LANDING_CONTENT}>
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 mb-4 bg-blue-500/10">Algorithmic Trading</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 tracking-tight text-wrap-safe">
                Algo Trading <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">Strategies</span>
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-1">
                Fully automated, AI-powered strategies executing with institutional precision — 24/7, no emotion, pure logic.
              </p>
              <p className="text-xs text-muted-foreground/80 max-w-2xl mx-auto mt-3 px-2">
                Strategy statistics shown are illustrative examples only. Trading involves substantial risk of loss. See our Risk Disclosure before subscribing.
              </p>
            </div>
            <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5">
              {ALGO_STRATEGIES.map((strat, idx) => (
                <motion.div key={idx} variants={itemVariants} whileHover={{ y: -4 }} className="group">
                  <Card className={`bg-card dark:bg-[#080f1e] border-border dark:border-white/10 overflow-hidden h-full hover:border-blue-500/40 dark:hover:border-white/20 transition-all duration-300 flex flex-col shadow-sm hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5`}>
                    <div className={`h-1.5 w-full bg-gradient-to-r ${strat.color}`} />
                    <CardContent className="p-5 flex flex-col flex-1">
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-11 h-11 ${strat.bgColor} rounded-xl flex items-center justify-center shrink-0 ring-2 ring-white/50 dark:ring-white/10 shadow-sm`}>
                          <strat.icon className={`h-5 w-5 ${strat.iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-bold text-foreground">{strat.name}</h3>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <Badge className={`text-[10px] ${strat.bgColor} ${strat.iconColor} border-0`}>{strat.type}</Badge>
                            <Badge className={`text-[10px] ${strat.riskColor} border-0`}>{strat.risk} Risk</Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{strat.description}</p>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 border-t border-border/80 dark:border-white/5">
                        <div className={`text-center rounded-lg ${strat.statBg} p-2`}>
                          <div className={`text-base font-bold ${strat.iconColor}`}>{strat.returnRate}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Annual ROI</div>
                        </div>
                        <div className={`text-center rounded-lg ${strat.statBg} p-2`}>
                          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{strat.winRate}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Win Rate</div>
                        </div>
                        <div className={`text-center rounded-lg ${strat.statBg} p-2`}>
                          <div className="text-base font-bold text-red-600 dark:text-red-400">{strat.maxDrawdown}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Max DD</div>
                        </div>
                        <div className={`text-center rounded-lg ${strat.statBg} p-2`}>
                          <div className="text-base font-bold text-foreground">{strat.trades}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Trades</div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        Min. investment: <span className="font-semibold text-foreground">{strat.minInvestment}</span>
                      </p>
                      <Link href={isLoggedIn ? appHref("/algo-trading") : "/register"}>
                        <Button size="sm" className={`w-full mt-3 bg-gradient-to-r ${strat.color} text-black font-bold text-xs h-9 border-0 shadow-md hover:opacity-90 transition-opacity`}>
                          {isLoggedIn ? "Subscribe" : "Get Started"}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
            <div className="text-center mt-10">
              <Link href={isLoggedIn ? appHref("/algo-trading") : "/register"}>
                <Button variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 bg-blue-500/5">
                  {isLoggedIn ? "Explore All Strategies" : "Start Algo Trading"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
        )}

        {/* EA Strategies */}
        {isEnabled("ea_strategies") && (
        <section id="ea" style={{ order: orderOf("ea_strategies") }} className="w-full py-16 sm:py-24 md:py-28 px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -z-10" />
          <div className={LANDING_CONTENT}>
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-4 bg-emerald-500/5">Expert Advisors</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 tracking-tight text-wrap-safe">
                EA <span className="text-emerald-600 dark:text-emerald-400">Strategies</span>
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-1">
                Institutional-grade Expert Advisors for MetaTrader. Plug in, set up, and let the machine trade for you.
              </p>
            </div>
            <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {EA_STRATEGIES.map((ea, idx) => (
                <motion.div key={idx} variants={itemVariants} whileHover={{ y: -6 }} className="group">
                  <Card className="bg-card dark:bg-[#080f1e] border-border dark:border-white/10 overflow-hidden h-full hover:border-amber-500/30 dark:hover:border-white/20 transition-all duration-300 flex flex-col">
                    <div className={`h-1 w-full bg-gradient-to-r ${ea.color}`} />
                    <CardContent className="p-5 flex flex-col flex-1">
                      <div className={`w-10 h-10 ${ea.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                        <ea.icon className={`h-5 w-5 ${ea.iconColor}`} />
                      </div>
                      <h3 className="text-base font-bold text-foreground mb-1">{ea.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2 font-mono">{ea.pair}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1">{ea.description}</p>
                      <div className="space-y-2 pt-3 border-t border-border/80 dark:border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">6-Month ROI</span>
                          <span className={`text-sm font-bold ${ea.iconColor}`}>{ea.roi}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Risk Level</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ea.riskColor}`}>{ea.risk}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">From</span>
                          <span className="text-sm font-bold text-foreground">{ea.price}</span>
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
                <Button variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                  {isLoggedIn ? "Browse All EAs" : "Get Full Access"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
        )}

        {/* Investment Plans */}
        {isEnabled("investment_plans") && (
        <section id="investments" style={{ order: orderOf("investment_plans") }} className="w-full py-16 sm:py-24 md:py-28 px-4 sm:px-6 bg-muted/40 dark:bg-white/[0.02]">
          <div className={LANDING_CONTENT}>
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-amber-500/20 text-amber-600 dark:text-amber-500 mb-4 bg-amber-500/5">Wealth Plans</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 tracking-tight text-wrap-safe">Investment Plans</h2>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-1">Select a strategy that aligns with your financial goals and risk tolerance.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
              {displayPlans.map((plan: InvestmentPlan, planIdx) => {
                const theme = PLAN_CARD_THEMES[planIdx % PLAN_CARD_THEMES.length];
                return (
                <motion.div key={plan.id} whileHover={{ y: -8 }} className="relative group">
                  <Card className="bg-card dark:bg-[#0A0F1A] border-border dark:border-white/10 overflow-hidden h-full flex flex-col hover:border-amber-500/30 dark:hover:border-white/20 transition-all duration-300">
                    <div className={`h-1 w-full bg-gradient-to-r ${theme.color}`} />
                    <CardContent className="p-6 flex flex-col flex-1">
                      <div className="mb-5">
                        <Badge variant="secondary" className={`${theme.badge} mb-3 text-xs border`}>{plan.category}</Badge>
                        <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                        <p className="text-muted-foreground text-xs line-clamp-2">{plan.description}</p>
                      </div>
                      <div className="space-y-3 mb-6 flex-1">
                        <div className="flex justify-between items-end">
                          <span className="text-muted-foreground text-xs">Target ROI</span>
                          <span className={`text-2xl font-bold ${theme.accent}`}>{plan.roiPercent}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs">Duration</span>
                          <span className="text-foreground font-medium text-sm">{plan.durationDays} Days</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs">Min. Deposit</span>
                          <span className="text-foreground font-medium text-sm">${plan.minAmount}</span>
                        </div>
                      </div>
                      <Link href={isLoggedIn ? appHref("/plans") : "/register"}>
                        <Button size="sm" className={`w-full bg-gradient-to-r ${theme.color} text-black font-bold text-xs h-9 border-0 hover:opacity-90 transition-opacity`}>
                          {isLoggedIn ? "Invest Now" : "Select Plan"}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              );
              })}
            </div>
          </div>
        </section>
        )}

        {/* Staking Plans */}
        {isEnabled("staking") && (
        <section id="staking" style={{ order: orderOf("staking") }} className="w-full py-16 sm:py-24 md:py-28 px-4 sm:px-6">
          <div className={LANDING_CONTENT}>
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-4 bg-emerald-500/5">Earn & Staking</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 tracking-tight text-wrap-safe">
                Staking <span className="text-emerald-600 dark:text-emerald-400">Plans</span>
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-1">
                Put idle balances to work and earn passive rewards with flexible and locked staking options.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
              {displayStakingPlans.map((plan: StakingPlan, planIdx) => {
                const theme = PLAN_CARD_THEMES[planIdx % PLAN_CARD_THEMES.length];
                return (
                  <motion.div key={plan.id} whileHover={{ y: -8 }} className="relative group">
                    <Card className="bg-card dark:bg-[#0A0F1A] border-border dark:border-white/10 overflow-hidden h-full flex flex-col hover:border-emerald-500/30 dark:hover:border-white/20 transition-all duration-300">
                      <div className={`h-1 w-full bg-gradient-to-r ${theme.color}`} />
                      <CardContent className="p-6 flex flex-col flex-1">
                        <div className="mb-5">
                          <Badge variant="secondary" className={`${theme.badge} mb-3 text-xs border`}>
                            {plan.isFlexible ? "Flexible" : `${plan.lockDurationDays}-Day Lock`}
                          </Badge>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10`}>
                              <Coins className={`h-4 w-4 ${theme.accent}`} />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                          </div>
                          <p className="text-muted-foreground text-xs line-clamp-2">{plan.description}</p>
                        </div>
                        <div className="space-y-3 mb-6 flex-1">
                          <div className="flex justify-between items-end">
                            <span className="text-muted-foreground text-xs">APY</span>
                            <span className={`text-2xl font-bold ${theme.accent}`}>{plan.apyPercent || plan.aprPercent}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-xs">Lock Period</span>
                            <span className="text-foreground font-medium text-sm">
                              {plan.isFlexible ? "Flexible" : `${plan.lockDurationDays} Days`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-xs">Min. Stake</span>
                            <span className="text-foreground font-medium text-sm">{plan.minAmount} {plan.currency}</span>
                          </div>
                        </div>
                        <Link href={isLoggedIn ? appHref("/earn/staking") : "/register"}>
                          <Button size="sm" className={`w-full bg-gradient-to-r ${theme.color} text-black font-bold text-xs h-9 border-0 hover:opacity-90 transition-opacity`}>
                            {isLoggedIn ? "Stake Now" : "Start Earning"}
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            {displayStakingPlans.length === 0 && (
              <p className="text-center text-muted-foreground text-sm">Staking plans are coming soon.</p>
            )}
          </div>
        </section>
        )}
        </div>

        {/* Partners */}
        <section className="w-full py-20 border-t border-border dark:border-white/10 overflow-hidden">
          <div className={cn(LANDING_CONTENT, "px-6")}>
            <p className="text-center text-muted-foreground/70 text-xs font-semibold uppercase tracking-[0.3em] mb-10">{partnersSection.title}</p>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-60 dark:opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
              {partnersSection.partners.map((partner) => (
                partner.websiteUrl ? (
                  <a
                    key={partner.id}
                    href={partner.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xl font-black italic tracking-tighter text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    {partner.logoUrl ? (
                      <img src={partner.logoUrl} alt={partner.name} className="h-8 object-contain" />
                    ) : (
                      partner.name
                    )}
                  </a>
                ) : (
                  <div key={partner.id} className="text-xl font-black italic tracking-tighter text-muted-foreground">
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
        <section className="w-full py-16 sm:py-24 md:py-36 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 tracking-tighter text-wrap-safe">
              {t("landing.readyToMultiply")}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto px-1">
              {t("landing.joinInvestors")}
            </p>
            <Link href={isLoggedIn ? dashboardHref : "/register"}>
              <Button size="lg" className="w-full sm:w-auto h-12 sm:h-16 px-8 sm:px-12 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold text-base sm:text-xl rounded-full hover:scale-105 transition-all shadow-2xl shadow-amber-500/30 border-0">
                {isLoggedIn ? t("landing.goToDashboard") : t("landing.createAccountNow")}
              </Button>
            </Link>
          </div>
        </section>

        <LandingPaymentMethodsSection />

        {/* About Kuber Quant — always visible */}
        <section id="about" className="w-full py-12 sm:py-20 px-4 sm:px-6 border-t border-border dark:border-white/10 bg-gradient-to-b from-transparent via-muted/40 dark:via-white/[0.02] to-muted/80 dark:to-[#050A14]">
          <div className={LANDING_CONTENT}>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Badge variant="outline" className="border-amber-500/20 text-amber-600 dark:text-amber-400 mb-4 bg-amber-500/5">{t("landing.trustCompliance")}</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                {companyAbout.sectionTitle}
              </h2>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{companyAbout.intro}</p>
              <div className="mt-6">
                <Link href="/about">
                  <Button variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10">
                    {t("landing.learnMore")} <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {companyAbout.items.length > 0 && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
              >
                {companyAbout.items.map(item => {
                  const theme = ABOUT_THEMES[item.category];
                  const Icon = theme.icon;
                  const description =
                    item.description
                    || item.subtitle
                    || item.issuedBy
                    || companyAbout.categoryLabels[item.category];

                  return (
                    <motion.div key={item.id} variants={itemVariants} whileHover={{ y: -4 }} className="h-full">
                      <Card className="bg-card dark:bg-[#080f1e] border-border dark:border-white/10 hover:border-amber-500/30 dark:hover:border-white/20 transition-all duration-300 overflow-hidden h-full flex flex-col">
                        <div className={`h-1 w-full bg-gradient-to-r ${theme.color}`} />
                        <CardContent className="p-4 flex flex-col flex-1 gap-2">
                          <div className={`w-9 h-9 ${theme.iconBg} rounded-lg flex items-center justify-center shrink-0`}>
                            <Icon className={`h-4 w-4 ${theme.accent}`} />
                          </div>
                          <Badge variant="outline" className={`w-fit text-[10px] uppercase tracking-wider border-border dark:border-white/10 ${theme.accent} bg-muted/60 dark:bg-white/5`}>
                            {companyAbout.categoryLabels[item.category]}
                          </Badge>
                          <p className="font-semibold text-foreground text-sm leading-snug">{item.title}</p>
                          <p className="text-xs text-muted-foreground/80 leading-relaxed flex-1 line-clamp-4">{description}</p>
                          {(item.referenceNumber || item.issuedDate) && (
                            <div className="pt-2 mt-auto border-t border-border/80 dark:border-white/5 space-y-0.5 text-[10px] text-muted-foreground/70">
                              {item.referenceNumber && (
                                <p className="font-mono truncate" title={item.referenceNumber}>{item.referenceNumber}</p>
                              )}
                              {item.issuedDate && <p>Since {item.issuedDate}</p>}
                            </div>
                          )}
                          {item.documentUrl && (
                            <a
                              href={item.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 text-[11px] ${theme.accent} hover:opacity-80 mt-1`}
                            >
                              View document <ChevronRight className="h-3 w-3" />
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </section>
      </main>

      <LandingPublicStatsSection />
      <LandingTrustCtaSection />

      {/* Footer */}
      <footer className="w-full relative z-10 overflow-x-hidden border-t border-amber-500/20 dark:border-white/10 bg-gradient-to-br from-amber-50 via-white to-emerald-50/80 dark:from-[#050A14] dark:via-background dark:to-[#050A14]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 right-0 w-80 h-80 bg-amber-400/20 dark:bg-amber-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-400/15 dark:bg-emerald-500/5 rounded-full blur-[90px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-[120px]" />
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 dark:from-amber-500/60 dark:via-yellow-500/40 dark:to-emerald-500/60" />

        <div className="relative py-10 sm:py-14 px-4 sm:px-6 md:px-12">
          <div className={cn(LANDING_CONTENT, "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-12")}>
            <div className="col-span-1 md:col-span-2">
              <BrandLogo className="h-14 lg:h-20 xl:h-24 w-auto max-w-[180px] lg:max-w-[240px] xl:max-w-[280px] mb-3" logoUrl={branding.logoUrl} alt={branding.siteName} />
              <BrandTitle size="lg" branding={branding} className="mb-4" />
              <Badge variant="outline" className="mb-4 border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 text-[10px] uppercase tracking-wider">
                Wealth · Growth · Trust
              </Badge>
              <p className="text-slate-700 dark:text-muted-foreground max-w-sm mb-6 leading-relaxed text-sm">
                {companyAbout.footerDescription}
              </p>
              <div className="flex gap-3">
                {FOOTER_SOCIAL.map(({ icon: Icon, label, light, dark }) => (
                  <button
                    key={label}
                    aria-label={label}
                    className={cn(
                      "w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm dark:shadow-none",
                      light,
                      dark,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                <p className="text-xs flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <a href="mailto:support@kuberquant.com" className="text-slate-700 dark:text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors font-medium">
                    support@kuberquant.com
                  </a>
                </p>
                <p className="text-xs flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Globe className="h-3.5 w-3.5" />
                  </span>
                  <a href="https://kuberquant.com" className="text-slate-700 dark:text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">
                    kuberquant.com
                  </a>
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-5 text-sm uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">Platform</span>
              </h4>
              <ul className="space-y-2.5 text-slate-600 dark:text-muted-foreground text-sm">
                <li>
                  <Link href="/about" className="inline-flex items-center gap-1.5 transition-colors hover:text-amber-600 dark:hover:text-amber-400">
                    <ChevronRight className="h-3 w-3 opacity-40" />
                    {t("landing.about")}
                  </Link>
                </li>
                {FOOTER_PLATFORM_LINKS.map(link => {
                  if ("showWhenLoggedIn" in link && link.showWhenLoggedIn && !isLoggedIn) return null;
                  const href = link.href(isLoggedIn, dashboardHref, appHref);
                  return (
                    <li key={link.label}>
                      <Link href={href} className={cn("inline-flex items-center gap-1.5 transition-colors", link.hover)}>
                        <ChevronRight className="h-3 w-3 opacity-40" />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-5 text-sm uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400" />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">Legal</span>
              </h4>
              <ul className="space-y-2.5 text-slate-600 dark:text-muted-foreground text-sm">
                {FOOTER_LEGAL_LINKS.map(link => (
                  <li key={link.label}>
                    <a href={link.href} className={cn("inline-flex items-center gap-1.5 transition-colors", link.hover)}>
                      <ChevronRight className="h-3 w-3 opacity-40" />
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link href={isLoggedIn ? appHref("/agreements") : "/register"} className="inline-flex items-center gap-1.5 transition-colors hover:text-purple-600 dark:hover:text-purple-400">
                    <ChevronRight className="h-3 w-3 opacity-40" />
                    Legal Agreements
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className={cn(LANDING_CONTENT, "pt-8 sm:pt-10 border-t border-amber-500/15 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-center md:text-left")}>
            <div className="text-slate-600 dark:text-muted-foreground/60 text-wrap-safe">
              &copy; {new Date().getFullYear()} <span className="font-semibold text-amber-700 dark:text-amber-400">Kuber Quant</span>. All rights reserved.
            </div>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 items-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 px-3 py-1 text-blue-700 dark:text-blue-400 font-medium">
                <Cpu className="h-3 w-3" />
                Institutional Algorithms
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-emerald-700 dark:text-emerald-400 font-medium">
                <Shield className="h-3 w-3" />
                Regulated & Compliant
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
