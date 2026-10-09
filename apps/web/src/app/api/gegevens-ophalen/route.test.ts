import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const rpc = vi.fn();
vi.mock('../../../lib/supabase/server', () => ({
  maakServerClient: async () => ({ auth: { getUser }, rpc }),
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
const OORSPRONG_VERCEL = process.env.VERCEL_ENV;
beforeEach(() => {
  delete process.env.VERCEL_ENV;
  getUser.mockReset();
  rpc.mockReset();
  rpc.mockResolvedValue({ data: 'ok', error: null });
  haalGegevensOp.mockReset();
  haalGegevensOp.mockResolvedValue({ status: 'niet_gevonden' });
});
afterEach(() => {
  if (OORSPRONG === undefined) delete process.env.AUTH_VEREIST;
  else process.env.AUTH_VEREIST = OORSPRONG;
  if (OORSPRONG_VERCEL === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = OORSPRONG_VERCEL;
});

describe('POST /api/gegevens-ophalen — uitgeschakeld op productie zolang inloggen uit staat (review 2026-10-09)', () => {
  it('productie + AUTH_VEREIST=false: 503 met duidelijke melding, niets opgehaald', async () => {
    process.env.AUTH_VEREIST = 'false';
    process.env.VERCEL_ENV = 'production';
    const res = await POST(verzoek({ adres: 'Kleiweg 179-B', stad: 'Rotterdam' }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: 'fout', code: 'niet_beschikbaar', bericht: expect.stringContaining('nog niet beschikbaar') });
    expect(haalGegevensOp).not.toHaveBeenCalled();
  });

  it('productie met inloggen aan: werkt voor een ingelogde gebruiker', async () => {
    delete process.env.AUTH_VEREIST;
    process.env.VERCEL_ENV = 'production';
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    expect((await POST(verzoek({ adres: 'Kleiweg 179-B' }))).status).toBe(200);
  });

  it('preview/test met inloggen uit: werkt gewoon', async () => {
    process.env.AUTH_VEREIST = 'false';
    process.env.VERCEL_ENV = 'preview';
    expect((await POST(verzoek({ adres: 'Kleiweg 179-B' }))).status).toBe(200);
  });
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

// Open inschrijving (plan B5, 2026-10-09): elk nieuw account kan de route gebruiken, dus een
// daglimiet per org (registreer_ophaalactie, migratie 0008).
describe('POST /api/gegevens-ophalen — daglimiet per org', () => {
  beforeEach(() => {
    delete process.env.AUTH_VEREIST;
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  });

  it('registreert elke geldige aanvraag met de daglimiet', async () => {
    await POST(verzoek({ adres: 'Kleiweg 179-B' }));
    expect(rpc).toHaveBeenCalledWith('registreer_ophaalactie', { p_limiet: 50 });
    expect(haalGegevensOp).toHaveBeenCalledOnce();
  });

  it('limiet bereikt: 429 met melding, niets opgehaald', async () => {
    rpc.mockResolvedValue({ data: 'limiet', error: null });
    const res = await POST(verzoek({ adres: 'Kleiweg 179-B' }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ status: 'fout', code: 'daglimiet', bericht: expect.stringContaining('50') });
    expect(haalGegevensOp).not.toHaveBeenCalled();
  });

  it('ingelogd zonder org: 403, niets opgehaald', async () => {
    rpc.mockResolvedValue({ data: 'geen_org', error: null });
    expect((await POST(verzoek({ adres: 'Kleiweg 179-B' }))).status).toBe(403);
    expect(haalGegevensOp).not.toHaveBeenCalled();
  });

  it('teller onbereikbaar (bijv. migratie nog niet gedraaid): fail closed, 503', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'function registreer_ophaalactie does not exist' } });
    const res = await POST(verzoek({ adres: 'Kleiweg 179-B' }));
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain('does not exist');
    expect(haalGegevensOp).not.toHaveBeenCalled();
  });

  it('ongeldige invoer telt niet mee', async () => {
    await POST(verzoek({ adres: '' }));
    expect(rpc).not.toHaveBeenCalled();
  });

  it('AUTH_VEREIST=false (lokaal): geen teller, er is geen sessie', async () => {
    process.env.AUTH_VEREIST = 'false';
    expect((await POST(verzoek({ adres: 'Kleiweg 179-B' }))).status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });
});
