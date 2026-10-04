import { describe, expect, it } from 'vitest';
import { bepaalOmgeving, omgevingLabel } from './omgeving';

describe('bepaalOmgeving', () => {
  it('herkent productie, test en lokaal aan VERCEL_ENV', () => {
    expect(bepaalOmgeving('production')).toBe('productie');
    expect(bepaalOmgeving('preview')).toBe('test');
    expect(bepaalOmgeving('development')).toBe('lokaal');
  });

  it('valt zonder VERCEL_ENV terug op lokaal, nooit op productie', () => {
    expect(bepaalOmgeving(undefined)).toBe('lokaal');
    expect(bepaalOmgeving('')).toBe('lokaal');
  });
});

describe('omgevingLabel', () => {
  it('is leeg op productie en zichtbaar daarbuiten', () => {
    expect(omgevingLabel('productie')).toBe('');
    expect(omgevingLabel('test')).toBe('TEST');
    expect(omgevingLabel('lokaal')).toBe('LOKAAL');
  });
});
