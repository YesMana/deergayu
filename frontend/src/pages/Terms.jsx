import SEO from '../components/SEO';
import './LegalPages.css';

const Terms = () => (
  <div className="legal-page animate-fade-in">
    <SEO
      title="Terms of Service | Deergayu"
      description="Terms governing use of the Deergayu Ayurvedic shop, channeling, and wellness platform in Sri Lanka."
      url="https://deergayu.com/terms"
      canonical="https://deergayu.com/terms"
    />
    <div className="container">
      <div className="legal-hero">
        <h1>Terms of Service</h1>
        <p>Please read these terms carefully before using Deergayu.</p>
      </div>
      <article className="legal-content glass-panel">
        <p className="legal-meta">Last updated: 14 July 2026</p>

        <h2>1. Acceptance</h2>
        <p>
          By accessing deergayu.com or creating an account, you agree to these Terms of Service and our Privacy Policy.
          If you do not agree, do not use the platform.
        </p>

        <h2>2. The platform</h2>
        <p>
          Deergayu provides an online marketplace for Ayurvedic products, appointment channeling with practitioners,
          educational content, and related wellness services in Sri Lanka. Doctors, clinics, vendors, and organisations
          act as independent providers; Deergayu facilitates discovery and bookings but is not a medical institution.
        </p>

        <h2>3. Accounts</h2>
        <ul>
          <li>You must provide accurate registration information and keep login credentials secure.</li>
          <li>Expert and vendor accounts may require approval before full access is granted.</li>
          <li>We may suspend accounts that abuse the platform, misrepresent credentials, or violate these terms.</li>
        </ul>

        <h2>4. Products &amp; orders</h2>
        <p>
          Product listings are provided by vendors. Prices, stock, and descriptions are displayed as supplied.
          Orders are subject to confirmation and our Refund Policy. Delivery times vary by shipping zone within Sri Lanka.
        </p>

        <h2>5. Appointments</h2>
        <p>
          Channeling bookings depend on provider availability. Fees, consultation format (in-person or online),
          and clinical advice are the responsibility of the practitioner. Always seek emergency care through proper
          medical channels when needed—Ayurvedic consultations are not a substitute for emergency medicine.
        </p>

        <h2>6. Payments</h2>
        <p>
          We may offer cash on delivery, bank transfer, QR pay, and (when enabled) card payment via PayHere.
          You agree to pay all amounts due for your orders and bookings using a valid method.
        </p>

        <h2>7. Acceptable use</h2>
        <ul>
          <li>Do not post unlawful, harmful, or false content, including fake reviews.</li>
          <li>Do not scrape, attack, or reverse-engineer the service.</li>
          <li>Do not use the platform to sell counterfeit or prohibited goods.</li>
        </ul>

        <h2>8. Intellectual property</h2>
        <p>
          Deergayu branding, site design, and original content are protected. You may not copy or reuse them
          without written permission. Provider-uploaded content remains subject to their rights and our moderation.
        </p>

        <h2>9. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by Sri Lankan law, Deergayu is not liable for indirect or consequential losses,
          or for outcomes of herbal use or consultations arranged through the platform. Our total liability for any claim
          related to a transaction is limited to the amount you paid for that transaction.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of Sri Lanka. Disputes should first be raised with{' '}
          <a href="mailto:info@deergayu.com">info@deergayu.com</a> / <a href="tel:0762209299">0762209299</a>.
        </p>
      </article>
    </div>
  </div>
);

export default Terms;
