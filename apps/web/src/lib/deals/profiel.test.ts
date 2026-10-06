import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const maybeSingle = vi.fn();

vi.mock('../supabase/client', () => ({
  supabase: {
    auth: { getUser: () => getUser() },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => maybeSingle() }) }) }),
  },
}));

const { haalEigenProfielOp } = await import('./profiel');

// Productie-switch (plan 2026-10-06, keuze K1a): inloggen is verplicht, dus "geen sessie" kan
// alleen nog een verlopen sessie zijn. Dat is onzekerheid (blokkeren met uitleg), geen
// bewerkrecht — de tijdelijke ANONIEM-regel (incident 2026-10-03) is weg.
describe('haalEigenProfielOp', () => {
  beforeEach(() => {
    getUser.mockReset();
    maybeSingle.mockReset();
  });

  it('zonder sessie: fout "sessie verlopen", nooit bewerkrechten', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(haalEigenProfielOp()).rejects.toThrow(/sessie is verlopen/);
  });

  it('ingelogd en op de allowlist: profiel', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'Emma@Morrison-Media.nl' } } });
    maybeSingle.mockResolvedValue({
      data: { org_id: 'org-1', is_eigenaar: false, features: ['delen'] },
      error: null,
    });
    await expect(haalEigenProfielOp()).resolves.toEqual({
      email: 'Emma@Morrison-Media.nl',
      orgId: 'org-1',
      isEigenaar: false,
      features: ['delen'],
    });
  });

  it('ingelogd maar niet op de allowlist: null (geen rechten)', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'onbekend@voorbeeld.nl' } } });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(haalEigenProfielOp()).resolves.toBeNull();
  });
});
