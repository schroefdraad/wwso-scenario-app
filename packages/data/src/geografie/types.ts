import { z } from 'zod';

export const GemeenteCorop = z.object({
  gemeente: z.string().min(1),
  /** Moet exact overeenkomen met een `gebied`-waarde uit de tarieven-COROP-lijst (zie
   * `tarieven/2026-01-01/corop_2026-01-01.json`) — gevalideerd bij het laden, zie `index.ts`. */
  coropGebied: z.string().min(1),
});
export type GemeenteCorop = z.infer<typeof GemeenteCorop>;

export const WoonplaatsGemeenten = z.object({
  woonplaats: z.string().min(1),
  /** Eén gemeente in het gewone geval; meerdere als de plaatsnaam in meer dan één gemeente
   * voorkomt — de gebruiker kiest dan zelf (zie `PandFormulier.tsx`). */
  gemeenten: z.array(z.string().min(1)).min(1),
});
export type WoonplaatsGemeenten = z.infer<typeof WoonplaatsGemeenten>;
