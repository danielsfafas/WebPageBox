import { useEffect } from 'react';

export function useSEO({ 
  title, 
  description, 
  canonical,
  ogType = 'website',
  ogImage,
  twitterCard = 'summary_large_image'
}) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    const updateMetaTag = (selector, attribute, value) => {
      if (!value) return;
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        if (selector.includes('property=')) {
          element.setAttribute('property', selector.match(/property="([^"]+)"/)[1]);
        } else {
          element.setAttribute('name', selector.match(/name="([^"]+)"/)[1]);
        }
        document.head.appendChild(element);
      }
      element.setAttribute('content', value);
    };

    if (description) {
      updateMetaTag('meta[name="description"]', 'content', description);
      updateMetaTag('meta[property="og:description"]', 'content', description);
      updateMetaTag('meta[name="twitter:description"]', 'content', description);
    }

    if (title) {
      updateMetaTag('meta[property="og:title"]', 'content', title);
      updateMetaTag('meta[name="twitter:title"]', 'content', title);
    }

    updateMetaTag('meta[property="og:type"]', 'content', ogType);
    updateMetaTag('meta[name="twitter:card"]', 'content', twitterCard);

    if (ogImage) {
      updateMetaTag('meta[property="og:image"]', 'content', ogImage);
      updateMetaTag('meta[name="twitter:image"]', 'content', ogImage);
    }

    if (canonical) {
      let linkElement = document.querySelector('link[rel="canonical"]');
      if (!linkElement) {
        linkElement = document.createElement('link');
        linkElement.setAttribute('rel', 'canonical');
        document.head.appendChild(linkElement);
      }
      linkElement.setAttribute('href', canonical);
    }

    const ogUrl = canonical || window.location.href;
    updateMetaTag('meta[property="og:url"]', 'content', ogUrl);
  }, [title, description, canonical, ogType, ogImage, twitterCard]);
}

export default useSEO;
