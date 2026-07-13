import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title = "Deergayu | Sri Lanka's #1 Ayurvedic Platform",
  description = "Deergayu is Sri Lanka's #1 Ayurvedic Platform. Connect with certified doctors, shop authentic herbal remedies, and embrace holistic wellness.",
  image = "https://deergayu.com/weda-gedara.png",
  url = "https://deergayu.com"
}) => {
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content="website" />
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
    </Helmet>
  );
};

export default SEO;
