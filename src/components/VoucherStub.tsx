import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useKeurBonStore } from '../state/store';
import type { PurposeCategory, VoucherStatus } from '../types/keurbon';
import {
  AlertTriangleIcon,
  CategoryIcon,
  CheckCircleIcon,
  ClockLockIcon,
  CopyIcon,
  KeyIcon,
  LockSealIcon,
  PrintIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  StoreCounterIcon,
} from './Icons';

export interface VoucherStubProps {
  serialCode?: string;
  amountXof: number;
  amountSats: number;
  purpose: PurposeCategory;
  vendorName: string;
  vendorDistrict: string;
  vendorNpub: string;
  vendorPubkeyHex?: string;
  senderNpub?: string;
  locktimeUnix: number;
  status: VoucherStatus;
  token?: string;
  tokenHash?: string;
  mintUrl?: string;
  dleqVerified?: boolean;
  nostrReceiptEventId?: string;
  memo?: string;
  /** Increment or change this key when a fresh NUT-11 lock or NUT-12 verification occurs to trigger the Lock-Snap Seal animation */
  sealTriggerKey?: string | number;
  onTestAtCounter?: (token: string) => void;
  onReclaimExpired?: () => void;
  showActions?: boolean;
}

export function truncateIdentifier(value: string, head = 12, tail = 8): string {
  if (!value) return '';
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatXofAmount(amountXof: number, lang: 'fr' | 'en'): string {
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(Math.round(amountXof))} FCFA`;
}

export function formatSatsAmount(amountSats: number, lang: 'fr' | 'en'): string {
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(Math.round(amountSats))} sats`;
}

export function formatLocktimeWindow(locktimeUnix: number, nowSec: number, lang: 'fr' | 'en'): {
  formattedDate: string;
  countdownLabel: string;
  isExpired: boolean;
} {
  const isExpired = locktimeUnix <= nowSec;
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(locktimeUnix * 1000));

  const diffSec = locktimeUnix - nowSec;
  if (diffSec <= 0) {
    const elapsedMin = Math.max(1, Math.floor(Math.abs(diffSec) / 60));
    return {
      formattedDate,
      countdownLabel:
        lang === 'fr'
          ? `Expiré depuis ${elapsedMin} min`
          : `Expired ${elapsedMin}m ago`,
      isExpired: true,
    };
  }

  if (diffSec < 120) {
    return {
      formattedDate,
      countdownLabel: lang === 'fr' ? `${diffSec}s restantes` : `${diffSec}s remaining`,
      isExpired: false,
    };
  }

  const hours = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return {
      formattedDate,
      countdownLabel:
        lang === 'fr'
          ? `${days}j ${remHours}h restantes`
          : `${days}d ${remHours}h remaining`,
      isExpired: false,
    };
  }

  return {
    formattedDate,
    countdownLabel:
      lang === 'fr'
        ? `${hours}h ${mins}m restantes`
        : `${hours}h ${mins}m remaining`,
    isExpired: false,
  };
}

export function VoucherStub({
  serialCode = 'KB-DKR-2026-01',
  amountXof,
  amountSats,
  purpose,
  vendorName,
  vendorDistrict,
  vendorNpub,
  senderNpub,
  locktimeUnix,
  status,
  token,
  tokenHash,
  mintUrl = 'https://testnut.cashu.space',
  dleqVerified = false,
  nostrReceiptEventId,
  memo,
  sealTriggerKey,
  onTestAtCounter,
  onReclaimExpired,
  showActions = true,
}: VoucherStubProps) {
  const { language, t, pushToast } = useKeurBonStore();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrIsReference, setQrIsReference] = useState<boolean>(false);
  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!token || status === 'draft') {
      setQrDataUrl(null);
      setQrIsReference(false);
      return;
    }

    const qrOpts = {
      errorCorrectionLevel: 'L' as const,
      margin: 2,
      width: 176,
      color: {
        dark: '#0E1E2B',
        light: '#FAFBF9',
      },
    };

    const generateReferenceQr = () => {
      const compactPayload = JSON.stringify({
        p: 'keurbon.v1',
        s: serialCode,
        h: (tokenHash || '').slice(0, 64),
        sats: amountSats,
        v: vendorNpub,
      });
      return QRCode.toDataURL(compactPayload, {
        ...qrOpts,
        errorCorrectionLevel: 'M',
      }).then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setQrIsReference(true);
        }
      });
    };

    if (token.length > 2200) {
      generateReferenceQr().catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          setQrIsReference(false);
        }
      });
    } else {
      QRCode.toDataURL(token, qrOpts)
        .then((url) => {
          if (!cancelled) {
            setQrDataUrl(url);
            setQrIsReference(false);
          }
        })
        .catch(() => {
          generateReferenceQr().catch(() => {
            if (!cancelled) {
              setQrDataUrl(null);
              setQrIsReference(false);
            }
          });
        });
    }

    return () => {
      cancelled = true;
    };
  }, [token, status, serialCode, tokenHash, amountSats, vendorNpub]);

  const locktimeInfo = formatLocktimeWindow(locktimeUnix, nowSec, language);
  const effectiveStatus: VoucherStatus =
    status === 'locked' && locktimeInfo.isExpired ? 'expired' : status;

  const handleCopyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      pushToast({
        tone: 'success',
        title: t.stub.copiedTokenToast,
        detail: truncateIdentifier(token, 18, 10),
      });
    } catch {
      pushToast({
        tone: 'info',
        title: t.stub.copyTokenButton,
        detail: truncateIdentifier(token, 18, 10),
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isLockedOrSettled =
    effectiveStatus === 'locked' || effectiveStatus === 'redeemed';

  return (
    <article
      key={sealTriggerKey ? `stub-${sealTriggerKey}` : undefined}
      aria-label={`${t.stub.voucherHeaderPrefix} ${serialCode}`}
      className={`kb-voucher-stub relative overflow-hidden text-[#0E1E2B] ${
        sealTriggerKey ? 'kb-animate-stub-settle' : ''
      }`}
    >
      {/* Top Security Band: Crisp Geometric SVG Guilloche Weave */}
      <div className="relative h-[14px] w-full overflow-hidden border-b border-[#CFD8D4] bg-[#FAFBF9]">
        <svg
          width="100%"
          height="14"
          viewBox="0 0 600 14"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="block h-full w-full"
        >
          <defs>
            <pattern
              id="keurbon-guilloche-pattern"
              width="24"
              height="14"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 7 C6 1, 18 1, 24 7 C18 13, 6 13, 0 7 Z"
                fill="none"
                stroke="#0C5C44"
                strokeOpacity="0.18"
                strokeWidth="1.1"
              />
              <path
                d="M-12 7 C-6 1, 6 1, 12 7 C6 13, -6 13, -12 7 Z M12 7 C18 1, 30 1, 36 7 C30 13, 18 13, 12 7 Z"
                fill="none"
                stroke="#D98218"
                strokeOpacity="0.18"
                strokeWidth="1.1"
              />
            </pattern>
          </defs>
          <rect width="600" height="14" fill="url(#keurbon-guilloche-pattern)" />
        </svg>
      </div>

      {/* Upper Body: Voucher Value & Vendor Lock */}
      <div className="p-5 sm:p-6">
        {/* Header Metadata Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CFD8D4] pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-[#E5F2ED] text-[#0C5C44]">
              <CategoryIcon category={purpose} size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-tight text-[#3D515F]">
                {t.stub.voucherHeaderPrefix} · {t.categories[purpose]}
              </p>
            </div>
          </div>
          <span
            translate="no"
            className="font-mono text-xs font-medium text-[#4C616F] tabular-nums"
          >
            {t.stub.serialLabel}: {serialCode}
          </span>
        </div>

        {/* Face Value in FCFA & Sats */}
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#4C616F]">
              {t.stub.faceValueLabel}
            </p>
            <p
              translate="no"
              className="type-data-hero mt-0.5 text-[#0E1E2B] tabular-nums"
            >
              {formatXofAmount(amountXof, language)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold text-[#4C616F]">
              {t.stub.satsEquivalentLabel}
            </p>
            <p
              translate="no"
              className="font-mono text-lg font-semibold text-[#9B5305] tabular-nums"
            >
              {formatSatsAmount(amountSats, language)}
            </p>
          </div>
        </div>

        {/* Designated Dakar Vendor Lock Box */}
        <div className="mt-4 rounded-[8px] border border-[#CFD8D4] bg-[#F1F4F2]/75 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#3D515F]">
                {t.stub.beneficiaryVendorLabel}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-base font-semibold text-[#0E1E2B]">
                <StoreCounterIcon size={16} className="shrink-0 text-[#0C5C44]" />
                <span className="truncate">{vendorName}</span>
              </p>
              <p className="text-xs text-[#4C616F]">{vendorDistrict}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[6px] border border-[#CFD8D4] bg-[#FAFBF9] px-2 py-1 font-mono text-xs font-medium text-[#0E1E2B]">
              <KeyIcon size={13} className="text-[#0C5C44]" />
              NUT-11
            </span>
          </div>

          <div className="mt-2.5 border-t border-[#CFD8D4] pt-2">
            <p className="text-[11px] font-semibold text-[#4C616F]">
              {t.stub.vendorNpubLabel}
            </p>
            <p
              translate="no"
              className="type-data-row mt-0.5 text-xs text-[#0E1E2B]"
            >
              {truncateIdentifier(vendorNpub, 18, 12)}
            </p>
          </div>
        </div>

        {memo ? (
          <p className="mt-3 text-xs text-[#3D515F]">
            <span className="font-semibold text-[#0E1E2B]">Note :</span> {memo}
          </p>
        ) : null}
      </div>

      {/* Physical Perforation Divider with Semicircular Cutout Notches */}
      <div
        aria-hidden="true"
        className="relative flex h-6 w-full items-center justify-between"
      >
        <span className="-ml-3.5 size-6 shrink-0 rounded-full border border-[#CFD8D4] bg-[#F1F4F2]" />
        <div className="mx-1 w-full border-t border-dashed border-[#637683]" />
        <span className="-mr-3.5 size-6 shrink-0 rounded-full border border-[#CFD8D4] bg-[#F1F4F2]" />
      </div>

      {/* Lower Body: Cryptographic Proof, Lock-Snap Seal, QR Code & Refund Stub */}
      <div className="px-5 pt-2 pb-5 sm:px-6 sm:pb-6">
        {/* Cryptographic Lock-Snap Seal Banner */}
        <div className="relative">
          {isLockedOrSettled && sealTriggerKey ? (
            <span
              aria-hidden="true"
              className="kb-animate-seal-ring pointer-events-none absolute inset-0 rounded-[8px] border-2 border-[#0C5C44]"
            />
          ) : null}

          {effectiveStatus === 'locked' && (
            <div className="kb-animate-seal flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#0C5C44] bg-[#E5F2ED] px-3.5 py-2.5 text-[#0C5C44]">
              <div className="flex items-center gap-2">
                <LockSealIcon size={18} className="shrink-0" />
                <span className="text-xs font-bold tracking-tight">
                  {t.stub.nut11SealLocked}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold">
                <ShieldCheckIcon size={15} />
                {dleqVerified ? 'NUT-12 DLEQ OK' : 'P2PK'}
              </span>
            </div>
          )}

          {effectiveStatus === 'redeemed' && (
            <div className="kb-animate-seal flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#0C5C44] bg-[#E5F2ED] px-3.5 py-2.5 text-[#0C5C44]">
              <div className="flex items-center gap-2">
                <CheckCircleIcon size={18} className="shrink-0" />
                <span className="text-xs font-bold tracking-tight">
                  {t.stub.nut11SealRedeemed}
                </span>
              </div>
              <span className="font-mono text-xs font-semibold">
                Nostr 30078
              </span>
            </div>
          )}

          {effectiveStatus === 'expired' && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#9B5305] bg-[#FBF2E6] px-3.5 py-2.5 text-[#9B5305]">
              <div className="flex items-center gap-2">
                <ClockLockIcon size={18} className="shrink-0" />
                <span className="text-xs font-bold tracking-tight">
                  {t.stub.nut11SealExpired}
                </span>
              </div>
              {onReclaimExpired ? (
                <button
                  type="button"
                  onClick={onReclaimExpired}
                  className="kb-pressable rounded-[6px] bg-[#9B5305] px-2.5 py-1 text-xs font-semibold text-[#FAFBF9] hover:bg-[#844604]"
                >
                  {t.ledger.actionReclaimSats}
                </button>
              ) : null}
            </div>
          )}

          {effectiveStatus === 'refunded' && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#637683] bg-[#E3E9E5] px-3.5 py-2.5 text-[#0E1E2B]">
              <div className="flex items-center gap-2">
                <CheckCircleIcon size={18} className="shrink-0 text-[#0C5C44]" />
                <span className="text-xs font-bold tracking-tight">
                  {t.stub.nut11SealRefunded}
                </span>
              </div>
              <span className="font-mono text-xs font-medium text-[#3D515F]">
                NUT-07 SPENT
              </span>
            </div>
          )}

          {effectiveStatus === 'draft' && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-dashed border-[#637683] bg-[#F1F4F2] px-3.5 py-2.5 text-[#3D515F]">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon size={17} className="shrink-0 text-[#9B5305]" />
                <span className="text-xs font-semibold">
                  {t.stub.nut11SealDraft}
                </span>
              </div>
              <span className="font-mono text-xs text-[#4C616F]">
                {t.statuses.draft}
              </span>
            </div>
          )}
        </div>

        {/* QR Code & Cryptographic Metadata Split */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[148px_1fr] lg:items-center">
          <div className="flex flex-col items-center justify-center">
            {qrDataUrl && effectiveStatus !== 'draft' ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="rounded-[8px] border border-black/10 bg-[#FAFBF9] p-2">
                  <img
                    src={qrDataUrl}
                    alt={t.stub.qrAltText}
                    width={132}
                    height={132}
                    className="block size-[132px]"
                  />
                </div>
                {qrIsReference ? (
                  <span className="max-w-[148px] text-center text-[10px] leading-tight text-[#4C616F]">
                    {language === 'fr'
                      ? 'QR référence · Jeton complet par copie'
                      : 'Ref QR · Full token via copy'}
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="flex size-[148px] flex-col items-center justify-center rounded-[8px] border border-dashed border-[#CFD8D4] bg-[#F1F4F2]/60 p-3 text-center">
                <QrCodeIcon size={28} className="text-[#4C616F]" />
                <p className="mt-2 text-[11px] leading-snug text-[#4C616F]">
                  {t.stub.qrDraftPlaceholder}
                </p>
              </div>
            )}
          </div>

          <dl className="flex min-w-0 flex-col gap-2 text-xs">
            <div className="border-b border-[#CFD8D4] pb-1.5">
              <dt className="font-semibold text-[#4C616F]">
                {t.stub.locktimeLabel}
              </dt>
              <dd className="mt-0.5 flex flex-wrap items-center justify-between gap-1 font-mono text-[#0E1E2B] tabular-nums">
                <span>{locktimeInfo.formattedDate}</span>
                <span
                  className={`rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold ${
                    locktimeInfo.isExpired
                      ? 'bg-[#FBF2E6] text-[#9B5305]'
                      : 'bg-[#E5F2ED] text-[#0C5C44]'
                  }`}
                >
                  {locktimeInfo.countdownLabel}
                </span>
              </dd>
            </div>

            {senderNpub ? (
              <div className="border-b border-[#CFD8D4] pb-1.5">
                <dt className="font-semibold text-[#4C616F]">
                  {t.stub.senderRefundKeyLabel}
                </dt>
                <dd
                  translate="no"
                  className="mt-0.5 font-mono text-[11px] text-[#3D515F]"
                >
                  {truncateIdentifier(senderNpub, 14, 10)}
                </dd>
              </div>
            ) : null}

            <div className="border-b border-[#CFD8D4] pb-1.5">
              <dt className="font-semibold text-[#4C616F]">
                {t.stub.tokenHashLabel}
              </dt>
              <dd
                translate="no"
                className="mt-0.5 font-mono text-[11px] text-[#0E1E2B]"
              >
                {tokenHash
                  ? truncateIdentifier(tokenHash, 14, 10)
                  : 'sha256:en-attente-de-frappe'}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="font-semibold text-[#4C616F]">
                {t.stub.mintLabel}
              </span>
              <span
                translate="no"
                className="font-mono text-[11px] text-[#3D515F] truncate"
              >
                {mintUrl.replace(/^https?:\/\//, '')}
              </span>
            </div>
          </dl>
        </div>

        {/* Nostr Receipt Event Link if Redeemed */}
        {nostrReceiptEventId ? (
          <div className="mt-3 rounded-[8px] border border-[#0C5C44]/40 bg-[#E5F2ED]/60 px-3 py-2 text-xs">
            <span className="font-semibold text-[#0C5C44]">
              Reçu Nostr (Kind 30078) :{' '}
            </span>
            <span translate="no" className="font-mono text-[#0E1E2B]">
              {truncateIdentifier(nostrReceiptEventId, 14, 10)}
            </span>
          </div>
        ) : null}

        {/* Action Strip */}
        {showActions && token && effectiveStatus !== 'draft' ? (
          <div className="no-print mt-4 flex flex-wrap items-center gap-2 border-t border-[#CFD8D4] pt-3.5">
            <button
              type="button"
              onClick={handleCopyToken}
              disabled={effectiveStatus === 'redeemed' || effectiveStatus === 'refunded'}
              className="kb-btn-secondary flex-1 text-xs"
            >
              <CopyIcon size={15} />
              <span>{t.stub.copyTokenButton}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="kb-btn-secondary text-xs"
            >
              <PrintIcon size={15} />
              <span>{t.stub.printVoucherButton}</span>
            </button>

            {onTestAtCounter && effectiveStatus === 'locked' ? (
              <button
                type="button"
                onClick={() => onTestAtCounter(token)}
                className="kb-btn-emerald w-full sm:w-auto text-xs"
              >
                <StoreCounterIcon size={15} />
                <span>{t.stub.testAtCounterButton}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
