export interface CompanyBrandingSettings {
  name: string;
  cin?: string; // Corporate Identification Number (CIN)
  registrationNo?: string;
  logoUrl: string;
  watermarkUrl?: string; // Background water drop logo URL for PDFs
  watermarkOpacity?: number; // 0.05 to 0.25 (default 0.08)
  address?: string;
  website?: string;
  phone?: string;
  email?: string;
  signatoryTitle?: string;
  signatoryName?: string;
  stampUrl?: string;
  // Module Progression: Allow viewing all modules without completing previous ones
  allowUnrestrictedNavigation?: boolean;
  // Screenshot & Content DRM Protection
  drmScreenshotProtection?: boolean;
}

export const DEFAULT_BRANDING: CompanyBrandingSettings = {
  name: "Orbit LMS Innovation Academy",
  cin: "U72900DL2026PTC389421",
  registrationNo: "REG-ORBIT-2026/8942",
  logoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80",
  watermarkUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=400&auto=format&fit=crop&q=80",
  watermarkOpacity: 0.08,
  address: "Orbit Technology Campus, Sector 62, Tech City, India",
  website: "https://orbitlms.edu.in",
  phone: "+91 98765 43210",
  email: "contact@orbitlms.edu.in",
  signatoryTitle: "Authorized Registrar / Academic Dean",
  signatoryName: "Academic Controller",
  allowUnrestrictedNavigation: true, // Default to allowed as requested
  drmScreenshotProtection: true
};

const STORAGE_KEY = "orbit_institute_settings";

/**
 * Get active company branding & letterhead settings
 */
export function getCompanyBranding(): CompanyBrandingSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_BRANDING,
        ...parsed,
      };
    }
  } catch (e) {
    console.error("Error reading company branding settings:", e);
  }
  return DEFAULT_BRANDING;
}

/**
 * Save company branding & letterhead settings
 */
export function saveCompanyBranding(settings: Partial<CompanyBrandingSettings>): CompanyBrandingSettings {
  const current = getCompanyBranding();
  const updated = {
    ...current,
    ...settings
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("orbit_branding_updated", { detail: updated }));
  return updated;
}

/**
 * Export company details as formatted JSON string
 */
export function exportCompanyBrandingJson(): string {
  const branding = getCompanyBranding();
  const exportPayload = {
    exportVersion: "2.0",
    exportedAt: new Date().toISOString(),
    organization: branding
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Import company details from JSON payload
 */
export function importCompanyBrandingFromJson(jsonString: string): { success: boolean; message: string; data?: CompanyBrandingSettings } {
  try {
    const parsed = JSON.parse(jsonString);
    const target = parsed.organization || parsed;

    if (!target || typeof target !== "object") {
      return { success: false, message: "Invalid JSON format: missing organization data." };
    }

    const updated = saveCompanyBranding({
      name: target.name || DEFAULT_BRANDING.name,
      cin: target.cin ?? DEFAULT_BRANDING.cin,
      registrationNo: target.registrationNo ?? DEFAULT_BRANDING.registrationNo,
      logoUrl: target.logoUrl || target.logo || DEFAULT_BRANDING.logoUrl,
      watermarkUrl: target.watermarkUrl || target.watermark || target.logoUrl || DEFAULT_BRANDING.watermarkUrl,
      watermarkOpacity: typeof target.watermarkOpacity === "number" ? target.watermarkOpacity : DEFAULT_BRANDING.watermarkOpacity,
      address: target.address ?? DEFAULT_BRANDING.address,
      website: target.website ?? DEFAULT_BRANDING.website,
      phone: target.phone ?? target.mobile ?? DEFAULT_BRANDING.phone,
      email: target.email ?? DEFAULT_BRANDING.email,
      signatoryTitle: target.signatoryTitle ?? DEFAULT_BRANDING.signatoryTitle,
      signatoryName: target.signatoryName ?? DEFAULT_BRANDING.signatoryName,
      stampUrl: target.stampUrl ?? DEFAULT_BRANDING.stampUrl,
      allowUnrestrictedNavigation: typeof target.allowUnrestrictedNavigation === "boolean" ? target.allowUnrestrictedNavigation : true,
      drmScreenshotProtection: typeof target.drmScreenshotProtection === "boolean" ? target.drmScreenshotProtection : true
    });

    return {
      success: true,
      message: `Organization branding & letterhead for "${updated.name}" imported successfully!`,
      data: updated
    };
  } catch (err: any) {
    return { success: false, message: `Failed to parse JSON: ${err.message}` };
  }
}
