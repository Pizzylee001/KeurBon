import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEFAULT_MINT_URL } from '../data/demoVendors';
import { useKeurBonStore } from '../state/store';
import type {
  CashuCryptoService,
  IssuedVoucher,
  Nut7SpendState,
  Nut7StateCheckResult,
  RefundExpiredVoucherParams,
  RefundExpiredVoucherResult,
  VoucherStatus,
} from '../types/keurbon';
import {
  formatLocktimeWindow,
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
  DownloadIcon,
  KeyIcon,
  LockSealIcon,
  RefreshIcon,
  SendVoucherIcon,
  ShieldCheckIcon,
  SpinnerRingIcon,
  StoreCounterIcon,
  UploadIcon,
} from '../components/Icons';
import { cashuService } from '../lib/cashu';
import { fxService } from '../lib/fx';

type CompatibleCashuService = CashuCryptoService & {
  checkNut7SpendState?: (
    token: string,
    mintUrl?: string
  ) => Promise<Nut7StateCheckResult>;
  refundExpiredVoucher?: (
    params: RefundExpiredVoucherParams
  ) => Promise<RefundExpiredVoucherResult>;
};

export function LedgerPage() {
  const {
    language,
    t,
    vouchers,
    receipts,
    senderKeys,
    settings,
    effectiveFxRateXofPerBtc,
    updateVoucherStatus,
    setLastMintedToken,
    setActiveVendorId,
    setActiveRole,
    updateSettings,
    exportBackupJson,
    importBackupJson,
    resetDemoData,
    pushToast,
  } = useKeurBonStore();

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [nowSec, setNowSec] = useState<number>(() =>
    Math.floor(Date.now() / 1000)
  );
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [mintUrlDraft, setMintUrlDraft] = useState<string>(settings.mintUrl);
  const [manualFxDraft, setManualFxDraft] = useState<string>(
    settings.manualFxRateXofPerBtc
      ? String(settings.manualFxRateXofPerBtc)
      : ''
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);

  const [isRefreshingFx, setIsRefreshingFx] = useState<boolean>(false);
  const [isCheckingAllNut7, setIsCheckingAllNut7] = useState<boolean>(false);
  const [checkingNut7ById, setCheckingNut7ById] = useState<
    Record<string, boolean>
  >({});
  const [reclaimingById, setReclaimingById] = useState<Record<string, boolean>>(
    {}
  );
  const [nut7StateById, setNut7StateById] = useState<
    Record<string, Nut7SpendState>
  >({});
  const [rowErrorById, setRowErrorById] = useState<Record<string, string>>({});

  // Live 1-second tick countdown timer for active vouchers
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setMintUrlDraft(settings.mintUrl);
  }, [settings.mintUrl]);

  const getEffectiveVoucherStatus = (voucher: IssuedVoucher): VoucherStatus => {
    if (voucher.status === 'locked' && voucher.locktimeUnix <= nowSec) {
      return 'expired';
    }
    return voucher.status;
  };

  // Summary strip totals
  const summaryStats = useMemo(() => {
    let lockedCount = 0;
    let lockedXof = 0;
    let lockedSats = 0;

    let redeemedCount = 0;
    let redeemedXof = 0;
    let redeemedSats = 0;

    let expiredCount = 0;
    let expiredXof = 0;
    let expiredSats = 0;

    let refundedCount = 0;
    let refundedSats = 0;

    for (const v of vouchers) {
      const eff =
        v.status === 'locked' && v.locktimeUnix <= nowSec
          ? 'expired'
          : v.status;

      if (eff === 'locked') {
        lockedCount += 1;
        lockedXof += v.amountXof;
        lockedSats += v.amountSats;
      } else if (eff === 'redeemed') {
        redeemedCount += 1;
        redeemedXof += v.amountXof;
        redeemedSats += v.amountSats;
      } else if (eff === 'expired') {
        expiredCount += 1;
        expiredXof += v.amountXof;
        expiredSats += v.amountSats;
      } else if (eff === 'refunded') {
        refundedCount += 1;
        refundedSats += v.amountSats;
      }
    }

    return {
      lockedCount,
      lockedXof,
      lockedSats,
      redeemedCount,
      redeemedXof,
      redeemedSats,
      expiredCount,
      expiredXof,
      expiredSats,
      refundedCount,
      refundedSats,
    };
  }, [vouchers, nowSec]);

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
            ? 'Cours BTC/FCFA actualisé'
            : 'BTC/FCFA exchange rate refreshed',
        detail: `1 BTC = ${formatXofAmount(snapshot.xofPerBtc, language)}`,
      });
    } catch {
      pushToast({
        tone: 'error',
        title:
          language === 'fr'
            ? 'Impossible de contacter le service de change'
            : 'Unable to reach FX rate endpoint',
      });
    } finally {
      setIsRefreshingFx(false);
    }
  };

  const handleCheckSingleNut7 = async (voucher: IssuedVoucher) => {
    setCheckingNut7ById((prev) => ({ ...prev, [voucher.id]: true }));
    setRowErrorById((prev) => {
      const next = { ...prev };
      delete next[voucher.id];
      return next;
    });

    try {
      const svc = cashuService as CompatibleCashuService;
      const targetMint = voucher.mintUrl || settings.mintUrl;
      const result =
        typeof svc.checkVoucherNut7State === 'function'
          ? await svc.checkVoucherNut7State(voucher.token, targetMint)
          : await svc.checkNut7SpendState!(voucher.token, targetMint);

      setNut7StateById((prev) => ({
        ...prev,
        [voucher.id]: result.overallState,
      }));

      if (
        result.overallState === 'SPENT' &&
        voucher.status !== 'redeemed' &&
        voucher.status !== 'refunded'
      ) {
        updateVoucherStatus(voucher.id, 'redeemed', {
          redeemedAt: Math.floor(Date.now() / 1000),
        });
      }

      pushToast({
        tone: 'info',
        title: `NUT-07 (${voucher.serialCode}) : ${result.overallState}`,
        detail: truncateIdentifier(voucher.tokenHash, 14, 10),
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : language === 'fr'
            ? 'Échec de vérification NUT-07 sur le mint.'
            : 'Failed to check NUT-07 state on mint.';
      setRowErrorById((prev) => ({ ...prev, [voucher.id]: message }));
      pushToast({
        tone: 'error',
        title:
          language === 'fr'
            ? 'Erreur de vérification NUT-07'
            : 'NUT-07 check failed',
        detail: message,
      });
    } finally {
      setCheckingNut7ById((prev) => ({ ...prev, [voucher.id]: false }));
    }
  };

  const handleCheckAllNut7 = async () => {
    if (vouchers.length === 0) return;
    setIsCheckingAllNut7(true);
    try {
      for (const voucher of vouchers) {
        await handleCheckSingleNut7(voucher);
      }
    } finally {
      setIsCheckingAllNut7(false);
    }
  };

  const handleReclaimExpiredVoucher = async (voucher: IssuedVoucher) => {
    setReclaimingById((prev) => ({ ...prev, [voucher.id]: true }));
    setRowErrorById((prev) => {
      const next = { ...prev };
      delete next[voucher.id];
      return next;
    });

    try {
      const svc = cashuService as CompatibleCashuService;
      const params: RefundExpiredVoucherParams = {
        token: voucher.token,
        senderPrivkeyHex: senderKeys.privkeyHex,
        mintUrl: voucher.mintUrl || settings.mintUrl,
      };
      const result =
        typeof svc.reclaimExpiredVoucher === 'function'
          ? await svc.reclaimExpiredVoucher(params)
          : await svc.refundExpiredVoucher!(params);

      updateVoucherStatus(voucher.id, 'refunded', {
        refundedAt: Math.floor(Date.now() / 1000),
      });
      setNut7StateById((prev) => ({ ...prev, [voucher.id]: 'SPENT' }));

      pushToast({
        tone: 'success',
        title:
          language === 'fr'
            ? `Remboursement NUT-11 réussi : +${result.refundedAmountSats} sats`
            : `NUT-11 refund reclaimed: +${result.refundedAmountSats} sats`,
        detail: `${voucher.serialCode} (${formatXofAmount(voucher.amountXof, language)})`,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : language === 'fr'
            ? 'Impossible de récupérer ce bon sur le mint.'
            : 'Unable to reclaim expired voucher from mint.';
      setRowErrorById((prev) => ({ ...prev, [voucher.id]: message }));
      pushToast({
        tone: 'error',
        title:
          language === 'fr'
            ? 'Échec du remboursement NUT-11'
            : 'NUT-11 refund failed',
        detail: message,
      });
    } finally {
      setReclaimingById((prev) => ({ ...prev, [voucher.id]: false }));
    }
  };

  const handleCopyToken = async (voucher: IssuedVoucher) => {
    try {
      await navigator.clipboard.writeText(voucher.token);
      pushToast({
        tone: 'success',
        title: t.stub.copiedTokenToast,
        detail: `${voucher.serialCode} · ${truncateIdentifier(voucher.token, 16, 8)}`,
      });
    } catch {
      pushToast({
        tone: 'info',
        title: t.ledger.actionCopyToken,
        detail: truncateIdentifier(voucher.token, 16, 8),
      });
    }
  };

  const handleOpenAtCounter = (voucher: IssuedVoucher) => {
    setLastMintedToken(voucher.token);
    setActiveVendorId(voucher.vendorId);
    setActiveRole('vendor');
    navigate('/redeem');
  };

  const handleExportBackup = () => {
    const json = exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `keurbon-backup-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    pushToast({
      tone: 'success',
      title:
        language === 'fr'
          ? 'Sauvegarde JSON exportée'
          : 'JSON backup exported',
      detail: `keurbon-backup-${dateStamp}.json`,
    });
  };

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError(null);

    try {
      const text = await file.text();
      const res = importBackupJson(text);
      if (!res.ok) {
        setImportError(
          res.error ??
            (language === 'fr'
              ? 'Fichier de sauvegarde JSON invalide.'
              : 'Invalid JSON backup file.')
        );
        pushToast({
          tone: 'error',
          title:
            language === 'fr'
              ? 'Échec de l’importation JSON'
              : 'JSON import failed',
          detail: res.error,
        });
      } else {
        pushToast({
          tone: 'success',
          title:
            language === 'fr'
              ? 'Sauvegarde JSON restaurée avec succès'
              : 'JSON backup restored',
          detail: file.name,
        });
      }
    } catch {
      setImportError(
        language === 'fr'
          ? 'Impossible de lire le fichier sélectionné.'
          : 'Unable to read selected file.'
      );
    } finally {
      event.target.value = '';
    }
  };

  const handleSaveSettings = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanedMint = mintUrlDraft.trim().replace(/\/+$/, '') || DEFAULT_MINT_URL;
    const parsedFx = Number(manualFxDraft);
    const manualFx =
      manualFxDraft.trim() && Number.isFinite(parsedFx) && parsedFx > 0
        ? Math.round(parsedFx)
        : null;

    updateSettings({
      mintUrl: cleanedMint,
      manualFxRateXofPerBtc: manualFx,
    });

    pushToast({
      tone: 'success',
      title:
        language === 'fr'
          ? 'Paramètres du coffre enregistrés'
          : 'Vault settings saved',
      detail: `${cleanedMint.replace(/^https?:\/\//, '')} · 1 BTC = ${formatXofAmount(manualFx ?? settings.lastLiveFxRateXofPerBtc, language)}`,
    });
  };

  const handleConfirmReset = () => {
    resetDemoData();
    setConfirmResetOpen(false);
    setNut7StateById({});
    setRowErrorById({});
    pushToast({
      tone: 'info',
      title:
        language === 'fr'
          ? 'Données de démonstration réinitialisées'
          : 'Demo data reset complete',
    });
  };

  return (
    <div className="kb-animate-enter flex flex-col gap-6">
      {/* Hidden File Input for JSON Backup Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportFileChange}
        className="sr-only"
        aria-label={t.ledger.importBackupButton}
      />

      {/* Route Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#CFD8D4] pb-4">
        <div className="max-w-2xl">
          <h1 className="type-h1 text-[#0E1E2B]">{t.ledger.pageTitle}</h1>
          <p className="type-body-large mt-2 text-[#3D515F]">
            {t.ledger.pageSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/issue" className="kb-btn-primary text-xs no-underline">
            <SendVoucherIcon size={16} />
            <span>
              {language === 'fr' ? 'Émettre un bon' : 'Issue a voucher'}
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            aria-expanded={settingsOpen}
            aria-controls="ledger-settings-panel"
            className="kb-btn-secondary text-xs"
          >
            <KeyIcon size={15} />
            <span>
              {language === 'fr'
                ? 'Paramètres & Sauvegarde'
                : 'Settings & Backup'}
            </span>
          </button>
        </div>
      </header>

      {/* Top Summary Strip (Tabular-Nums Mono Totals + Live FX Indicator) */}
      <section
        aria-label={
          language === 'fr'
            ? 'Synthèse financière du coffre'
            : 'Vault financial summary'
        }
        className="grid grid-cols-1 divide-y divide-[#CFD8D4] rounded-[8px] border border-[#CFD8D4] bg-[#FAFBF9] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x"
      >
        {/* 1. Active Locked */}
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#3D515F]">
              {t.ledger.summaryActiveLocked}
            </span>
            <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#E5F2ED] px-1.5 py-0.5 font-mono text-xs font-bold text-[#0C5C44] tabular-nums">
              <LockSealIcon size={13} />
              {summaryStats.lockedCount}
            </span>
          </div>
          <p
            translate="no"
            className="mt-2 font-mono text-lg font-bold text-[#0E1E2B] tabular-nums"
          >
            {formatXofAmount(summaryStats.lockedXof, language)}
          </p>
          <p
            translate="no"
            className="font-mono text-xs font-semibold text-[#0C5C44] tabular-nums"
          >
            {formatSatsAmount(summaryStats.lockedSats, language)}
          </p>
        </div>

        {/* 2. Redeemed in Dakar */}
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#3D515F]">
              {t.ledger.summaryRedeemed}
            </span>
            <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#E5F2ED] px-1.5 py-0.5 font-mono text-xs font-bold text-[#0C5C44] tabular-nums">
              <CheckCircleIcon size={13} />
              {summaryStats.redeemedCount}
            </span>
          </div>
          <p
            translate="no"
            className="mt-2 font-mono text-lg font-bold text-[#0E1E2B] tabular-nums"
          >
            {formatXofAmount(summaryStats.redeemedXof, language)}
          </p>
          <p
            translate="no"
            className="font-mono text-xs font-semibold text-[#3D515F] tabular-nums"
          >
            {formatSatsAmount(summaryStats.redeemedSats, language)}
          </p>
        </div>

        {/* 3. Expired / Refundable + Reclaimed */}
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#3D515F]">
              {language === 'fr'
                ? 'Expirés · Remboursables'
                : 'Expired · Refundable'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#FBF2E6] px-1.5 py-0.5 font-mono text-xs font-bold text-[#9B5305] tabular-nums">
              <ClockLockIcon size={13} />
              {summaryStats.expiredCount}
            </span>
          </div>
          <p
            translate="no"
            className="mt-2 font-mono text-lg font-bold text-[#9B5305] tabular-nums"
          >
            {formatXofAmount(summaryStats.expiredXof, language)}
          </p>
          <p
            translate="no"
            className="font-mono text-xs text-[#4C616F] tabular-nums"
          >
            {formatSatsAmount(summaryStats.expiredSats, language)} ·{' '}
            {language === 'fr' ? 'Récupérés' : 'Reclaimed'}:{' '}
            {summaryStats.refundedCount} (
            {formatSatsAmount(summaryStats.refundedSats, language)})
          </p>
        </div>

        {/* 4. Live FX Rate & Global NUT-07 Refresh */}
        <div className="flex flex-col justify-between gap-2 p-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#3D515F]">
                {t.issue.fxRateLabel}
              </span>
              <span className="rounded-[4px] bg-[#E3E9E5] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0E1E2B]">
                {settings.manualFxRateXofPerBtc
                  ? language === 'fr'
                    ? 'MANUEL'
                    : 'MANUAL'
                  : 'BTC/XOF'}
              </span>
            </div>
            <p
              translate="no"
              className="mt-1 font-mono text-sm font-bold text-[#0E1E2B] tabular-nums"
            >
              1 BTC = {formatXofAmount(effectiveFxRateXofPerBtc, language)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshFx}
              disabled={isRefreshingFx}
              className="kb-btn-secondary flex-1 px-2.5 py-1.5 text-xs"
            >
              {isRefreshingFx ? (
                <SpinnerRingIcon size={14} />
              ) : (
                <RefreshIcon size={14} />
              )}
              <span>{t.issue.refreshFxButton}</span>
            </button>

            {vouchers.length > 0 ? (
              <button
                type="button"
                onClick={handleCheckAllNut7}
                disabled={isCheckingAllNut7}
                aria-busy={isCheckingAllNut7}
                className="kb-btn-secondary flex-1 px-2.5 py-1.5 text-xs"
              >
                {isCheckingAllNut7 ? (
                  <SpinnerRingIcon size={14} />
                ) : (
                  <ShieldCheckIcon size={14} />
                )}
                <span>NUT-07</span>
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Collapsible Settings & Backup Bar */}
      {settingsOpen ? (
        <section
          id="ledger-settings-panel"
          aria-label={
            language === 'fr'
              ? 'Configuration du mint, cours BTC/XOF et sauvegarde JSON'
              : 'Mint configuration, BTC/XOF rate, and JSON backup'
          }
          className="rounded-[12px] border border-[#CFD8D4] bg-[#FAFBF9] p-4 sm:p-5"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Mint URL & Manual BTC/XOF Rate Override */}
            <form
              onSubmit={handleSaveSettings}
              className="flex flex-col gap-4 lg:col-span-7"
            >
              <h2 className="type-h3 text-[#0E1E2B]">
                {language === 'fr'
                  ? 'Paramètres du Mint Cashu & Cours BTC/FCFA'
                  : 'Cashu Mint & BTC/FCFA Rate Settings'}
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="ledger-mint-url"
                    className="type-label text-[#0E1E2B]"
                  >
                    {language === 'fr'
                      ? 'URL du Mint Cashu (NUT-04 / NUT-07 / NUT-11)'
                      : 'Cashu Mint URL (NUT-04 / NUT-07 / NUT-11)'}
                  </label>
                  <input
                    id="ledger-mint-url"
                    type="url"
                    value={mintUrlDraft}
                    onChange={(e) => setMintUrlDraft(e.target.value)}
                    placeholder="https://testnut.cashu.space…"
                    className="kb-input mt-1.5 font-mono text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ledger-manual-fx"
                    className="type-label text-[#0E1E2B]"
                  >
                    {language === 'fr'
                      ? 'Cours manuel BTC / FCFA (optionnel)'
                      : 'Manual BTC / FCFA rate override (optional)'}
                  </label>
                  <input
                    id="ledger-manual-fx"
                    type="number"
                    inputMode="numeric"
                    min={1000000}
                    step={100000}
                    value={manualFxDraft}
                    onChange={(e) => setManualFxDraft(e.target.value)}
                    placeholder="62000000…"
                    className="kb-input mt-1.5 font-mono text-xs tabular-nums"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button type="submit" className="kb-btn-primary text-xs">
                  <CheckCircleIcon size={15} />
                  <span>
                    {language === 'fr'
                      ? 'Enregistrer les paramètres'
                      : 'Save settings'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMintUrlDraft(DEFAULT_MINT_URL);
                    setManualFxDraft('');
                    updateSettings({
                      mintUrl: DEFAULT_MINT_URL,
                      manualFxRateXofPerBtc: null,
                    });
                  }}
                  className="kb-btn-secondary text-xs"
                >
                  <span>
                    {language === 'fr'
                      ? 'Rétablir Testnut par défaut'
                      : 'Restore default Testnut'}
                  </span>
                </button>
              </div>
            </form>

            {/* Right: JSON Backup Export / Import & Safe Reset with Inline Confirmation */}
            <div className="flex flex-col justify-between gap-4 border-t border-[#CFD8D4] pt-4 lg:col-span-5 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
              <div>
                <h2 className="type-h3 text-[#0E1E2B]">
                  {language === 'fr'
                    ? 'Sauvegarde locale JSON & Réinitialisation'
                    : 'Local JSON Backup & Demo Reset'}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#4C616F]">
                  {language === 'fr'
                    ? 'Exportez vos jetons Cashu NUT-11 et clés locales dans un fichier JSON, ou restaurez un coffre existant.'
                    : 'Export your NUT-11 Cashu tokens and local keys to a JSON file, or restore an existing vault.'}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="kb-btn-secondary text-xs"
                  >
                    <DownloadIcon size={15} />
                    <span>{t.ledger.exportBackupButton}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="kb-btn-secondary text-xs"
                  >
                    <UploadIcon size={15} />
                    <span>{t.ledger.importBackupButton}</span>
                  </button>
                </div>

                {importError ? (
                  <p
                    role="alert"
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#A62329]"
                  >
                    <AlertTriangleIcon size={14} className="shrink-0" />
                    <span>{importError}</span>
                  </p>
                ) : null}
              </div>

              {/* Destructive Reset with Mandatory Inline Confirmation Step */}
              <div className="border-t border-[#CFD8D4] pt-3">
                {!confirmResetOpen ? (
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(true)}
                    className="kb-btn-destructive text-xs"
                  >
                    <AlertTriangleIcon size={15} />
                    <span>{t.ledger.resetDemoDataButton}</span>
                  </button>
                ) : (
                  <div
                    role="alert"
                    className="rounded-[8px] border border-[#A62329] bg-[#FBEBEC] p-3 text-xs"
                  >
                    <p className="font-bold text-[#A62329]">
                      {language === 'fr'
                        ? 'Confirmer la suppression des bons locaux ?'
                        : 'Confirm clearing local vouchers?'}
                    </p>
                    <p className="mt-1 text-[#0E1E2B]">
                      {language === 'fr'
                        ? 'Exportez une sauvegarde JSON avant de continuer si vous détenez des bons non encaissés.'
                        : 'Export a JSON backup before proceeding if you hold unspent vouchers.'}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmReset}
                        className="kb-btn-destructive text-xs"
                      >
                        <span>
                          {language === 'fr'
                            ? 'Confirmer la réinitialisation'
                            : 'Confirm reset'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmResetOpen(false)}
                        className="kb-btn-secondary text-xs"
                      >
                        <span>
                          {language === 'fr' ? 'Annuler' : 'Cancel'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Hairline-Ruled Operational Ledger Table OR Designed Empty State */}
      {vouchers.length === 0 ? (
        <section
          aria-labelledby="ledger-empty-heading"
          className="rounded-[12px] border border-[#CFD8D4] bg-[#FAFBF9] p-6 sm:p-8"
        >
          <div className="max-w-xl">
            <div className="inline-flex size-10 items-center justify-center rounded-[8px] border border-[#CFD8D4] bg-[#E3E9E5] text-[#0E1E2B]">
              <LockSealIcon size={20} />
            </div>
            <h2 id="ledger-empty-heading" className="type-h2 mt-3 text-[#0E1E2B]">
              {t.ledger.emptyTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#3D515F]">
              {t.ledger.emptyReason}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link to="/issue" className="kb-btn-primary text-xs no-underline">
                <SendVoucherIcon size={16} />
                <span>{t.ledger.emptyCta}</span>
              </Link>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="kb-btn-secondary text-xs"
              >
                <UploadIcon size={16} />
                <span>{t.ledger.importBackupButton}</span>
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section aria-label={t.ledger.pageTitle} className="flex flex-col">
          {/* Desktop Column Headers (>= 768px) */}
          <div className="hidden border-b border-[#637683] pb-2.5 text-xs font-semibold text-[#3D515F] md:grid md:grid-cols-12 md:gap-4">
            <div className="md:col-span-3">{t.ledger.colVoucher}</div>
            <div className="md:col-span-2">{t.ledger.colVendor}</div>
            <div className="md:col-span-2">{t.ledger.colAmount}</div>
            <div className="md:col-span-2">{t.ledger.colLocktime}</div>
            <div className="md:col-span-3">{t.ledger.colActions}</div>
          </div>

          {/* Hairline-Ruled Ledger Rows */}
          <div className="divide-y divide-[#CFD8D4] border-b border-[#CFD8D4]">
            {vouchers.map((voucher) => {
              const effectiveStatus = getEffectiveVoucherStatus(voucher);
              const locktimeInfo = formatLocktimeWindow(
                voucher.locktimeUnix,
                nowSec,
                language
              );
              const isCheckingNut7 = Boolean(checkingNut7ById[voucher.id]);
              const isReclaiming = Boolean(reclaimingById[voucher.id]);
              const nut7State = nut7StateById[voucher.id];
              const rowError = rowErrorById[voucher.id];

              const matchingReceipt = receipts.find(
                (r) =>
                  r.voucherHash === voucher.tokenHash ||
                  (voucher.nostrReceiptEventId &&
                    r.eventId === voucher.nostrReceiptEventId)
              );
              const hasReceiptLink =
                effectiveStatus === 'redeemed' ||
                Boolean(voucher.nostrReceiptEventId) ||
                Boolean(matchingReceipt);

              const canReclaimRefund =
                effectiveStatus === 'expired' && nut7State !== 'SPENT';

              return (
                <article
                  key={voucher.id}
                  aria-label={`${voucher.serialCode} ${voucher.vendorName}`}
                  className="py-4"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center">
                    {/* Col 1 (3 cols): Voucher Serial, Hash & Status Badge */}
                    <div className="flex flex-col gap-1 min-w-0 md:col-span-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          translate="no"
                          className="font-mono text-xs font-bold text-[#0E1E2B] tabular-nums"
                        >
                          {voucher.serialCode}
                        </span>

                        {effectiveStatus === 'locked' && (
                          <span className="inline-flex items-center gap-1 rounded-[4px] border border-[#0C5C44] bg-[#E5F2ED] px-1.5 py-0.5 text-[11px] font-semibold text-[#0C5C44]">
                            <LockSealIcon size={12} />
                            <span>{t.statuses.locked}</span>
                          </span>
                        )}

                        {effectiveStatus === 'expired' && (
                          <span className="inline-flex items-center gap-1 rounded-[4px] border border-[#9B5305] bg-[#FBF2E6] px-1.5 py-0.5 text-[11px] font-bold text-[#9B5305]">
                            <ClockLockIcon size={12} />
                            <span>{t.statuses.expired}</span>
                          </span>
                        )}

                        {effectiveStatus === 'redeemed' && (
                          <span className="inline-flex items-center gap-1 rounded-[4px] border border-[#0C5C44] bg-[#E5F2ED] px-1.5 py-0.5 text-[11px] font-semibold text-[#0C5C44]">
                            <CheckCircleIcon size={12} />
                            <span>{t.statuses.redeemed}</span>
                          </span>
                        )}

                        {effectiveStatus === 'refunded' && (
                          <span className="inline-flex items-center gap-1 rounded-[4px] border border-[#637683] bg-[#E3E9E5] px-1.5 py-0.5 text-[11px] font-semibold text-[#0E1E2B]">
                            <CheckCircleIcon size={12} />
                            <span>{t.statuses.refunded}</span>
                          </span>
                        )}
                      </div>

                      <p
                        translate="no"
                        className="type-data-row text-[11px] text-[#4C616F]"
                      >
                        SHA-256: {truncateIdentifier(voucher.tokenHash, 12, 8)}
                      </p>

                      {nut7State ? (
                        <p
                          translate="no"
                          className="font-mono text-[11px] font-semibold text-[#3D515F]"
                        >
                          NUT-07: {nut7State}
                        </p>
                      ) : null}

                      {voucher.memo ? (
                        <p className="text-xs text-[#3D515F] truncate">
                          {voucher.memo}
                        </p>
                      ) : null}
                    </div>

                    {/* Col 2 (2 cols): Merchant & Category */}
                    <div className="flex flex-col gap-0.5 min-w-0 md:col-span-2">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-[#0E1E2B]">
                        <CategoryIcon
                          category={voucher.purpose}
                          size={14}
                          className="shrink-0 text-[#0C5C44]"
                        />
                        <span className="truncate">{voucher.vendorName}</span>
                      </p>
                      <p className="text-xs text-[#4C616F]">
                        {voucher.vendorDistrict}
                      </p>
                      <p className="text-[11px] font-medium text-[#3D515F]">
                        {t.categories[voucher.purpose]}
                      </p>
                    </div>

                    {/* Col 3 (2 cols): Amount in FCFA & Sats */}
                    <div className="flex flex-row items-baseline justify-between gap-2 md:col-span-2 md:flex-col md:justify-start">
                      <span
                        translate="no"
                        className="font-mono text-sm font-bold text-[#0E1E2B] tabular-nums"
                      >
                        {formatXofAmount(voucher.amountXof, language)}
                      </span>
                      <span
                        translate="no"
                        className="font-mono text-xs font-semibold text-[#9B5305] tabular-nums"
                      >
                        {formatSatsAmount(voucher.amountSats, language)}
                      </span>
                    </div>

                    {/* Col 4 (2 cols): Live 1-Second Locktime Countdown */}
                    <div className="flex flex-row items-center justify-between gap-2 md:col-span-2 md:flex-col md:items-start">
                      <span
                        translate="no"
                        className="font-mono text-xs text-[#3D515F] tabular-nums"
                      >
                        {locktimeInfo.formattedDate}
                      </span>
                      <span
                        translate="no"
                        className={`inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                          effectiveStatus === 'refunded'
                            ? 'bg-[#E3E9E5] text-[#3D515F]'
                            : effectiveStatus === 'redeemed'
                              ? 'bg-[#E5F2ED] text-[#0C5C44]'
                              : locktimeInfo.isExpired
                                ? 'bg-[#FBF2E6] text-[#9B5305]'
                                : 'bg-[#E5F2ED] text-[#0C5C44]'
                        }`}
                      >
                        <ClockLockIcon size={12} />
                        <span>{locktimeInfo.countdownLabel}</span>
                      </span>
                    </div>

                    {/* Col 5 (3 cols): Operational Row Actions (all >= 44px touch targets) */}
                    <div className="flex flex-wrap items-center gap-2 md:col-span-3">
                      <button
                        type="button"
                        onClick={() => handleCheckSingleNut7(voucher)}
                        disabled={isCheckingNut7}
                        aria-busy={isCheckingNut7}
                        className="kb-btn-secondary px-2.5 py-1.5 text-xs"
                      >
                        {isCheckingNut7 ? (
                          <SpinnerRingIcon size={14} />
                        ) : (
                          <RefreshIcon size={14} />
                        )}
                        <span>
                          {language === 'fr'
                            ? 'Vérifier NUT-7'
                            : 'Check NUT-7'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReclaimExpiredVoucher(voucher)}
                        disabled={!canReclaimRefund || isReclaiming}
                        aria-busy={isReclaiming}
                        className={
                          canReclaimRefund
                            ? 'kb-btn-primary px-2.5 py-1.5 text-xs'
                            : 'kb-btn-secondary px-2.5 py-1.5 text-xs'
                        }
                      >
                        {isReclaiming ? (
                          <>
                            <SpinnerRingIcon size={14} />
                            <span>{t.ledger.actionReclaiming}</span>
                          </>
                        ) : (
                          <>
                            <KeyIcon size={14} />
                            <span>
                              {language === 'fr'
                                ? 'Récupérer (NUT-11)'
                                : 'Reclaim (NUT-11)'}
                            </span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyToken(voucher)}
                        className="kb-btn-secondary px-2.5 py-1.5 text-xs"
                      >
                        <CopyIcon size={14} />
                        <span>{language === 'fr' ? 'Copier' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAtCounter(voucher)}
                        className="kb-btn-secondary px-2.5 py-1.5 text-xs"
                      >
                        <StoreCounterIcon size={14} />
                        <span>
                          {language === 'fr' ? 'Comptoir' : 'Counter'}
                        </span>
                      </button>

                      {hasReceiptLink ? (
                        <Link
                          to={`/vendors?hash=${voucher.tokenHash}`}
                          className="kb-btn-emerald px-2.5 py-1.5 text-xs no-underline"
                        >
                          <ShieldCheckIcon size={14} />
                          <span>{language === 'fr' ? 'Reçu' : 'Receipt'}</span>
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {rowError ? (
                    <div
                      role="alert"
                      className="mt-2.5 flex items-center gap-2 rounded-[6px] border border-[#A62329] bg-[#FBEBEC] px-3 py-2 text-xs text-[#A62329]"
                    >
                      <AlertTriangleIcon size={14} className="shrink-0" />
                      <span>{rowError}</span>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default LedgerPage;
