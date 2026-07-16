import React, { useEffect, useState } from 'react';
import { Facebook, Instagram, Youtube, MessageCircle } from 'lucide-react';
import './SocialLinks.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function TikTokIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.19 8.19 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z" />
    </svg>
  );
}

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
  { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
];

/**
 * Premium social icon row — only renders platforms with URLs from storefront settings.
 * variant: 'footer' | 'home' | 'inline'
 */
export default function SocialLinks({ variant = 'footer', className = '' }) {
  const [links, setLinks] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/storefront-settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setLinks(data?.socialLinks || {});
      })
      .catch(() => {
        if (!cancelled) setLinks({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!links) return null;

  const active = PLATFORMS.filter((p) => links[p.key]);
  if (!active.length) return null;

  return (
    <div className={`social-links social-links--${variant} ${className}`.trim()}>
      {variant === 'home' && (
        <div className="social-links-copy">
          <span className="social-links-eyebrow">Follow Deergayu</span>
          <p>Stay with us on social — wellness tips, offers, and community.</p>
        </div>
      )}
      <ul className="social-links-list" aria-label="Social media">
        {active.map(({ key, label, Icon }) => (
          <li key={key}>
            <a
              href={links[key]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="social-links-item"
            >
              <Icon size={variant === 'home' ? 20 : 18} />
              {variant === 'home' ? <span>{label}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
