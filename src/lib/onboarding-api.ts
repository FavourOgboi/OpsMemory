/**
 * Persist onboarding form data to the backend (businesses + knowledge_base).
 */

export type OnboardingPayload = {
  step: number;
  business_name?: string;
  owner_name?: string;
  business_type?: string;
  city?: string;
  website_url?: string | null;
  instagram_handle?: string | null;
  other_link?: string | null;
  whatsapp_number?: string | null;
  catalog_url?: string | null;
  business_description?: string | null;
  products_text?: string | null;
  deal_threshold?: number;
  auto_reply_enabled?: boolean;
  agent_languages?: string[];
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('opsmemory-token') ||
    localStorage.getItem('opsmemory-demo-token')
  );
}

export function buildOnboardingPayload(
  state: Record<string, unknown>,
  step: number,
): OnboardingPayload {
  return {
    step,
    business_name: (state.businessName as string) || undefined,
    owner_name: (state.ownerName as string) || undefined,
    business_type: (state.businessType as string) || undefined,
    city: (state.city as string) || undefined,
    website_url: (state.websiteUrl as string) || null,
    instagram_handle: (state.instagramHandle as string) || null,
    other_link: (state.otherLink as string) || null,
    whatsapp_number: (state.whatsappNumber as string) || null,
    catalog_url: (state.catalogUrl as string) || null,
    business_description: (state.businessDescription as string) || null,
    products_text: (state.productsText as string) || null,
    deal_threshold: (state.dealThreshold as number) ?? 100000,
    auto_reply_enabled: (state.autoReplyEnabled as boolean) ?? true,
    agent_languages: (state.agentLanguages as string[]) || ['english', 'pidgin'],
  };
}

export async function saveOnboardingProgress(
  state: Record<string, unknown>,
  step: number,
): Promise<{ business_id?: string; knowledge_synced?: boolean }> {
  const token = getToken();
  const res = await fetch('/api/onboarding/save-progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(buildOnboardingPayload(state, step)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || 'Failed to save progress');
  }
  return data;
}

export async function completeOnboarding(
  state: Record<string, unknown>,
): Promise<{ business_id?: string; knowledge_indexed?: Record<string, number> }> {
  const token = getToken();
  const res = await fetch('/api/onboarding/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(buildOnboardingPayload(state, 6)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || 'Failed to complete onboarding');
  }
  return data;
}

export async function uploadCatalogPdf(file: File): Promise<{ chunks_stored?: number }> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  form.append('category', 'catalog');
  const res = await fetch('/api/knowledge/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || 'Catalog upload failed');
  }
  return data;
}
