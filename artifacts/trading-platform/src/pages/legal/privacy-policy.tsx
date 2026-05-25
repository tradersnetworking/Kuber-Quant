import { LegalLayout } from "@/components/layout/LegalLayout";

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 25, 2026">
      <section>
        <h2>1. Introduction</h2>
        <p>
          Kuber Quant ("we", "us", or "our") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our trading and investment platform.
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <p>We collect the following categories of information:</p>
        <ul>
          <li><strong>Identity Data:</strong> Full name, date of birth, nationality, government-issued ID documents (for KYC verification)</li>
          <li><strong>Contact Data:</strong> Email address, phone number, postal address</li>
          <li><strong>Financial Data:</strong> Bank account details, transaction history, wallet balances, investment records</li>
          <li><strong>Technical Data:</strong> IP address, browser type, device identifiers, login timestamps, usage logs</li>
          <li><strong>Trading Data:</strong> Trade history, portfolio positions, MT4/MT5 account details, strategy subscriptions</li>
        </ul>
      </section>

      <section>
        <h2>3. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Create and manage your account and verify your identity (KYC/AML compliance)</li>
          <li>Process transactions, deposits, and withdrawals</li>
          <li>Provide copy trading, algo trading, and EA strategy services</li>
          <li>Send account notifications, security alerts, and important updates</li>
          <li>Prevent fraud, money laundering, and unauthorized access</li>
          <li>Comply with applicable laws and regulatory obligations</li>
          <li>Improve our platform and personalise your experience</li>
        </ul>
      </section>

      <section>
        <h2>4. Data Sharing and Disclosure</h2>
        <p>We do not sell your personal data. We may share it with:</p>
        <ul>
          <li><strong>Regulatory Authorities:</strong> Where required by law or court order</li>
          <li><strong>Payment Processors:</strong> To facilitate deposits and withdrawals securely</li>
          <li><strong>MT4/MT5 Brokers:</strong> When you connect your trading account for copy trading or account handling services</li>
          <li><strong>KYC/AML Providers:</strong> Identity verification services for compliance purposes</li>
          <li><strong>Cloud Infrastructure:</strong> Hosting and storage partners under strict data protection agreements</li>
        </ul>
      </section>

      <section>
        <h2>5. Data Retention</h2>
        <p>
          We retain your personal data for as long as your account is active or as required by law. Financial records and KYC documents are retained for a minimum of 5 years following account closure, as required by anti-money laundering regulations. You may request deletion of non-regulatory data by contacting us.
        </p>
      </section>

      <section>
        <h2>6. Your Rights</h2>
        <p>Depending on your jurisdiction, you have the right to:</p>
        <ul>
          <li>Access a copy of the personal data we hold about you</li>
          <li>Correct inaccurate or incomplete data</li>
          <li>Request erasure of data (where permitted by law)</li>
          <li>Object to or restrict certain processing activities</li>
          <li>Data portability — receive your data in a structured format</li>
          <li>Withdraw consent for optional processing at any time</li>
        </ul>
        <p>To exercise your rights, contact us at <span className="text-amber-400">privacy@kuberquant.com</span></p>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>
          We implement industry-standard security measures including 256-bit TLS encryption, two-factor authentication (2FA), rate limiting, and regular security audits. However, no system is entirely impenetrable, and we encourage you to use strong passwords and enable 2FA on your account.
        </p>
      </section>

      <section>
        <h2>8. Cookies</h2>
        <p>
          We use cookies and similar tracking technologies to maintain session state, analyse platform usage, and improve performance. See our <a href="/cookie-policy" className="text-amber-400 hover:underline">Cookie Policy</a> for details.
        </p>
      </section>

      <section>
        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically. We will notify you of significant changes via email or an in-platform notification. Continued use of the platform after such changes constitutes acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2>10. Contact Us</h2>
        <p>
          For privacy-related queries or complaints, contact our Data Protection Officer at <span className="text-amber-400">privacy@kuberquant.com</span> or via our <a href="/support" className="text-amber-400 hover:underline">Support Centre</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
