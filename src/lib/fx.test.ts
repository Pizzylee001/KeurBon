import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FX_RATE_XOF_PER_BTC } from '../data/demoVendors';
import {
  SATS_PER_BTC,
  XOF_PER_EUR_FIXED_PEG,
  clearFxCache,
  fetchLiveBtcXofRate,
  fetchLiveXofPerBtc,
  formatSats,
  formatXof,
  fxService,
  satsToXof,
  xofToSats,
} from './fx';

describe('fxService and FCFA/sats conversion math', () => {
  afterEach(() => {
    clearFxCache();
    vi.restoreAllMocks();
  });

  it('converts XOF (FCFA) to satoshis with exact integer rounding', () => {
    const rate = 62_000_000; // 62,000,000 XOF per 1 BTC -> 620 XOF per 1,000 sats
    expect(xofToSats(620, rate)).toBe(1000);
    expect(xofToSats(15_000, rate)).toBe(Math.round((15_000 / rate) * SATS_PER_BTC));
    expect(xofToSats(0.1, rate)).toBe(1); // minimum 1 sat for positive XOF
  });

  it('converts satoshis to XOF (FCFA) with exact integer rounding', () => {
    const rate = 62_000_000;
    expect(satsToXof(1000, rate)).toBe(620);
    expect(satsToXof(100_000_000, rate)).toBe(62_000_000);
    expect(satsToXof(1, rate)).toBe(1);
  });

  it('guards against zero, negative, NaN, and Infinity inputs', () => {
    expect(xofToSats(0, DEFAULT_FX_RATE_XOF_PER_BTC)).toBe(0);
    expect(xofToSats(-5000, DEFAULT_FX_RATE_XOF_PER_BTC)).toBe(0);
    expect(xofToSats(Number.NaN, DEFAULT_FX_RATE_XOF_PER_BTC)).toBe(0);
    expect(xofToSats(Number.POSITIVE_INFINITY, DEFAULT_FX_RATE_XOF_PER_BTC)).toBe(0);
    expect(xofToSats(5000, 0)).toBe(0);
    expect(xofToSats(5000, -100)).toBe(0);
    expect(xofToSats(5000, Number.NaN)).toBe(0);

    expect(satsToXof(0, DEFAULT_FX_RATE_XOF_PER_BTC)).toBe(0);
    expect(satsToXof(-100, DEFAULT_FX_RATE_XOF_PER_BTC)).toBe(0);
    expect(satsToXof(Number.NaN, DEFAULT_FX_RATE_XOF_PER_BTC)).toBe(0);
    expect(satsToXof(1000, 0)).toBe(0);
    expect(satsToXof(1000, Number.NaN)).toBe(0);
  });

  it('formats FCFA and sats strings cleanly in French and English', () => {
    expect(formatXof(15000, 'fr')).toContain('FCFA');
    expect(formatXof(15000, 'en')).toBe('15,000 FCFA');
    expect(formatSats(24194, 'en')).toBe('24,194 sats');
    expect(formatXof(Number.NaN, 'en')).toBe('0 FCFA');
  });

  it('fetches live BTC/XOF rate from CoinGecko and caches it', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          bitcoin: {
            xof: 64_500_000,
            eur: 98_329,
            usd: 105_200,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const snapshot = await fetchLiveBtcXofRate();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(snapshot.source).toBe('live');
    expect(snapshot.xofPerBtc).toBe(64_500_000);
    expect(snapshot.rateXofPerBtc).toBe(64_500_000);
    expect(snapshot.satsPerThousandXof).toBe(xofToSats(1000, 64_500_000));

    // If next call fails, it should fall back to the cached live rate
    fetchSpy.mockRejectedValueOnce(new Error('Network offline'));
    const fallbackSnapshot = await fetchLiveXofPerBtc();
    expect(fallbackSnapshot.source).toBe('fallback');
    expect(fallbackSnapshot.xofPerBtc).toBe(64_500_000);
  });

  it('derives BTC/XOF from EUR fixed peg (655.957) when CoinGecko omits xof field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          bitcoin: {
            eur: 95_000,
            usd: 101_000,
          },
        }),
        { status: 200 }
      )
    );

    const snapshot = await fxService.fetchLiveBtcXofRate();
    expect(snapshot.source).toBe('live');
    expect(snapshot.xofPerBtc).toBe(Math.round(95_000 * XOF_PER_EUR_FIXED_PEG));
  });

  it('falls back cleanly to DEFAULT_FX_RATE_XOF_PER_BTC when offline with empty cache', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Timeout'));
    const snapshot = await fxService.fetchLiveXofPerBtc();
    expect(snapshot.source).toBe('fallback');
    expect(snapshot.xofPerBtc).toBe(DEFAULT_FX_RATE_XOF_PER_BTC);
  });
});
