import { LegalLayout } from "@/components/layout/LegalLayout";

export default function CookiePolicyPage() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="May 25, 2026">
      <section>
        <h2>1. What Are Cookies</h2>
        <p>
          Cookies are small text files stored on your device when you visit a website. They help us recognise your browser, remember your preferences, maintain your login session, and understand how you use our platform. We also use similar technologies such as local storage and session tokens.
        </p>
      </section>

      <section>
        <h2>2. How We Use Cookies</h2>
        <p>Kuber Quant uses cookies for the following purposes:</p>

        <h3 className="text-base font-semibold text-white mt-4 mb-2">Strictly Necessary Cookies</h3>
        <p>These cookies are essential for the platform to function. They cannot be disabled.</p>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Cookie</th>
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Purpose</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-mono text-amber-400 text-xs">auth_token</td>
                <td className="py-2 pr-4">Maintains your authenticated session</td>
                <td className="py-2">Session / 7 days</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-mono text-amber-400 text-xs">csrf_token</td>
                <td className="py-2 pr-4">Prevents cross-site request forgery attacks</td>
                <td className="py-2">Session</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-mono text-amber-400 text-xs">portal_type</td>
                <td className="py-2 pr-4">Identifies staff vs user portal routing</td>
                <td className="py-2">Session</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-semibold text-white mt-6 mb-2">Functional Cookies</h3>
        <p>These cookies remember your preferences and improve your experience.</p>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Cookie</th>
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Purpose</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-mono text-amber-400 text-xs">theme_pref</td>
                <td className="py-2 pr-4">Stores your display theme preference</td>
                <td className="py-2">1 year</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-mono text-amber-400 text-xs">lang_pref</td>
                <td className="py-2 pr-4">Stores your language preference</td>
                <td className="py-2">1 year</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-mono text-amber-400 text-xs">sidebar_state</td>
                <td className="py-2 pr-4">Remembers sidebar collapsed/expanded state</td>
                <td className="py-2">30 days</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-semibold text-white mt-6 mb-2">Analytics Cookies</h3>
        <p>These cookies help us understand how users interact with the platform so we can improve it. All data is anonymised and aggregated.</p>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Cookie</th>
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Purpose</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-mono text-amber-400 text-xs">_session_id</td>
                <td className="py-2 pr-4">Tracks anonymised session behaviour</td>
                <td className="py-2">Session</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4 font-mono text-amber-400 text-xs">_page_views</td>
                <td className="py-2 pr-4">Counts page views for usage analytics</td>
                <td className="py-2">30 days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>3. Local Storage</h2>
        <p>
          In addition to cookies, we use browser local storage to store your JWT authentication token and user preferences. This is required for the platform to function and cannot be disabled. Local storage data does not expire automatically — it is cleared when you log out or clear your browser data.
        </p>
      </section>

      <section>
        <h2>4. Third-Party Cookies</h2>
        <p>
          Some features on our platform may set cookies from third parties, including:
        </p>
        <ul>
          <li><strong>Google OAuth:</strong> If you use "Continue with Google" sign-in</li>
          <li><strong>Payment Processors:</strong> For deposit/withdrawal functionality</li>
          <li><strong>Support Chat:</strong> WhatsApp and Telegram integration widgets</li>
        </ul>
        <p>These third parties have their own cookie policies which we encourage you to review.</p>
      </section>

      <section>
        <h2>5. Managing Cookies</h2>
        <p>You can control cookies through your browser settings:</p>
        <ul>
          <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
          <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
          <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
          <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
        </ul>
        <p className="mt-3 text-amber-300/80 text-sm">
          Note: Disabling strictly necessary cookies will prevent you from logging in and using the platform.
        </p>
      </section>

      <section>
        <h2>6. Changes to This Policy</h2>
        <p>
          We may update this Cookie Policy as our platform evolves. We will notify you of significant changes via in-platform notification. Continued use of the platform constitutes acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2>7. Contact Us</h2>
        <p>
          For questions about our use of cookies, contact us at <span className="text-amber-400">privacy@kubercapital.com</span>.
        </p>
      </section>
    </LegalLayout>
  );
}
