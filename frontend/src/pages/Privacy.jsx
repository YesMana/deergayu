import SEO from '../components/SEO';
import './LegalPages.css';

const Privacy = () => (
  <div className="legal-page animate-fade-in">
    <SEO
      title="Privacy Policy | Deergayu"
      description="How Deergayu collects, uses, and protects your personal information on our Ayurvedic platform in Sri Lanka."
      url="https://deergayu.com/privacy"
      canonical="https://deergayu.com/privacy"
    />
    <div className="container">
      <div className="legal-hero">
        <h1>Privacy Policy</h1>
        <p>Your privacy matters. This policy explains how Deergayu handles personal data on our Ayurvedic platform.</p>
      </div>
      <article className="legal-content glass-panel">
        <p className="legal-meta">Last updated: 14 July 2026 · Applies to deergayu.com and related services in Sri Lanka.</p>

        <h2>1. Who we are</h2>
        <p>
          Deergayu is an Ayurvedic marketplace and channeling platform connecting customers with verified doctors,
          clinics, vendors, and wellness content in Sri Lanka. Contact us at{' '}
          <a href="mailto:info@deergayu.com">info@deergayu.com</a> or call <a href="tel:0762209299">0762209299</a>.
        </p>

        <h2>2. Information we collect</h2>
        <ul>
          <li>Account details: name, email, phone, and role (customer, doctor, vendor, etc.).</li>
          <li>Order and booking data: delivery addresses, appointment details, and payment method preference.</li>
          <li>Technical data: device/browser info and basic usage logs needed to run the service securely.</li>
          <li>Optional content you submit: reviews, contact-form messages, and profile details.</li>
        </ul>

        <h2>3. How we use your information</h2>
        <ul>
          <li>To create and manage your account and provide shop, channeling, and account features.</li>
          <li>To process orders, appointments, refunds, and related customer support.</li>
          <li>To send transactional emails (order/booking confirmations) and important service notices.</li>
          <li>To improve platform security, prevent fraud, and comply with Sri Lankan law.</li>
        </ul>

        <h2>4. Sharing</h2>
        <p>
          We share only what is necessary with vendors or providers fulfilling your order or appointment,
          and with trusted processors (e.g. hosting, email, payment gateways) under appropriate safeguards.
          We do not sell your personal data.
        </p>

        <h2>5. Cookies &amp; storage</h2>
        <p>
          We use essential cookies and local storage for login sessions, language preference, and cart continuity.
          You can clear cookies in your browser; some features may stop working if you do.
        </p>

        <h2>6. Retention &amp; security</h2>
        <p>
          We keep account and transaction records as long as needed for the service and legal obligations,
          then delete or anonymise them where practicable. We apply reasonable technical and organisational measures,
          but no online system is perfectly secure.
        </p>

        <h2>7. Your rights</h2>
        <p>
          You may request access, correction, or deletion of your personal data (subject to legal retention needs)
          by emailing <a href="mailto:info@deergayu.com">info@deergayu.com</a>. You may also close your account
          through support.
        </p>

        <h2>8. Children</h2>
        <p>
          Deergayu is not directed at children under 16. If you believe a minor has provided us data,
          please contact us so we can remove it.
        </p>

        <h2>9. Changes</h2>
        <p>
          We may update this policy periodically. Significant changes will be reflected on this page with a new
          &quot;Last updated&quot; date.
        </p>
      </article>
    </div>
  </div>
);

export default Privacy;
