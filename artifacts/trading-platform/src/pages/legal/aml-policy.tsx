import { LegalLayout } from "@/components/layout/LegalLayout";

export default function AmlPolicyPage() {
  return (
    <LegalLayout title="AML & KYC Policy" lastUpdated="May 27, 2026">
      <section>
        <h2>1. Purpose</h2>
        <p>
          Kuber Quant maintains an Anti-Money Laundering (AML) and Know Your Customer (KYC) program to prevent financial crime,
          protect investors, and comply with applicable regulations. This policy describes how we verify identity, monitor activity,
          and report suspicious behaviour.
        </p>
      </section>

      <section>
        <h2>2. Customer Identification (KYC)</h2>
        <p>All users must complete identity verification before investing or withdrawing funds. Required documents may include:</p>
        <ul>
          <li><strong>India:</strong> PAN card and Aadhaar (or equivalent government ID)</li>
          <li><strong>International:</strong> Passport and secondary photo ID (driver&apos;s licence or national ID)</li>
          <li><strong>All regions:</strong> Proof of address when requested by compliance</li>
        </ul>
        <p>
          KYC submissions are reviewed by our compliance team. We may request additional documentation or reject applications
          that fail verification or appear fraudulent.
        </p>
      </section>

      <section>
        <h2>3. AML Screening</h2>
        <p>
          Before account approval, we screen users against sanctions lists, PEP databases, and internal risk indicators.
          Ongoing monitoring includes transaction pattern analysis, large deposit/withdrawal review, and IP/device anomaly detection.
        </p>
      </section>

      <section>
        <h2>4. Prohibited Activities</h2>
        <ul>
          <li>Money laundering or structuring transactions to evade reporting thresholds</li>
          <li>Using the platform on behalf of undisclosed third parties</li>
          <li>Providing false or forged identity documents</li>
          <li>Market manipulation, fraud, or referral program abuse</li>
          <li>Transactions involving sanctioned jurisdictions or entities</li>
        </ul>
      </section>

      <section>
        <h2>5. Enhanced Due Diligence</h2>
        <p>
          High-value transactions, politically exposed persons (PEPs), and users flagged by automated systems may undergo
          enhanced due diligence including source-of-funds documentation and manual compliance review.
        </p>
      </section>

      <section>
        <h2>6. Record Keeping</h2>
        <p>
          We retain KYC documents, transaction records, and audit logs for the period required by applicable law.
          Records may be shared with regulators or law enforcement when legally required.
        </p>
      </section>

      <section>
        <h2>7. Reporting</h2>
        <p>
          Suspicious activity may be reported to relevant financial intelligence units. We cooperate with lawful requests
          from authorities and may suspend or terminate accounts pending investigation.
        </p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>
          For AML/KYC inquiries, contact our compliance team at{" "}
          <strong>compliance@kuberquant.com</strong> or via the support channels listed on our platform.
        </p>
      </section>
    </LegalLayout>
  );
}
