'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface OrganizationBranding {
  instituteName: string;
  tagline: string;
  logoUrl: string | null;
  receiptPrefix: string;
  currencySymbol: string;
}

interface BrandingContextType {
  branding: OrganizationBranding;
  updateBranding: (newBranding: Partial<OrganizationBranding>) => void;
  refreshBranding: () => Promise<void>;
}

const defaultBranding: OrganizationBranding = {
  instituteName: 'Education Manager',
  tagline: 'Multi-Tenant Education & Fee Management Platform',
  logoUrl: null,
  receiptPrefix: 'ED-RC',
  currencySymbol: '₹',
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  updateBranding: () => {},
  refreshBranding: async () => {},
});

export function useBranding() {
  return useContext(BrandingContext);
}

export function DynamicBrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<OrganizationBranding>(defaultBranding);

  const applyDomBranding = (name: string, logo: string | null) => {
    if (typeof document === 'undefined') return;

    // 1. Update Document Title
    const activeName = name || 'Education Manager';
    document.title = `${activeName} — Education & Fee Management`;

    // 2. Update Favicon & Apple Touch Icon
    if (logo && logo.trim().length > 0) {
      let iconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(iconLink);
      }
      iconLink.href = logo;

      let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.getElementsByTagName('head')[0].appendChild(appleIcon);
      }
      appleIcon.href = logo;
    }

    // 3. Update Web Manifest link
    let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.getElementsByTagName('head')[0].appendChild(manifestLink);
    }
    manifestLink.href = `/api/manifest?v=${Date.now()}`;
  };

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        const updated: OrganizationBranding = {
          instituteName: json.data.instituteName || 'Education Manager',
          tagline: json.data.tagline || 'Multi-Tenant Education & Fee Management Platform',
          logoUrl: json.data.logoUrl || null,
          receiptPrefix: json.data.receiptPrefix || 'ED-RC',
          currencySymbol: json.data.currencySymbol || '₹',
        };
        setBranding(updated);
        applyDomBranding(updated.instituteName, updated.logoUrl);
      }
    } catch {
      // Ignore network errors on unauthenticated pages
    }
  };

  useEffect(() => {
    fetchBranding();

    // Listen for real-time branding updates from Settings page
    const handleBrandingEvent = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<OrganizationBranding>>;
      if (customEvent.detail) {
        setBranding((prev) => {
          const next = { ...prev, ...customEvent.detail };
          applyDomBranding(next.instituteName, next.logoUrl);
          return next;
        });
      }
    };

    window.addEventListener('branding-updated', handleBrandingEvent);
    return () => {
      window.removeEventListener('branding-updated', handleBrandingEvent);
    };
  }, []);

  const updateBranding = (newBranding: Partial<OrganizationBranding>) => {
    setBranding((prev) => {
      const next = { ...prev, ...newBranding };
      applyDomBranding(next.instituteName, next.logoUrl);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('branding-updated', { detail: next }));
      }
      return next;
    });
  };

  return (
    <BrandingContext.Provider value={{ branding, updateBranding, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}
