import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

beforeEach(() => {
  vi.resetModules();
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: null } });
  delete process.env.AUTH_VEREIST;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x';
});

const proxyVoor = async (pad: string, method = 'GET') => {
  const { proxy } = await import('./proxy');
  return proxy(new NextRequest(`http://localhost${pad}`, { method }));
};

describe('proxy — niet ingelogd (review 2026-10-09)', () => {
  it('een pagina stuurt door naar /login', async () => {
    const res = await proxyVoor('/woningen');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('een API-route krijgt 401 met JSON, geen redirect naar /login (fetch kan een redirect niet duiden)', async () => {
    const res = await proxyVoor('/api/gegevens-ophalen', 'POST');
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      status: 'fout',
      bericht: expect.stringContaining('ingelogd'),
    });
  });

  it('privacyverklaring en voorwaarden zijn openbaar (open inschrijving, 2026-10-09)', async () => {
    expect((await proxyVoor('/privacy')).status).toBe(200);
    expect((await proxyVoor('/voorwaarden')).status).toBe(200);
  });

  it('een pad dat alleen met "privacy" begint is niet openbaar', async () => {
    expect((await proxyVoor('/privacyx')).status).toBe(307);
  });

  it('ingelogd: een API-route gaat gewoon door', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const res = await proxyVoor('/api/gegevens-ophalen', 'POST');
    expect(res.status).toBe(200);
  });
});
