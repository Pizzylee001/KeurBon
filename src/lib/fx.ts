import { DEFAULT_FX_RATE_XOF_PER_BTC } from '../data/demoVendors';
import type { FxConversionService, FxRateSnapshot, Language } from '../types/keurbon';

export const SATS_PER_BTC = 100_000_000;
export const XOF_PER_EUR_FIXED_PEG = 655.957;
export const FX_CACHE_STORAGE_KEY = 'keurbon_fx_cache_v1';
export const COINGECKO_BTC_FX_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=xof,usd,eur';

export interface ExtendedFxRateSnapshot extends FxRateSnapshot {
  rateXofPerBtc: number;
  usdPerBtc?: number;
  eurPerBtc?: number;
}

let memoryCachedRateXofPerBtc: number | null = null;
let memoryCachedUpdatedAt: number | null = null;

function readCachedFxRate(): { xofPerBtc: number; updatedAt: number } | null {
  if (memoryCachedRateXofPerBtc && memoryCachedRateXofPerBtc > 0) {
    return {
      xofPerBtc: memoryCachedRateXofPerBtc,
      updatedAt: memoryCachedUpdatedAt ?? Math.floor(Date.now() / 1000),
    };
  }
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(FX_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { xofPerBtc?: unknown; updatedAt?: unknown };
    if (
      typeof parsed.xofPerBtc === 'number' &&
      Number.isFinite(parsed.xofPerBtc) &&
      parsed.xofPerBtc > 0
    ) {
      const updatedAt =
        typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
          ? parsed.updatedAt
          : Math.floor(Date.now() / 1000);
      memoryCachedRateXofPerBtc = parsed.xofPerBtc;
      memoryCachedUpdatedAt = updatedAt;
      return { xofPerBtc: parsed.xofPerBtc, updatedAt };
    }
    return null;
  } catch {
    return null;
  }
}

function writeCachedFxRate(xofPerBtc: number, updatedAt: number): void {
  memoryCachedRateXofPerBtc = xofPerBtc;
  memoryCachedUpdatedAt = updatedAt;
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(
      FX_CACHE_STORAGE_KEY,
      JSON.stringify({ xofPerBtc, updatedAt })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function clearFxCache(): void {
  memoryCachedRateXofPerBtc = null;
  memoryCachedUpdatedAt = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(FX_CACHE_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}

export function xofToSats(
  amountXof: number,
  xofPerBtc = DEFAULT_FX_RATE_XOF_PER_BTC
): number {
  if (
    !Number.isFinite(amountXof) ||
    !Number.isFinite(xofPerBtc) ||
    amountXof <= 0 ||
    xofPerBtc <= 0
  ) {
    return 0;
  }
  return Math.max(1, Math.round((amountXof / xofPerBtc) * SATS_PER_BTC));
}

export function satsToXof(
  amountSats: number,
  xofPerBtc = DEFAULT_FX_RATE_XOF_PER_BTC
): number {
  if (
    !Number.isFinite(amountSats) ||
    !Number.isFinite(xofPerBtc) ||
    amountSats <= 0 ||
    xofPerBtc <= 0
  ) {
    return 0;
  }
  return Math.max(1, Math.round((amountSats / SATS_PER_BTC) * xofPerBtc));
}

export function formatXof(amountXof: number, lang: Language = 'fr'): string {
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  const safeAmount = Number.isFinite(amountXof) ? Math.round(amountXof) : 0;
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(safeAmount)} FCFA`;
}

export function formatSats(amountSats: number, lang: Language = 'fr'): string {
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  const safeAmount = Number.isFinite(amountSats) ? Math.round(amountSats) : 0;
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(safeAmount)} sats`;
}

export async function fetchLiveBtcXofRate(
  timeoutMs = 5000
): Promise<ExtendedFxRateSnapshot> {
  const nowSec = Math.floor(Date.now() / 1000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(COINGECKO_BTC_FX_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`FX HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      bitcoin?: {
        xof?: number;
        eur?: number;
        usd?: number;
      };
    };

    const btc = payload?.bitcoin;
    let resolvedXofPerBtc = 0;

    if (typeof btc?.xof === 'number' && Number.isFinite(btc.xof) && btc.xof > 0) {
      resolvedXofPerBtc = Math.round(btc.xof);
    } else if (typeof btc?.eur === 'number' && Number.isFinite(btc.eur) && btc.eur > 0) {
      resolvedXofPerBtc = Math.round(btc.eur * XOF_PER_EUR_FIXED_PEG);
    } else if (typeof btc?.usd === 'number' && Number.isFinite(btc.usd) && btc.usd > 0) {
      resolvedXofPerBtc = Math.round(btc.usd * 605);
    }

    if (resolvedXofPerBtc <= 0) {
      throw new Error('Invalid CoinGecko BTC/XOF rate payload');
    }

    writeCachedFxRate(resolvedXofPerBtc, nowSec);

    return {
      xofPerBtc: resolvedXofPerBtc,
      rateXofPerBtc: resolvedXofPerBtc,
      satsPerThousandXof: xofToSats(1000, resolvedXofPerBtc),
      source: 'live',
      updatedAt: nowSec,
      usdPerBtc: typeof btc?.usd === 'number' ? btc.usd : undefined,
      eurPerBtc: typeof btc?.eur === 'number' ? btc.eur : undefined,
    };
  } catch {
    const cached = readCachedFxRate();
    const fallbackRate = cached?.xofPerBtc ?? DEFAULT_FX_RATE_XOF_PER_BTC;
    const fallbackUpdatedAt = cached?.updatedAt ?? nowSec;
    return {
      xofPerBtc: fallbackRate,
      rateXofPerBtc: fallbackRate,
      satsPerThousandXof: xofToSats(1000, fallbackRate),
      source: 'fallback',
      updatedAt: fallbackUpdatedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLiveXofPerBtc(): Promise<ExtendedFxRateSnapshot> {
  return fetchLiveBtcXofRate(5000);
}

export interface ExtendedFxConversionService extends FxConversionService {
  fetchLiveBtcXofRate(timeoutMs?: number): Promise<ExtendedFxRateSnapshot>;
}

export const fxService: ExtendedFxConversionService = {
  fetchLiveXofPerBtc,
  fetchLiveBtcXofRate,
  xofToSats,
  satsToXof,
  formatXof,
  formatSats,
};
