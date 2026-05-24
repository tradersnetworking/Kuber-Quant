import { LegalLayout } from "@/components/layout/LegalLayout";

export default function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="May 25, 2026">
      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By registering for, accessing, or using the Kuber Quant platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree with any part of these Terms, you must not use our Platform. These Terms apply to all users including investors, copy traders, and account holders.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>To use the Platform you must:</p>
        <ul>
          <li>Be at least 18 years of age (or the legal age of majority in your jurisdiction)</li>
          <li>Not be a resident of a restricted jurisdiction (see our compliance page)</li>
          <li>Have successfully completed KYC/AML verification</li>
          <li>Have the legal capacity to enter into binding agreements</li>
          <li>Not be a politically exposed person (PEP) without prior disclosure</li>
        </ul>
      </section>

      <section>
        <h2>3. Account Registration and Security</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials. You must immediately notify us of any unauthorised access or suspected breach. Kuber Quant is not liable for losses resulting from your failure to safeguard your credentials. You may not share, transfer, or sell your account.
        </p>
      </section>

      <section>
        <h2>4. Investment Plans and Returns</h2>
        <p>
          Investment plans offered on the Platform specify projected ROI percentages and durations. These projections are based on historical performance and market modelling. <strong>Past performance is not a guarantee of future results.</strong> All investments carry risk, and you may receive back less than you invest. Returns are credited according to the plan schedule subject to market conditions and platform performance.
        </p>
      </section>

      <section>
        <h2>5. Copy Trading Services</h2>
        <p>
          The copy trading feature allows you to mirror trades of expert traders. By activating copy trading, you acknowledge:
        </p>
        <ul>
          <li>Trades are executed automatically based on the signal trader's activity</li>
          <li>Profit-sharing terms (your agreed percentage) apply to net profits only</li>
          <li>You bear full risk for all copied positions — losses are not covered by Kuber Quant</li>
          <li>Past performance of signal traders does not guarantee future results</li>
          <li>You may stop copying a trader at any time, subject to open positions</li>
        </ul>
      </section>

      <section>
        <h2>6. MT4/MT5 Account Handling</h2>
        <p>
          When you use the Account Handling service, you authorise Kuber Quant's designated trading team to manage your connected MT4 or MT5 account. You acknowledge:
        </p>
        <ul>
          <li>Management is conducted under the profit-sharing arrangement you specify</li>
          <li>You retain ownership of your MT4/MT5 account at all times</li>
          <li>Kuber Quant does not guarantee specific returns</li>
          <li>You may revoke authorisation at any time with reasonable notice</li>
          <li>Trading activity is logged and accessible to you via the platform dashboard</li>
        </ul>
      </section>

      <section>
        <h2>7. Expert Advisor (EA) Strategies</h2>
        <p>
          EA strategies are proprietary automated trading algorithms distributed as .ex5 files for use on MetaTrader 4/5 platforms. Subscriptions grant you a non-exclusive, non-transferable licence to use the EA on your account. You may not reverse-engineer, share, resell, or redistribute EA files. Subscriptions are non-refundable after download.
        </p>
      </section>

      <section>
        <h2>8. Deposits, Withdrawals, and Fees</h2>
        <ul>
          <li>Minimum deposit and withdrawal amounts apply and vary by payment method</li>
          <li>Processing times vary: crypto withdrawals 1–24 hours; fiat 2–5 business days</li>
          <li>Withdrawal requests may be subject to verification checks</li>
          <li>Platform management fees are outlined in your investment plan or service agreement</li>
          <li>Kuber Quant is not responsible for fees charged by third-party payment processors</li>
        </ul>
      </section>

      <section>
        <h2>9. Prohibited Activities</h2>
        <p>You must not:</p>
        <ul>
          <li>Use the Platform for money laundering or financing of illegal activities</li>
          <li>Attempt to manipulate platform metrics or trader rankings</li>
          <li>Access or probe the Platform's systems without authorisation</li>
          <li>Create multiple accounts to circumvent limitations or earn multiple bonuses</li>
          <li>Use automated tools to scrape or extract data from the Platform</li>
        </ul>
      </section>

      <section>
        <h2>10. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Kuber Quant shall not be liable for: indirect, incidental, or consequential losses; losses resulting from market volatility or force majeure events; losses due to third-party broker failures; or losses resulting from user error or misuse of the Platform.
        </p>
      </section>

      <section>
        <h2>11. Termination</h2>
        <p>
          We reserve the right to suspend or terminate your account at any time if you breach these Terms, fail KYC/AML requirements, or engage in fraudulent activity. Upon termination, you may withdraw remaining funds subject to verification and compliance checks.
        </p>
      </section>

      <section>
        <h2>12. Governing Law</h2>
        <p>
          These Terms are governed by and construed in accordance with applicable financial regulations. Any disputes shall be subject to binding arbitration before being escalated to the courts of the applicable jurisdiction.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>
          For questions about these Terms, contact us at <span className="text-amber-400">legal@kubercapital.com</span>.
        </p>
      </section>
    </LegalLayout>
  );
}
