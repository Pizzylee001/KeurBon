import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useKeurBonStore } from '../state/store';
import type {
  IssuedVoucher,
  PurposeCategory,
} from '../types/keurbon';
import {
  VoucherStub,
  formatSatsAmount,
  formatXofAmount,
  truncateIdentifier,
} from '../components/VoucherStub';
import {
  AlertTriangleIcon,
  CategoryIcon,
  CheckCircleIcon,
  ClockLockIcon,
  CopyIcon,
  KeyIcon,
  LockSealIcon,
  PrintIcon,
  RefreshIcon,
  SpinnerRingIcon,
  StoreCounterIcon,
} from '../components/Icons';
import { cashuService } from '../lib/cashu';
import { fxService, xofToSats } from '../lib/fx';

const QUICK_XOF_AMOUNTS = [5000, 15000, 25000, 50000] as const;

const PURPOSE_CATEGORIES: PurposeCategory[] = [
  'health',
  'school',
  'hardware',
  'groceries',
  'electricity',
];

type LocktimePresetId = '45s' | '24h' | '72h' | '7d';

interface LocktimePreset {
  id: LocktimePresetId;
  seconds: number;
  labelFr: string;
  labelEn: string;
  badgeFr?: string;
  badgeEn?: string;
}

const LOCKTIME_PRESETS: LocktimePreset[] = [
  {
    id: '45s',
    seconds: 45,
    labelFr: '45 sec · Test remboursement',
    labelEn: '45 sec · Refund test',
    badgeFr: 'Démo juge',
    badgeEn: 'Judge demo',
  },
  {
    id: '24h',
    seconds: 24 * 3600,
    labelFr: '24 h',
    labelEn: '24 h',
  },
  {
    id: '72h',
    seconds: 72 * 3600,
    labelFr: '72 h',
    labelEn: '72 h',
  },
  {
    id: '7d',
    seconds: 7 * 24 * 3600,
    labelFr: '7 jours',
    labelEn: '7 days',
  },
];

type MintProgressStage =
  | 'loading_mint'
  | 'creating_quote'
  | 'minting_proofs'
  | 'locking_p2pk'
  | 'verifying_dleq';

function hasLikelyPiiInMemo(text: string): boolean {
  const clean = text.trim();
  if (!clean) return false;
  // Flag email addresses or 7+ consecutive phone digits
  if (/\S+@\S+\.\S+/.test(clean)) return true;
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length >= 8) return true;
  return false;
}

export function IssuePage() {
  const {
    language,
    t,
    vendors,
    activeVendor,
    senderKeys,
    settings,
    effectiveFxRateXofPerBtc,
    addVoucher,
    setLastMintedToken,
    setActiveVendorId,
    setActiveRole,
    updateSettings,
    pushToast,
  } = useKeurBonStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const vendorParam = searchParams.get('vendor');
  const initialVendor = useMemo(() => {
    if (vendorParam) {
      const found = vendors.find((v) => v.id === vendorParam);
      if (found) return found;
    }
    return activeVendor ?? vendors[0];
  }, [vendorParam, vendors, activeVendor]);

  const [amountXofInput, setAmountXofInput] = useState<string>('25000');
  const [selectedVendorId, setSelectedVendorId] = useState<string>(
    initialVendor?.id ?? ''
  );
  const [selectedPurpose, setSelectedPurpose] = useState<PurposeCategory>(
    initialVendor?.category ?? 'health'
  );
  const [locktimePresetId, setLocktimePresetId] =
    useState<LocktimePresetId>('72h');
  const [memo, setMemo] = useState<string>('');

  const [amountError, setAmountError] = useState<string | null>(null);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [memoError, setMemoError] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [mintStage, setMintStage] =
    useState<MintProgressStage>('loading_mint');
  const [isRefreshingFx, setIsRefreshingFx] = useState<boolean>(false);
  const [mintedVoucher, setMintedVoucher] = useState<IssuedVoucher | null>(
    null
  );
  const [sealTriggerKey, setSealTriggerKey] = useState<number>(0);

  // Sync deep-linked ?vendor=<vendorId> parameter
  useEffect(() => {
    if (!vendorParam) return;
    const matched = vendors.find((v) => v.id === vendorParam);
    if (matched) {
      setSelectedVendorId(matched.id);
      setSelectedPurpose(matched.category);
      setVendorError(null);
    }
  }, [vendorParam, vendors]);

  const selectedVendor = useMemo(() => {
    return (
      vendors.find((v) => v.id === selectedVendorId) ??
      vendors[0] ??
      activeVendor
    );
  }, [vendors, selectedVendorId, activeVendor]);

  const numericAmountXof = useMemo(() => {
    const parsed = Number(amountXofInput);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.round(parsed);
  }, [amountXofInput]);

  const calculatedSats = useMemo(() => {
    if (numericAmountXof <= 0) return 0;
    return xofToSats(numericAmountXof, effectiveFxRateXofPerBtc);
  }, [numericAmountXof, effectiveFxRateXofPerBtc]);

  const estimatedFeeReserveSats = useMemo(() => {
    if (calculatedSats <= 0) return 0;
    return Math.max(2, Math.ceil(calculatedSats * 0.002));
  }, [calculatedSats]);

  const activePreset = useMemo(() => {
    return (
      LOCKTIME_PRESETS.find((p) => p.id === locktimePresetId) ??
      LOCKTIME_PRESETS[2]
    );
  }, [locktimePresetId]);

  const draftLocktimeUnix = useMemo(() => {
    return Math.floor(Date.now() / 1000) + activePreset.seconds;
  }, [activePreset.seconds]);

  const handleVendorChange = (nextVendorId: string) => {
    setSelectedVendorId(nextVendorId);
    setVendorError(null);
    setMintedVoucher(null);
    const matched = vendors.find((v) => v.id === nextVendorId);
    if (matched) {
      setSelectedPurpose(matched.category);
      setSearchParams({ vendor: matched.id }, { replace: true });
    }
  };

  const handleRefreshFx = async () => {
    setIsRefreshingFx(true);
    try {
      const snapshot = await fxService.fetchLiveXofPerBtc();
      updateSettings({
        lastLiveFxRateXofPerBtc: snapshot.xofPerBtc,
        lastLiveFxUpdatedAt: snapshot.updatedAt,
      });
      pushToast({
        tone: 'info',
        title:
          language === 'fr'
            ? 'Cours BTC/FCFA mis à jour'
            : 'BTC/FCFA exchange rate updated',
        detail: `1 BTC = ${formatXofAmount(snapshot.xofPerBtc, language)}`,
      });
    } catch {
      pushToast({
        tone: 'error',
        title:
          language === 'fr'
            ? 'Impossible d’actualiser le cours en direct'
            : 'Unable to fetch live FX rate',
        detail:
          language === 'fr'
            ? 'Conservation du cours de référence local.'
            : 'Keeping local reference exchange rate.',
      });
    } finally {
      setIsRefreshingFx(false);
    }
  };

  const getStageLabel = (stage: MintProgressStage): string => {
    switch (stage) {
      case 'loading_mint':
        return t.issue.stageLoadingMint;
      case 'creating_quote':
        return t.issue.stageCreatingQuote;
      case 'minting_proofs':
        return t.issue.stageMintingProofs;
      case 'locking_p2pk':
        return t.issue.stageLockingP2pk;
      case 'verifying_dleq':
        return t.issue.stageVerifyingDleq;
    }
  };

  const validateFields = (): boolean => {
    let valid = true;

    if (numericAmountXof < 200 || calculatedSats < 10) {
      setAmountError(t.issue.errMinAmount);
      valid = false;
    } else {
      setAmountError(null);
    }

    if (!selectedVendor) {
      setVendorError(t.issue.errNoVendor);
      valid = false;
    } else {
      setVendorError(null);
    }

    if (hasLikelyPiiInMemo(memo)) {
      setMemoError(
        language === 'fr'
          ? 'Confidentialité : retirez tout numéro de téléphone ou e-mail de la note.'
          : 'Privacy guard: remove any phone number or email address from the note.'
      );
      valid = false;
    } else {
      setMemoError(null);
    }

    if (!valid && numericAmountXof < 200) {
      amountInputRef.current?.focus();
    }

    return valid;
  };

  const executeMintVoucher = async () => {
    if (!validateFields() || !selectedVendor) return;

    setIsMinting(true);
    setMintError(null);
    setMintStage('loading_mint');

    const locktimeUnix = Math.floor(Date.now() / 1000) + activePreset.seconds;

    try {
      const result = await cashuService.issueLockedVoucher({
        mintUrl: settings.mintUrl,
        amountSats: calculatedSats,
        amountXof: numericAmountXof,
        fxRateXofPerBtc: effectiveFxRateXofPerBtc,
        purpose: selectedPurpose,
        vendor: selectedVendor,
        senderKeys,
        locktimeUnix,
        memo: memo.trim() || undefined,
        onProgress: (stage) => {
          setMintStage(stage);
        },
      });

      addVoucher(result.voucher);
      setMintedVoucher(result.voucher);
      setSealTriggerKey((prev) => prev + 1);

      pushToast({
        tone: 'success',
        title:
          language === 'fr'
            ? 'Bon Cashu NUT-11 verrouillé avec succès'
            : 'Cashu NUT-11 voucher locked',
        detail: `${formatXofAmount(result.voucher.amountXof, language)} (${formatSatsAmount(result.voucher.amountSats, language)})`,
      });
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : t.issue.errMintFailure;
      setMintError(rawMessage);
      pushToast({
        tone: 'error',
        title:
          language === 'fr'
            ? 'Échec de frappe sur le mint Cashu'
            : 'Cashu minting failed',
        detail: rawMessage,
      });
    } finally {
      setIsMinting(false);
    }
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await executeMintVoucher();
  };

  const handleCopySmsPayload = async () => {
    if (!mintedVoucher) return;
    const smsText =
      language === 'fr'
        ? `KeurBon (${t.categories[mintedVoucher.purpose]}) : ${formatXofAmount(mintedVoucher.amountXof, 'fr')} (${formatSatsAmount(mintedVoucher.amountSats, 'fr')}) verrouillé pour ${mintedVoucher.vendorName} (${mintedVoucher.vendorDistrict}). Présentez ce jeton au comptoir : ${mintedVoucher.token}`
        : `KeurBon (${t.categories[mintedVoucher.purpose]}): ${formatXofAmount(mintedVoucher.amountXof, 'en')} (${formatSatsAmount(mintedVoucher.amountSats, 'en')}) locked for ${mintedVoucher.vendorName} (${mintedVoucher.vendorDistrict}). Present this token at the counter: ${mintedVoucher.token}`;

    try {
      await navigator.clipboard.writeText(smsText);
      pushToast({
        tone: 'success',
        title:
          language === 'fr'
            ? 'Message SMS / WhatsApp copié'
            : 'SMS / WhatsApp payload copied',
        detail: truncateIdentifier(mintedVoucher.token, 18, 10),
      });
    } catch {
      pushToast({
        tone: 'info',
        title: t.issue.copySmsTextButton,
        detail: truncateIdentifier(mintedVoucher.token, 18, 10),
      });
    }
  };

  const handleCopyRawToken = async () => {
    if (!mintedVoucher) return;
    try {
      await navigator.clipboard.writeText(mintedVoucher.token);
      pushToast({
        tone: 'success',
        title: t.stub.copiedTokenToast,
        detail: truncateIdentifier(mintedVoucher.token, 18, 10),
      });
    } catch {
      pushToast({
        tone: 'info',
        title: t.stub.copyTokenButton,
        detail: truncateIdentifier(mintedVoucher.token, 18, 10),
      });
    }
  };

  const handleTestAtCounter = (tokenToTest: string) => {
    const targetVendorId = mintedVoucher?.vendorId ?? selectedVendor.id;
    setLastMintedToken(tokenToTest);
    setActiveVendorId(targetVendorId);
    setActiveRole('vendor');
    navigate('/redeem');
  };

  return (
    <div className="kb-animate-enter flex flex-col gap-6">
      {/* Route Header */}
      <header className="border-b border-[#CFD8D4] pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="type-h1 text-[#0E1E2B]">{t.issue.pageTitle}</h1>
          <Link
            to="/ledger"
            className="text-xs font-semibold text-[#0C5C44] underline"
          >
            {language === 'fr'
              ? 'Consulter le coffre & les remboursements (/ledger)'
              : 'Open sender vault & refunds (/ledger)'}
          </Link>
        </div>
        <p className="type-body-large mt-2 text-[#3D515F]">
          {t.issue.pageSubtitle}
        </p>
      </header>

      {/* Asymmetric 5/7 Live Voucher Builder (Single-Column < 768px) */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start">
        {/* Left Column (5 cols): Issuance Configuration Desk */}
        <form
          onSubmit={handleFormSubmit}
          noValidate
          className="flex flex-col gap-6 md:col-span-5"
        >
          {/* 1. Amount in FCFA + Persistent Live Sats Conversion + Denomination Chips */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="issue-amount-xof"
                className="type-label text-[#0E1E2B]"
              >
                {t.issue.amountXofLabel}
              </label>
              <button
                type="button"
                onClick={handleRefreshFx}
                disabled={isRefreshingFx}
                className="kb-pressable inline-flex min-h-[44px] items-center gap-1.5 rounded-[6px] border border-[#CFD8D4] bg-[#FAFBF9] px-3 py-1.5 text-xs font-semibold text-[#3D515F] hover:bg-[#E3E9E5] hover:text-[#0E1E2B]"
              >
                {isRefreshingFx ? (
                  <SpinnerRingIcon size={13} />
                ) : (
                  <RefreshIcon size={13} />
                )}
                <span>{t.issue.refreshFxButton}</span>
              </button>
            </div>

            <div className="relative">
              <input
                ref={amountInputRef}
                id="issue-amount-xof"
                name="amountXof"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                min={200}
                step={500}
                value={amountXofInput}
                onChange={(e) => {
                  setAmountXofInput(e.target.value);
                  setAmountError(null);
                  setMintedVoucher(null);
                }}
                aria-invalid={Boolean(amountError)}
                aria-describedby={
                  amountError
                    ? 'issue-amount-helper issue-amount-error'
                    : 'issue-amount-helper'
                }
                className={`kb-input pr-16 font-mono text-lg font-semibold tabular-nums ${
                  amountError ? 'border-[#A62329]' : ''
                }`}
              />
              <span
                translate="no"
                className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 font-mono text-xs font-semibold text-[#4C616F]"
              >
                FCFA
              </span>
            </div>

            {/* Persistent Live Sats Conversion Helper */}
            <div
              id="issue-amount-helper"
              className="rounded-[8px] border border-[#CFD8D4] bg-[#E3E9E5]/70 px-3 py-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#3D515F]">
                  {t.issue.amountSatsLabel} :
                </span>
                <span
                  translate="no"
                  className="font-mono text-sm font-bold text-[#9B5305] tabular-nums"
                >
                  {formatSatsAmount(calculatedSats, language)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#4C616F]">
                <span translate="no" className="font-mono tabular-nums">
                  1 BTC = {formatXofAmount(effectiveFxRateXofPerBtc, language)}
                </span>
                <span translate="no" className="font-mono tabular-nums">
                  {t.issue.feeDisclosureLabel}: ~{estimatedFeeReserveSats} sats
                </span>
              </div>
            </div>

            {amountError ? (
              <p
                id="issue-amount-error"
                role="alert"
                className="flex items-start gap-1.5 text-xs font-semibold text-[#A62329]"
              >
                <AlertTriangleIcon size={15} className="mt-0.5 shrink-0" />
                <span>{amountError}</span>
              </p>
            ) : null}

            {/* Quick FCFA Denomination Preset Chips (>= 44px tap targets) */}
            <div
              role="group"
              aria-label={
                language === 'fr'
                  ? 'Coupures rapides en FCFA'
                  : 'Quick FCFA denominations'
              }
              className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {QUICK_XOF_AMOUNTS.map((presetXof) => {
                const isSelected = numericAmountXof === presetXof;
                return (
                  <button
                    key={presetXof}
                    type="button"
                    onClick={() => {
                      setAmountXofInput(String(presetXof));
                      setAmountError(null);
                      setMintedVoucher(null);
                    }}
                    aria-pressed={isSelected}
                    className={`kb-pressable inline-flex min-h-[44px] items-center justify-center rounded-[8px] border px-2.5 font-mono text-xs font-semibold tabular-nums ${
                      isSelected
                        ? 'border-[#0E1E2B] bg-[#0E1E2B] text-[#FAFBF9]'
                        : 'border-[#637683] bg-[#FAFBF9] text-[#0E1E2B] hover:bg-[#E3E9E5]'
                    }`}
                  >
                    {new Intl.NumberFormat(
                      language === 'fr' ? 'fr-FR' : 'en-US'
                    ).format(presetXof)}{' '}
                    F
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Dakar Neighborhood Vendor Selector */}
          <div className="flex flex-col gap-2 border-t border-[#CFD8D4] pt-4">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="issue-vendor-select"
                className="type-label text-[#0E1E2B]"
              >
                {t.issue.vendorSelectLabel}
              </label>
              <Link
                to="/vendors"
                className="text-xs font-semibold text-[#0C5C44] underline"
              >
                {language === 'fr' ? '+ Annuaire Dakar' : '+ Dakar directory'}
              </Link>
            </div>

            <select
              id="issue-vendor-select"
              name="vendorId"
              value={selectedVendor?.id ?? ''}
              onChange={(e) => handleVendorChange(e.target.value)}
              aria-invalid={Boolean(vendorError)}
              aria-describedby={
                vendorError
                  ? 'issue-vendor-helper issue-vendor-error'
                  : 'issue-vendor-helper'
              }
              className="kb-input font-semibold"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.district} ({t.categories[v.category]})
                  {v.isDemo ? ` [${t.nav.demoTag}]` : ''}
                </option>
              ))}
            </select>

            {/* Hairline Vendor Quick-Pick & Cryptographic Identity Cards */}
            <div className="mt-1 divide-y divide-[#CFD8D4] rounded-[8px] border border-[#CFD8D4] bg-[#FAFBF9]">
              {vendors.map((v) => {
                const isActive = v.id === selectedVendor?.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleVendorChange(v.id)}
                    aria-pressed={isActive}
                    className={`kb-pressable flex min-h-[48px] w-full flex-col gap-1 px-3 py-2.5 text-left ${
                      isActive
                        ? 'bg-[#E5F2ED]/80 text-[#0E1E2B]'
                        : 'bg-[#FAFBF9] text-[#0E1E2B] hover:bg-[#F1F4F2]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#0E1E2B]">
                        <StoreCounterIcon
                          size={14}
                          className={
                            isActive ? 'text-[#0C5C44]' : 'text-[#4C616F]'
                          }
                        />
                        <span>{v.name}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-[4px] bg-[#E3E9E5] px-1.5 py-0.5 text-[11px] font-semibold text-[#3D515F]">
                          {t.categories[v.category]}
                        </span>
                        <span
                          className={`rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                            v.isDemo
                              ? 'bg-[#FBF2E6] text-[#9B5305]'
                              : 'bg-[#E5F2ED] text-[#0C5C44]'
                          }`}
                        >
                          {v.isDemo
                            ? t.nav.demoTag
                            : language === 'fr'
                              ? 'Local'
                              : 'Local'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#4C616F]">
                      <span>{v.district}</span>
                      <span
                        translate="no"
                        className="type-data-row text-[11px] text-[#3D515F]"
                      >
                        {truncateIdentifier(v.npub, 14, 8)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <p id="issue-vendor-helper" className="type-caption text-[#4C616F]">
              {t.issue.vendorSelectHelper}
            </p>

            {vendorError ? (
              <p
                id="issue-vendor-error"
                role="alert"
                className="flex items-start gap-1.5 text-xs font-semibold text-[#A62329]"
              >
                <AlertTriangleIcon size={15} className="mt-0.5 shrink-0" />
                <span>{vendorError}</span>
              </p>
            ) : null}
          </div>

          {/* 3. Purpose Spending Category Selector */}
          <div className="flex flex-col gap-2 border-t border-[#CFD8D4] pt-4">
            <span
              id="issue-category-group-label"
              className="type-label text-[#0E1E2B]"
            >
              {t.issue.categoryLabel}
            </span>
            <div
              role="radiogroup"
              aria-labelledby="issue-category-group-label"
              className="flex flex-wrap gap-2"
            >
              {PURPOSE_CATEGORIES.map((cat) => {
                const isSelected = selectedPurpose === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setSelectedPurpose(cat);
                      setMintedVoucher(null);
                    }}
                    className={`kb-pressable inline-flex min-h-[44px] items-center gap-2 rounded-[8px] border px-3 text-xs font-semibold ${
                      isSelected
                        ? 'border-[#0E1E2B] bg-[#0E1E2B] text-[#FAFBF9]'
                        : 'border-[#637683] bg-[#FAFBF9] text-[#0E1E2B] hover:bg-[#E3E9E5]'
                    }`}
                  >
                    <CategoryIcon category={cat} size={15} />
                    <span>{t.categories[cat]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Automatic Refund Locktime Presets (Including 45 sec Judge Refund Test) */}
          <div className="flex flex-col gap-2 border-t border-[#CFD8D4] pt-4">
            <span
              id="issue-locktime-group-label"
              className="type-label text-[#0E1E2B]"
            >
              {t.issue.locktimePresetLabel}
            </span>
            <div
              role="radiogroup"
              aria-labelledby="issue-locktime-group-label"
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {LOCKTIME_PRESETS.map((preset) => {
                const isSelected = locktimePresetId === preset.id;
                const label =
                  language === 'fr' ? preset.labelFr : preset.labelEn;
                const badge =
                  language === 'fr' ? preset.badgeFr : preset.badgeEn;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setLocktimePresetId(preset.id);
                      setMintedVoucher(null);
                    }}
                    className={`kb-pressable flex min-h-[44px] items-center justify-between gap-2 rounded-[8px] border px-3 py-2 text-left text-xs font-semibold ${
                      isSelected
                        ? 'border-[#0E1E2B] bg-[#0E1E2B] text-[#FAFBF9]'
                        : 'border-[#637683] bg-[#FAFBF9] text-[#0E1E2B] hover:bg-[#E3E9E5]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <ClockLockIcon size={15} className="shrink-0" />
                      <span>{label}</span>
                    </span>
                    {badge ? (
                      <span
                        className={`shrink-0 rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                          isSelected
                            ? 'bg-[#D98218] text-[#0E1E2B]'
                            : 'bg-[#FBF2E6] text-[#9B5305]'
                        }`}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="type-caption text-[#4C616F]">
              {t.issue.locktimeHelper}
            </p>
          </div>

          {/* 5. Optional Non-PII Short Note (Max 60 chars) */}
          <div className="flex flex-col gap-1.5 border-t border-[#CFD8D4] pt-4">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="issue-memo-input"
                className="type-label text-[#0E1E2B]"
              >
                {t.issue.memoLabel}
              </label>
              <span className="font-mono text-xs text-[#4C616F] tabular-nums">
                {memo.length}/60
              </span>
            </div>

            <input
              id="issue-memo-input"
              name="memo"
              type="text"
              autoComplete="off"
              maxLength={60}
              value={memo}
              placeholder={t.issue.memoPlaceholder}
              onChange={(e) => {
                setMemo(e.target.value);
                setMemoError(null);
                setMintedVoucher(null);
              }}
              aria-invalid={Boolean(memoError)}
              aria-describedby={
                memoError
                  ? 'issue-memo-warning issue-memo-error'
                  : 'issue-memo-warning'
              }
              className={`kb-input text-sm ${
                memoError ? 'border-[#A62329]' : ''
              }`}
            />

            <p id="issue-memo-warning" className="type-caption text-[#4C616F]">
              {language === 'fr'
                ? 'Zéro-PII : n’inscrivez aucun nom personnel, numéro de téléphone ou adresse e-mail.'
                : 'Zero-PII: never enter personal names, phone numbers, or email addresses.'}
            </p>

            {memoError ? (
              <p
                id="issue-memo-error"
                role="alert"
                className="flex items-start gap-1.5 text-xs font-semibold text-[#A62329]"
              >
                <AlertTriangleIcon size={15} className="mt-0.5 shrink-0" />
                <span>{memoError}</span>
              </p>
            ) : null}
          </div>

          {/* Mint Error Banner with Retry Button */}
          {mintError ? (
            <div
              role="alert"
              className="rounded-[8px] border border-[#A62329] bg-[#FBEBEC] p-3.5 text-xs text-[#A62329]"
            >
              <div className="flex items-start gap-2">
                <AlertTriangleIcon size={17} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {language === 'fr'
                      ? 'Erreur lors de la frappe sur le mint Cashu'
                      : 'Cashu minting error'}
                  </p>
                  <p className="mt-1 leading-relaxed text-[#0E1E2B]">
                    {mintError}
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={executeMintVoucher}
                      disabled={isMinting}
                      className="kb-btn-destructive text-xs"
                    >
                      <RefreshIcon size={14} />
                      <span>
                        {language === 'fr'
                          ? 'Réessayer la frappe'
                          : 'Retry minting'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* 6. Primary NUT-11 Lock CTA Button */}
          <div className="border-t border-[#CFD8D4] pt-4">
            <button
              type="submit"
              disabled={isMinting}
              aria-busy={isMinting}
              className="kb-btn-primary w-full justify-center text-base"
            >
              {isMinting ? (
                <>
                  <SpinnerRingIcon size={18} />
                  <span>
                    {language === 'fr'
                      ? 'Verrouillage NUT-11…'
                      : 'Locking NUT-11…'}
                  </span>
                </>
              ) : (
                <>
                  <LockSealIcon size={18} />
                  <span>
                    {language === 'fr'
                      ? 'Verrouiller le bon (NUT-11)'
                      : 'Lock voucher (NUT-11)'}
                  </span>
                </>
              )}
            </button>

            {isMinting ? (
              <p
                aria-live="polite"
                className="mt-2.5 flex items-center justify-center gap-2 font-mono text-xs font-medium text-[#3D515F]"
              >
                <SpinnerRingIcon size={14} className="text-[#9B5305]" />
                <span>{getStageLabel(mintStage)}</span>
              </p>
            ) : null}
          </div>
        </form>

        {/* Right Column (7 cols, Sticky on Desktop): Live Tactile VoucherStub & Counter Handoff */}
        <div className="kb-animate-enter-delayed flex flex-col gap-4 md:col-span-7 lg:sticky lg:top-[88px] lg:self-start">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CFD8D4] pb-2.5">
            <div>
              <h2 className="type-h3 text-[#0E1E2B]">
                {mintedVoucher
                  ? language === 'fr'
                    ? 'Bon Cashu NUT-11 scellé & prêt à remettre'
                    : 'Sealed Cashu NUT-11 voucher ready for delivery'
                  : language === 'fr'
                    ? 'Aperçu en direct du bon à émettre'
                    : 'Live voucher draft preview'}
              </h2>
              <p className="text-xs text-[#4C616F]">
                {mintedVoucher
                  ? language === 'fr'
                    ? 'Scannez le code QR, copiez le jeton SMS ou testez immédiatement l’encaissement au comptoir.'
                    : 'Scan the QR code, copy the SMS token, or test redemption at the counter.'
                  : language === 'fr'
                    ? 'Le spécimen se met à jour en temps réel et se scelle lors de la frappe sur Testnut.'
                    : 'This stub updates in real time and snaps locked once minted on Testnut.'}
              </p>
            </div>

            {mintedVoucher ? (
              <span className="inline-flex items-center gap-1 rounded-[6px] border border-[#0C5C44] bg-[#E5F2ED] px-2.5 py-1 font-mono text-xs font-bold text-[#0C5C44]">
                <CheckCircleIcon size={14} />
                <span>NUT-11 + NUT-12 OK</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-[6px] border border-[#637683] bg-[#E3E9E5] px-2.5 py-1 font-mono text-xs font-semibold text-[#3D515F]">
                <KeyIcon size={13} />
                <span>{t.statuses.draft}</span>
              </span>
            )}
          </div>

          <VoucherStub
            serialCode={mintedVoucher?.serialCode ?? 'KB-DKR-DRAFT'}
            amountXof={mintedVoucher?.amountXof ?? numericAmountXof}
            amountSats={mintedVoucher?.amountSats ?? calculatedSats}
            purpose={mintedVoucher?.purpose ?? selectedPurpose}
            vendorName={
              mintedVoucher?.vendorName ??
              (selectedVendor
                ? `${selectedVendor.name}${selectedVendor.isDemo ? ` (${t.nav.demoTag})` : ''}`
                : '')
            }
            vendorDistrict={
              mintedVoucher?.vendorDistrict ?? selectedVendor?.district ?? ''
            }
            vendorNpub={mintedVoucher?.vendorNpub ?? selectedVendor?.npub ?? ''}
            senderNpub={mintedVoucher?.senderNpub ?? senderKeys.npub}
            locktimeUnix={mintedVoucher?.locktimeUnix ?? draftLocktimeUnix}
            status={mintedVoucher?.status ?? 'draft'}
            token={mintedVoucher?.token}
            tokenHash={mintedVoucher?.tokenHash}
            mintUrl={mintedVoucher?.mintUrl ?? settings.mintUrl}
            dleqVerified={mintedVoucher?.dleqVerified ?? false}
            memo={mintedVoucher?.memo ?? (memo.trim() || undefined)}
            sealTriggerKey={sealTriggerKey}
            onTestAtCounter={handleTestAtCounter}
            showActions={true}
          />

          {/* Minted Token String & 1-Click Counter Handoff Strip */}
          {mintedVoucher ? (
            <div className="no-print rounded-[12px] border border-[#0C5C44] bg-[#FAFBF9] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="type-h3 text-[#0E1E2B]">
                  {t.issue.exportSectionTitle}
                </h3>
                <span
                  translate="no"
                  className="font-mono text-xs font-semibold text-[#0C5C44]"
                >
                  {mintedVoucher.serialCode}
                </span>
              </div>

              {/* Raw Cashu v4 Token Box */}
              <div className="mt-3 rounded-[8px] border border-[#CFD8D4] bg-[#F1F4F2] p-3 min-w-0">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#3D515F]">
                  <span>
                    {language === 'fr'
                      ? 'Jeton Cashu NUT-11 (cashuB…)'
                      : 'Cashu NUT-11 token (cashuB…)'}
                  </span>
                  <span translate="no" className="font-mono text-[11px] text-[#4C616F]">
                    SHA-256: {truncateIdentifier(mintedVoucher.tokenHash, 10, 8)}
                  </span>
                </div>
                <p
                  translate="no"
                  className="type-data-row mt-1.5 max-h-24 overflow-y-auto text-xs text-[#0E1E2B] select-all"
                >
                  {mintedVoucher.token}
                </p>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleTestAtCounter(mintedVoucher.token)}
                  className="kb-btn-emerald flex-1 text-xs"
                >
                  <StoreCounterIcon size={16} />
                  <span>{t.issue.sendToCounterButton}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySmsPayload}
                  className="kb-btn-secondary text-xs"
                >
                  <CopyIcon size={15} />
                  <span>{t.issue.copySmsTextButton}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyRawToken}
                  className="kb-btn-secondary text-xs"
                >
                  <CopyIcon size={15} />
                  <span>{t.stub.copyTokenButton}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="kb-btn-secondary text-xs"
                >
                  <PrintIcon size={15} />
                  <span>{t.stub.printVoucherButton}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default IssuePage;
