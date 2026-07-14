import SEO from '../components/SEO';
import './LegalPages.css';

const RefundPolicy = () => (
  <div className="legal-page animate-fade-in">
    <SEO
      title="Refund Policy | Deergayu"
      description="Refund and return rules for Deergayu herbal products and Ayurvedic appointment bookings in Sri Lanka."
      url="https://deergayu.com/refund-policy"
      canonical="https://deergayu.com/refund-policy"
    />
    <div className="container">
      <div className="legal-hero">
        <h1>Refund &amp; Return Policy</h1>
        <p>Clear guidelines for products and appointment cancellations on Deergayu.</p>
      </div>
      <article className="legal-content glass-panel">
        <p className="legal-meta">Last updated: 14 July 2026</p>

        <h2>1. Overview</h2>
        <p>
          We want you to shop and book with confidence. Because many items are natural herbs and health-related goods,
          some returns are limited for hygiene and safety. Contact{' '}
          <a href="mailto:info@deergayu.com">info@deergayu.com</a> or call{' '}
          <a href="tel:0762209299">0762209299</a> within the windows below.
        </p>

        <h2>2. Herbal products &amp; shop orders</h2>
        <ul>
          <li>
            <strong>Damaged or wrong item:</strong> Report within 48 hours of delivery with clear photos.
            We will arrange a replacement or refund after verification with the vendor.
          </li>
          <li>
            <strong>Unopened, unused products:</strong> Eligible return requests within 7 days of delivery,
            subject to vendor approval and product type.
          </li>
          <li>
            <strong>Opened consumables</strong> (herbs, oils, powders, capsules, teas, etc.): generally non-returnable
            once the seal is broken, except for verified quality defects.
          </li>
          <li>
            Shipping fees are non-refundable unless the error was ours or the vendor&apos;s.
          </li>
        </ul>

        <h2>3. How product refunds are processed</h2>
        <p>
          Approved refunds are issued to the original payment method where possible (bank transfer or PayHere),
          typically within 7–14 business days after the return is received and inspected.
          Cash-on-delivery refunds are processed via bank transfer to details you provide.
        </p>

        <h2>4. Appointments &amp; channeling</h2>
        <ul>
          <li>
            <strong>Cancel 24+ hours before:</strong> Full refund of the booking fee (if prepaid), or free rebooking.
          </li>
          <li>
            <strong>Cancel within 24 hours:</strong> Refund may be partial or declined depending on the provider&apos;s policy;
            we will mediate reasonably.
          </li>
          <li>
            <strong>Provider no-show or cancellation:</strong> Full refund or free reschedule at your choice.
          </li>
          <li>
            Missed appointments without notice are generally non-refundable.
          </li>
        </ul>

        <h2>5. Non-refundable situations</h2>
        <ul>
          <li>Change of mind after sealed herbal goods have been opened.</li>
          <li>Incorrect address or phone provided by the customer leading to failed delivery.</li>
          <li>Services already fully delivered (completed consultations).</li>
        </ul>

        <h2>6. Requesting a refund</h2>
        <p>
          Email <a href="mailto:info@deergayu.com">info@deergayu.com</a> with your order or appointment reference,
          reason, and supporting photos if applicable. Our team will respond as soon as possible during business hours.
        </p>
      </article>
    </div>
  </div>
);

export default RefundPolicy;
