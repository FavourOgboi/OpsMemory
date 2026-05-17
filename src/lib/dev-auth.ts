/**
 * Dev-mode JWT for dashboard API calls (APP_ENV=development skips signature verify).
 */
const DEMO_BUSINESS_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const pad = (4 - (b64.length % 4)) % 4;
  return b64 + '='.repeat(pad);
}

export function createDevJwt(role: 'ceo' | 'sales' | 'finance' = 'ceo'): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: 'demo-owner-001',
      email: 'demo@opsmemory.app',
      public_metadata: {
        business_id: DEMO_BUSINESS_ID,
        role,
      },
    }),
  );
  // Valid base64url segment (python-jose still parses the signature part in dev)
  const signature = base64UrlEncode('opsmemory-dev-signature');
  return `${header}.${payload}.${signature}`;
}

export function installDevAuth(role: 'ceo' | 'sales' | 'finance' = 'ceo'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('opsmemory-demo-token', createDevJwt(role));
  localStorage.setItem('opsmemory-demo-role', role);
}

/** WhatsApp test customer created from your phone number */
export const WHATSAPP_TEST_CUSTOMER_ID = '6a8908d4-48e3-49c5-a765-ec25904d1cf5';
