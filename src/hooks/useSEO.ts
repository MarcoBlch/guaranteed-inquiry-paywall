import { useEffect } from 'react';
import type { SEOConfig } from '@/types/blog';

/**
 * Custom hook for dynamic SEO meta tag management
 *
 * Updates document head with:
 * - Title tag
 * - Meta description, keywords
 * - Open Graph tags for social sharing
 * - Twitter Card tags
 * - Canonical URL
 * - JSON-LD structured data
 */
export const useSEO = (config: SEOConfig) => {
  useEffect(() => {
    // Update document title
    document.title = config.title;

    // Helper to update or create meta tags
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`);

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Standard meta tags
    setMetaTag('description', config.description);

    if (config.keywords?.length) {
      setMetaTag('keywords', config.keywords.join(', '));
    }

    // Robots meta tag
    if (config.noIndex) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      setMetaTag('robots', 'index, follow');
    }

    // Open Graph tags
    setMetaTag('og:title', config.ogTitle || config.title, true);
    setMetaTag('og:description', config.ogDescription || config.description, true);
    setMetaTag('og:type', config.ogType || 'website', true);
    setMetaTag('og:site_name', 'FastPass', true);

    if (config.ogImage) {
      setMetaTag('og:image', config.ogImage, true);
    }

    if (config.canonicalUrl) {
      setMetaTag('og:url', config.canonicalUrl, true);

      // Update canonical link
      let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', config.canonicalUrl);
    }

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', config.ogTitle || config.title);
    setMetaTag('twitter:description', config.ogDescription || config.description);

    if (config.ogImage) {
      setMetaTag('twitter:image', config.ogImage);
    }

    // Structured Data (JSON-LD)
    if (config.structuredData) {
      // Remove existing blog structured data scripts
      document.querySelectorAll('script[data-blog-schema]').forEach(el => el.remove());

      const schemas = Array.isArray(config.structuredData)
        ? config.structuredData
        : [config.structuredData];

      schemas.forEach((schema, index) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-blog-schema', `${index}`);
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      });
    }

    // Cleanup on unmount - remove blog-specific structured data
    return () => {
      document.querySelectorAll('script[data-blog-schema]').forEach(el => el.remove());
    };
  }, [
    config.title,
    config.description,
    config.keywords,
    config.ogTitle,
    config.ogDescription,
    config.ogImage,
    config.ogType,
    config.canonicalUrl,
    config.structuredData,
    config.noIndex,
  ]);
};

export default useSEO;
