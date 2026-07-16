import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import './SocialLinks.css';

const API_URL = import.meta.env.VITE_API_URL || '';

/** Brand icons as inline SVGs — lucide-react no longer exports Facebook/Instagram/YouTube. */
function IconFacebook({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 8h2V5.1c0-.3 0-1.1.1-1.6.1-.5.4-1 .8-1.4.5-.4 1.1-.7 1.9-.8C19.6 1.1 20.5 1 21.5 1h2.1v3.5H21c-.6 0-1 .1-1.2.2-.2.1-.3.3-.3.7V8h2.6l-.4 3.5H19.5V23h-4V11.5H13V8h1z" />
    </svg>
  );
}

function IconInstagram({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2z" />
      <circle cx="17.5" cy="6.5" r="1.2" />
      <path d="M16.8 2H7.2A5.2 5.2 0 0 0 2 7.2v9.6A5.2 5.2 0 0 0 7.2 22h9.6a5.2 5.2 0 0 0 5.2-5.2V7.2A5.2 5.2 0 0 0 16.8 2zm3.5 14.8a3.5 3.5 0 0 1-3.5 3.5H7.2a3.5 3.5 0 0 1-3.5-3.5V7.2A3.5 3.5 0 0 1 7.2 3.7h9.6a3.5 3.5 0 0 1 3.5 3.5v9.6z" />
    </svg>
  );
}

function IconYoutube({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z" />
    </svg>
  );
}

function IconTikTok({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.19 8.19 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z" />
    </svg>
  );
}

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', Icon: IconFacebook },
  { key: 'tiktok', label: 'TikTok', Icon: IconTikTok },
  { key: 'instagram', label: 'Instagram', Icon: IconInstagram },
  { key: 'youtube', label: 'YouTube', Icon: IconYoutube },
  { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
];

/**
 * variant: 'footer' | 'home'
 * Home always shows the strip so placement is obvious; icons appear once admin adds URLs.
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

  if (links === null) return null;

  const active = PLATFORMS.filter((p) => links[p.key]);

  if (variant === 'footer' && !active.length) return null;

  return (
    <div className={`social-links social-links--${variant} ${className}`.trim()}>
      {variant === 'home' && (
        <div className="social-links-copy">
          <span className="social-links-eyebrow">Follow Deergayu</span>
          <p>
            {active.length
              ? 'Stay with us on social — wellness tips, offers, and community.'
              : 'Our social channels will appear here once added in Admin → Social Links.'}
          </p>
        </div>
      )}
      {active.length > 0 ? (
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
      ) : variant === 'home' ? (
        <div className="social-links-empty">No links yet</div>
      ) : null}
    </div>
  );
}
