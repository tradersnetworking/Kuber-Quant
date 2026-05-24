import { LegalLayout } from "@/components/layout/LegalLayout";
import { AlertTriangle } from "lucide-react";

export default function RiskDisclosurePage() {
  return (
    <LegalLayout title="Risk Disclosure" lastUpdated="May 25, 2026">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-8 flex gap-4">
        <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-amber-300 text-sm leading-relaxed">
          <strong>Important Warning:</strong> Trading in financial instruments including forex, commodities, indices, cryptocurrencies, and derivatives carries significant risk. You may lose some or all of your invested capital. Do not invest funds you cannot afford to lose. This document is not financial advice.
        </p>
      </div>

      <section>
        <h2>1. General Investment Risk</h2>
        <p>
          All investments carry risk. The value of financial instruments can rise or fall, and past performance is not a reliable indicator of future results. Projected returns shown on investment plans are estimates based on historical data and are not guaranteed.
        </p>
      </section>

      <section>
        <h2>2. Forex and CFD Trading Risk</h2>
        <p>
          Foreign exchange (Forex) and Contracts for Difference (CFD) trading involves a high degree of leverage. Leverage amplifies both profits and losses. A small adverse market movement can result in substantial losses exceeding your initial deposit. You should only trade with money you can afford to lose entirely.
        </p>
        <ul>
          <li><strong>Leverage Risk:</strong> Trading on margin means your exposure is multiples of your deposit</li>
          <li><strong>Volatility Risk:</strong> Markets can move rapidly due to economic events, news, or geopolitical developments</li>
          <li><strong>Liquidity Risk:</strong> In volatile markets, it may not be possible to execute trades at desired prices</li>
          <li><strong>Counterparty Risk:</strong> The risk that a broker or counterparty may default on their obligations</li>
        </ul>
      </section>

      <section>
        <h2>3. Cryptocurrency Risk</h2>
        <p>
          Cryptocurrency markets are highly volatile and largely unregulated. Prices can change by significant percentages within short timeframes. Cryptocurrencies are not legal tender and may lose value entirely. There is no government compensation scheme for crypto losses.
        </p>
        <ul>
          <li>Regulatory changes can significantly impact crypto values</li>
          <li>Security risks including exchange hacks and wallet vulnerabilities</li>
          <li>Operational risk from network congestion or smart contract bugs</li>
        </ul>
      </section>

      <section>
        <h2>4. Copy Trading Risk</h2>
        <p>
          Copy trading allows you to replicate the positions of signal traders. You must understand:
        </p>
        <ul>
          <li>Signal traders operate with their own risk parameters which may not match yours</li>
          <li>Historical performance of a trader does not guarantee future results</li>
          <li>Losses incurred by the signal trader will be proportionally applied to your account</li>
          <li>There may be slippage between the signal trader's execution and yours</li>
          <li>You are ultimately responsible for all positions in your account</li>
        </ul>
      </section>

      <section>
        <h2>5. Expert Advisor (EA) and Algorithmic Trading Risk</h2>
        <p>
          Automated trading strategies, including Expert Advisors (EAs), operate based on pre-programmed logic. Risks include:
        </p>
        <ul>
          <li><strong>Over-optimisation:</strong> Strategies optimised for historical data may perform poorly in live markets</li>
          <li><strong>Technical Failure:</strong> Software bugs, connectivity issues, or server outages can interrupt trading</li>
          <li><strong>Market Regime Change:</strong> A strategy effective in trending markets may fail in range-bound conditions</li>
          <li><strong>No Human Oversight:</strong> Automated systems may not respond correctly to extraordinary market events</li>
        </ul>
      </section>

      <section>
        <h2>6. MT4/MT5 Account Handling Risk</h2>
        <p>
          When authorising Kuber Quant to manage your broker account, you acknowledge:
        </p>
        <ul>
          <li>Trading decisions are made by our team based on strategy and market conditions — not guaranteed to be profitable</li>
          <li>You bear full financial responsibility for all trades executed in your account</li>
          <li>Drawdown periods are normal in professional trading — short-term losses do not necessarily indicate failure</li>
          <li>Account management does not constitute a guaranteed return product</li>
        </ul>
      </section>

      <section>
        <h2>7. Technology and Operational Risk</h2>
        <ul>
          <li>Platform outages or maintenance windows may prevent you from accessing your account or closing positions</li>
          <li>Internet connectivity issues on your side may delay order execution</li>
          <li>Cybersecurity risks including phishing, malware, and account compromise</li>
          <li>MT4/MT5 broker platform outages that are beyond our control</li>
        </ul>
      </section>

      <section>
        <h2>8. Regulatory and Legal Risk</h2>
        <p>
          Regulations governing financial markets and investment platforms change over time. Changes in law may affect your ability to use certain services, access funds, or benefit from specific tax treatments. It is your responsibility to understand and comply with the laws of your jurisdiction.
        </p>
      </section>

      <section>
        <h2>9. No Financial Advice</h2>
        <p>
          Nothing on the Kuber Quant platform constitutes financial, investment, tax, or legal advice. All information, tools, and services are provided for informational and transactional purposes only. You should seek independent professional advice before making any investment decision.
        </p>
      </section>

      <section>
        <h2>10. Acknowledgement</h2>
        <p>
          By using the Kuber Quant platform, you confirm that you have read, understood, and accepted this Risk Disclosure in its entirety, and that you are aware of the risks involved in trading and investing in financial markets.
        </p>
      </section>
    </LegalLayout>
  );
}
