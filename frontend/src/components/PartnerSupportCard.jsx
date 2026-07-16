import React from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import {
  PARTNER_SUPPORT,
  PARTNER_WA_PRESET,
  waMeUrl,
} from '../constants/partnerSupport';
import './PartnerSupportCard.css';

/**
 * WhatsApp + phone help for partners only (doctors, vendors, admin, yantra/orgs).
 * Do not mount on customer home/shop/cart.
 */
export default function PartnerSupportCard({ compact = false, context = 'partner' }) {
  const primary = PARTNER_SUPPORT.whatsappPrimary;
  const secondary = PARTNER_SUPPORT.phoneSecondary;
  const preset = `${PARTNER_WA_PRESET} (${context})`;

  return (
    <div className={`partner-support ${compact ? 'partner-support--compact' : ''}`}>
      {!compact && (
        <>
          <div className="partner-support-title">Need help?</div>
          <p className="partner-support-sub">
            Platform issues for doctors, vendors &amp; partners — chat us on WhatsApp.
          </p>
        </>
      )}
      <a
        className="partner-support-wa"
        href={waMeUrl(primary.e164, preset)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle size={compact ? 16 : 18} />
        <span>WhatsApp {primary.label}</span>
      </a>
      <div className="partner-support-alt">
        <Phone size={14} />
        <a href={`tel:${secondary.display}`}>{secondary.label}</a>
        <span className="partner-support-sep">·</span>
        <a
          href={waMeUrl(secondary.e164, preset)}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
