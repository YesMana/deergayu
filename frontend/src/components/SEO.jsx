import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title = 'Deergayu | Sri Lankan Digital Healthcare & Ayurveda',
  description = 'Deergayu connects patients with approved healthcare providers and Ayurveda services in Sri Lanka — book consultations, read the guide, and shop wellness products.',
  image = "https://deergayu.com/weda-gedara.png",
  url = "https://deergayu.com",
  type = "website",
  canonical,
  jsonLd,
}) => {
  const canonicalUrl = canonical || url;
  const ogType = type === 'product' || type === 'article' ? type : 'website';

  const jsonLdBlocks = jsonLd
    ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd])
    : [];

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Deergayu" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {jsonLdBlocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
