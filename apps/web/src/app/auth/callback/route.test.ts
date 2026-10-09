import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const exchangeCodeForSession = vi.fn();
const rpc = vi.fn();
vi.mock('../../../lib/supabase/server', () => ({
  maakServerClient: async () => ({ auth: { exchangeCodeForSession }, rpc }),
}));

import { GET } from './route';

const aanvraag = (query: string) =>
  GET(new NextRequest(`https://app.puntum.nl/auth/callback?${query}`));

beforeEach(() => {
  exchangeCodeForSession.mockReset();
  exchangeCodeForSession.mockResolvedValue({ error: null });
  rpc.mockReset();
  rpc.mockResolvedValue({ data: true, error: null });
});

describe('/auth/callback — waarheen na inloggen', () => {
  it('stuurt door naar het gevraagde pad binnen de app', async () => {
    const res = await aanvraag('code=c&volgende=%2Fwoning%2Fabc');
    expect(res.headers.get('location')).toBe('https://app.puntum.nl/woning/abc');
  });

  // Review 2026-10-09: `${origin}${volgende}` met volgende=@evil.com of //evil.com was een open redirect.
  it.each(['@evil.com', '//evil.com', '/\\evil.com', 'https://evil.com', 'evil.com', '/\t/evil.com', '/\n/evil.com'])(
    'geen open redirect: %s wordt /woningen',
    async (volgende) => {
      const res = await aanvraag(`code=c&volgende=${encodeURIComponent(volgende)}`);
      expect(res.headers.get('location')).toBe('https://app.puntum.nl/woningen');
    },
  );

  it('mislukte code: terug naar login met melding', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'x' } });
    const res = await aanvraag('code=c');
    expect(res.headers.get('location')).toBe('https://app.puntum.nl/login?fout=magic-link-mislukt');
  });
});

describe('/auth/callback — toestemming nieuwsbrief (pas na klikken op de link)', () => {
  it('met nieuwsbrief=1 en geldige sessie: toestemming vastgelegd', async () => {
    await aanvraag('code=c&nieuwsbrief=1');
    expect(rpc).toHaveBeenCalledWith('geef_nieuwsbrief_toestemming');
  });

  it('zonder vinkje: niets vastgelegd', async () => {
    await aanvraag('code=c');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('mislukte code: niets vastgelegd', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'x' } });
    await aanvraag('code=c&nieuwsbrief=1');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('vastleggen mislukt: inloggen gaat door, met melding in de URL (niet stil)', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boem' } });
    const res = await aanvraag('code=c&nieuwsbrief=1');
    expect(res.headers.get('location')).toBe(
      'https://app.puntum.nl/woningen?melding=nieuwsbrief-mislukt',
    );
  });
});
