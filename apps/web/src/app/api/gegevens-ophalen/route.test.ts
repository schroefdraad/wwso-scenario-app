import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
vi.mock('../../../lib/supabase/server', () => ({
  maakServerClient: async () => ({ auth: { getUser } }),
}));
const haalGegevensOp = vi.fn();
vi.mock('../../../lib/invoer/gegevensOphalenServer', async (orig) => ({
  ...(await orig<typeof import('../../../lib/invoer/gegevensOphalenServer')>()),
  haalGegevensOp: (...a: unknown[]) => haalGegevensOp(...a),
}));

import { POST } from './route';

const verzoek = (body: unknown) =>
  new Request('http://localhost/api/gegevens-ophalen', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

const OORSPRONG = process.env.AUTH_VEREIST;
beforeEach(() => {
  getUser.mockReset();
  haalGegevensOp.mockReset();
  haalGegevensOp.mockResolvedValue({ status: 'niet_gevonden' });
});
afterEach(() => {
  if (OORSPRONG === undefined) delete process.env.AUTH_VEREIST;
  else process.env.AUTH_VEREIST = OORSPRONG;
});

describe('POST /api/gegevens-ophalen — beveiliging', () => {
  it('zonder AUTH_VEREIST (productie-standaard): niet ingelogd = 401 en er wordt niets opgehaald', async () => {
    delete process.env.AUTH_VEREIST;
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(verzoek({ adres: 'Kleiweg 179-B', stad: 'Rotterdam' }));
    expect(res.status).toBe(401);
    expect(haalGegevensOp).not.toHaveBeenCalled();
  });

  it('AUTH_VEREIST=true: ook 401 zonder sessie', async () => {
    process.env.AUTH_VEREIST = 'true';
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(verzoek({ adres: 'Kleiweg 179-B' }))).status).toBe(401);
  });

  it('een fout bij het controleren van de sessie telt als niet ingelogd (fail closed)', async () => {
    delete process.env.AUTH_VEREIST;
    getUser.mockRejectedValue(new Error('supabase weg'));
    expect((await POST(verzoek({ adres: 'Kleiweg 179-B' }))).status).toBe(401);
    expect(haalGegevensOp).not.toHaveBeenCalled();
  });

  it('ingelogd: de aanvraag wordt uitgevoerd', async () => {
    delete process.env.AUTH_VEREIST;
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const res = await POST(verzoek({ adres: 'Kleiweg 179-B', stad: 'Rotterdam' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'niet_gevonden' });
    expect(haalGegevensOp).toHaveBeenCalledOnce();
  });

  it('AUTH_VEREIST=false (lokaal, zoals de rest van de app): geen sessie nodig', async () => {
    process.env.AUTH_VEREIST = 'false';
    const res = await POST(verzoek({ adres: 'Kleiweg 179-B', stad: 'Rotterdam' }));
    expect(res.status).toBe(200);
    expect(getUser).not.toHaveBeenCalled();
  });
});

describe('POST /api/gegevens-ophalen — invoer', () => {
  beforeEach(() => {
    process.env.AUTH_VEREIST = 'false';
  });

  it('ongeldige invoer: 400, niets opgehaald', async () => {
    for (const b of ['geen json', {}, { adres: '' }, { nummeraanduidingId: 'x' }]) {
      expect((await POST(verzoek(b))).status).toBe(400);
    }
    expect(haalGegevensOp).not.toHaveBeenCalled();
  });

  it('een onverwachte fout wordt een nette foutmelding, geen stacktrace', async () => {
    haalGegevensOp.mockRejectedValue(new Error('boem'));
    const res = await POST(verzoek({ adres: 'Kleiweg 179-B' }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('boem');
  });
});
