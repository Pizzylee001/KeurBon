import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangleIcon,
  CategoryIcon,
  CheckCircleIcon,
  ClockLockIcon,
  CopyIcon,
  KeyIcon,
  LockSealIcon,
  RefreshIcon,
  SendVoucherIcon,
  ShieldCheckIcon,
  SpinnerRingIcon,
  StoreCounterIcon,
} from '../components/Icons';
import {
  formatLocktimeWindow,
  formatSatsAmount,
  formatXofAmount,
  truncateIdentifier,
} from '../components/VoucherStub';
import { DEMO_UNAUTHORIZED_ATTACKER_KEYS } from '../data/demoVendors';
import { cashuService } from '../lib/cashu';
import { fxService } from '../lib/fx';
import { nostrService } from '../lib/nostr';
import { useKeurBonStore } from '../state/store';
import type {
  CashuCryptoService,
  ClaimLockedVoucherParams,
  ClaimLockedVoucherResult,
  InspectionResult,
  NostrReceiptPayload,
  NostrReceiptService,
  PublishNostrReceiptParams,
  PurposeCategory,
} from '../types/keurbon';

type ExtendedCashuService = CashuCryptoService & {
  inspectTokenOffline?: (
    params:
      | string
      | {
          token: string;
          activeVendorPubkeyHex?: string;
          mintUrlFallback?: string;
        },
    activeVendorPubkeyHex?: string,
    mintUrlFallback?: string
  ) => Promise<InspectionResult>;
  claimLockedVoucher?: (
    params: ClaimLockedVoucherParams & { forceAttempt?: boolean },
    options?: { forceAttempt?: boolean }
  ) => Promise<ClaimLockedVoucherResult>;
  claimVoucherAtCounter: (
    params: ClaimLockedVoucherParams & { forceAttempt?: boolean }
  ) => Promise<ClaimLockedVoucherResult>;
};

type ExtendedNostrService = NostrReceiptService & {
  publishFulfillmentReceipt?: (
    params: PublishNostrReceiptParams
  ) => Promise<NostrReceiptPayload>;
};

function normalizeXOnlyHex(hex: string | null | undefined): string {
  if (!hex) return '';
  const clean = hex.trim().toLowerCase();
  if (clean.length === 66 && (clean.startsWith('02') || clean.startsWith('03'))) {
    return clean.slice(2);
  }
  return clean;
}

export function RedeemPage() {
  const {
    language,
    t,
    activeVendor,
    vendors,
    vouchers,
    settings,
    effectiveFxRateXofPerBtc,
    lastMintedToken,
    setActiveVendorId,
    setActiveRole,
    updateVoucherByTokenHash,
    addReceipt,
    pushToast,
  } = useKeurBonStore();

  const [tokenInput, setTokenInput] = useState<string>(() =>
    lastMintedToken && lastMintedToken.trim() ? lastMintedToken.trim() : ''
  );
  const lastAutoLoadedRef = useRef<string | null>(
    lastMintedToken && lastMintedToken.trim() ? lastMintedToken.trim() : null
  );

  useEffect(() => {
    const cleanLast = lastMintedToken ? lastMintedToken.trim() : '';
    if (cleanLast && !tokenInput && lastAutoLoadedRef.current !== cleanLast) {
      lastAutoLoadedRef.current = cleanLast;
      setTokenInput(cleanLast);
    }
  }, [lastMintedToken, tokenInput]);

  const [isAttackerMode, setIsAttackerMode] = useState<boolean>(false);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [inspection, setInspection] = useState<InspectionResult | null>(null);

  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [claimResult, setClaimResult] = useState<ClaimLockedVoucherResult | null>(null);
  const [claimedReceipt, setClaimedReceipt] = useState<NostrReceiptPayload | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const [isTestingAttack, setIsTestingAttack] = useState<boolean>(false);
  const [attackRejectionProof, setAttackRejectionProof] = useState<string | null>(null);
  const [sealTriggerKey, setSealTriggerKey] = useState<number>(0);
  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000));

  const inspectReqIdRef = useRef<number>(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const effectiveCounterIdentity = useMemo(() => {
    if (isAttackerMode) {
      return {
        id: 'attacker-unauthorized-demo',
        name:
          language === 'fr'
            ? 'Tiers non autorisé (Simulation Attaquant)'
            : 'Unauthorized 3rd-Party (Attacker Simulation)',
        district:
          language === 'fr'
            ? 'Clé externe non enregistrée'
            : 'Unregistered external keypair',
        npub: DEMO_UNAUTHORIZED_ATTACKER_KEYS.npub,
        pubkeyHex: DEMO_UNAUTHORIZED_ATTACKER_KEYS.pubkeyHex,
        privkeyHex: DEMO_UNAUTHORIZED_ATTACKER_KEYS.privkeyHex,
        category: 'health' as PurposeCategory,
        isAttacker: true,
      };
    }
    return {
      id: activeVendor.id,
      name: activeVendor.name,
      district: activeVendor.district,
      npub: activeVendor.npub,
      pubkeyHex: activeVendor.pubkeyHex,
      privkeyHex: activeVendor.privkeyHex ?? '',
      category: activeVendor.category,
      isAttacker: false,
    };
  }, [isAttackerMode, activeVendor, language]);

  const runOfflineInspection = useCallback(
    async (rawToken: string, counterPubkeyHex: string) => {
      const clean = rawToken.trim();
      if (!clean) {
        setInspection(null);
        setIsInspecting(false);
        return;
      }

      const reqId = ++inspectReqIdRef.current;
      setIsInspecting(true);

      try {
        const svc = cashuService as ExtendedCashuService;
        const result = await svc.inspectVoucherToken(
          clean,
          counterPubkeyHex,
          settings.mintUrl
        );

        if (reqId !== inspectReqIdRef.current) return;

        const normalizedLocked = normalizeXOnlyHex(result.lockedToPubkeyHex);
        const normalizedCounter = normalizeXOnlyHex(counterPubkeyHex);
        const computedMatch =
          result.p2pkLocked &&
          normalizedLocked.length > 0 &&
          normalizedLocked === normalizedCounter;

        setInspection({
          ...result,
          matchesActiveVendor: result.matchesActiveVendor || computedMatch,
        });
        if (result.dleqAllValid && computedMatch) {
          setSealTriggerKey((prev) => prev + 1);
        }
      } catch (err) {
        if (reqId !== inspectReqIdRef.current) return;
        const msg =
          err instanceof Error
            ? err.message
            : language === 'fr'
              ? 'Format de jeton Cashu invalide.'
              : 'Invalid Cashu token format.';
        setInspection({
          validFormat: false,
          mintUrl: settings.mintUrl,
          amountSats: 0,
          totalProofs: 0,
          p2pkLocked: false,
          lockedToPubkeyHex: null,
          matchesActiveVendor: false,
          refundPubkeyHex: null,
          locktimeUnix: null,
          isExpired: false,
          dleqAllValid: false,
          dleqDetail: msg,
          tokenHash: '',
          errorCode: 'MALFORMED_TOKEN',
          errorMessage: msg,
        });
      } finally {
        if (reqId === inspectReqIdRef.current) {
          setIsInspecting(false);
        }
      }
    },
    [settings.mintUrl, language]
  );

  // Automatic debounced offline inspection on paste/change or counter key switch
  useEffect(() => {
    const clean = tokenInput.trim();
    if (!clean) {
      setInspection(null);
      setIsInspecting(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void runOfflineInspection(clean, effectiveCounterIdentity.pubkeyHex);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [tokenInput, effectiveCounterIdentity.pubkeyHex, runOfflineInspection]);

  const fallbackMintedToken = useMemo(() => {
    if (lastMintedToken && lastMintedToken.trim().length > 0) {
      return lastMintedToken.trim();
    }
    const lockedVoucher = vouchers.find((v) => v.status === 'locked' && v.token);
    return lockedVoucher?.token ?? vouchers[0]?.token ?? null;
  }, [lastMintedToken, vouchers]);

  const matchedStoredVoucher = useMemo(() => {
    if (!inspection) return null;
    const clean = tokenInput.trim();
    return (
      vouchers.find(
        (v) =>
          (inspection.tokenHash && v.tokenHash === inspection.tokenHash) ||
          (clean && v.token.trim() === clean)
      ) ?? null
    );
  }, [inspection, tokenInput, vouchers]);

  const lockedTargetVendor = useMemo(() => {
    if (!inspection?.lockedToPubkeyHex) return matchedStoredVoucher ? {
      id: matchedStoredVoucher.vendorId,
      name: matchedStoredVoucher.vendorName,
      district: matchedStoredVoucher.vendorDistrict,
      npub: matchedStoredVoucher.vendorNpub,
      pubkeyHex: matchedStoredVoucher.vendorPubkeyHex,
      category: matchedStoredVoucher.purpose,
    } : null;

    const targetXOnly = normalizeXOnlyHex(inspection.lockedToPubkeyHex);
    const found = vendors.find(
      (v) => normalizeXOnlyHex(v.pubkeyHex) === targetXOnly
    );
    if (found) {
      return {
        id: found.id,
        name: found.name,
        district: found.district,
        npub: found.npub,
        pubkeyHex: found.pubkeyHex,
        category: found.category,
      };
    }
    if (matchedStoredVoucher) {
      return {
        id: matchedStoredVoucher.vendorId,
        name: matchedStoredVoucher.vendorName,
        district: matchedStoredVoucher.vendorDistrict,
        npub: matchedStoredVoucher.vendorNpub,
        pubkeyHex: matchedStoredVoucher.vendorPubkeyHex,
        category: matchedStoredVoucher.purpose,
      };
    }
    return null;
  }, [inspection, vendors, matchedStoredVoucher]);

  const keyMatchesCounter = useMemo(() => {
    if (!inspection || !inspection.validFormat || !inspection.p2pkLocked) {
      return false;
    }
    const lockedX = normalizeXOnlyHex(inspection.lockedToPubkeyHex);
    const counterX = normalizeXOnlyHex(effectiveCounterIdentity.pubkeyHex);
    if (lockedX && counterX) {
      return lockedX === counterX;
    }
    return inspection.matchesActiveVendor && !isAttackerMode;
  }, [inspection, effectiveCounterIdentity.pubkeyHex, isAttackerMode]);

  const locktimeWindow = useMemo(() => {
    if (!inspection?.locktimeUnix) return null;
    return formatLocktimeWindow(inspection.locktimeUnix, nowSec, language);
  }, [inspection?.locktimeUnix, nowSec, language]);

  const isTokenExpired = useMemo(() => {
    if (!inspection) return false;
    if (locktimeWindow) return locktimeWindow.isExpired;
    return inspection.isExpired;
  }, [inspection, locktimeWindow]);

  const displayAmountSats =
    claimResult?.claimedAmountSats ||
    inspection?.amountSats ||
    matchedStoredVoucher?.amountSats ||
    0;

  const displayAmountXof = useMemo(() => {
    if (matchedStoredVoucher && matchedStoredVoucher.amountXof > 0) {
      return matchedStoredVoucher.amountXof;
    }
    return fxService.satsToXof(displayAmountSats, effectiveFxRateXofPerBtc);
  }, [matchedStoredVoucher, displayAmountSats, effectiveFxRateXofPerBtc]);

  const displayCategory: PurposeCategory =
    matchedStoredVoucher?.purpose ??
    lockedTargetVendor?.category ??
    activeVendor.category;

  const handleLoadLastMinted = () => {
    if (!fallbackMintedToken) {
      pushToast({
        tone: 'info',
        title:
          language === 'fr'
            ? 'Aucun bon émis dans cette session'
            : 'No minted voucher in this session',
        detail:
          language === 'fr'
            ? 'Rendez-vous sur /issue pour verrouiller un bon NUT-11.'
            : 'Visit /issue to lock a NUT-11 voucher first.',
      });
      return;
    }
    setClaimResult(null);
    setClaimedReceipt(null);
    setClaimError(null);
    setAttackRejectionProof(null);
    setTokenInput(fallbackMintedToken);
    void runOfflineInspection(fallbackMintedToken, effectiveCounterIdentity.pubkeyHex);
  };

  const handleInspectClick = () => {
    if (!tokenInput.trim()) return;
    setClaimError(null);
    setAttackRejectionProof(null);
    void runOfflineInspection(tokenInput.trim(), effectiveCounterIdentity.pubkeyHex);
  };

  const handleClear = () => {
    setTokenInput('');
    setInspection(null);
    setClaimResult(null);
    setClaimedReceipt(null);
    setClaimError(null);
    setAttackRejectionProof(null);
  };

  const handleSelectVendor = (vendorId: string) => {
    setIsAttackerMode(false);
    setActiveVendorId(vendorId);
    setActiveRole('vendor');
    setClaimError(null);
    setAttackRejectionProof(null);
  };

  const handleToggleAttackerMode = () => {
    setIsAttackerMode((prev) => !prev);
    setClaimError(null);
    setAttackRejectionProof(null);
  };

  const handleClaimAndPublish = async () => {
    const clean = tokenInput.trim();
    if (!clean || !inspection || isClaiming) return;

    if (!activeVendor.privkeyHex) {
      setClaimError(
        language === 'fr'
          ? 'Ce profil commerçant ne dispose pas de clé privée locale dans ce navigateur pour signer le témoin Schnorr NUT-11.'
          : 'This merchant profile does not hold a local private key in this browser to sign the NUT-11 Schnorr witness.'
      );
      return;
    }

    setIsClaiming(true);
    setClaimError(null);
    setAttackRejectionProof(null);

    try {
      const cSvc = cashuService as ExtendedCashuService;
      const targetMintUrl = inspection.mintUrl || settings.mintUrl;

      const claimed = cSvc.claimLockedVoucher
        ? await cSvc.claimLockedVoucher({
            token: clean,
            vendorPrivkeyHex: activeVendor.privkeyHex,
            mintUrl: targetMintUrl,
          })
        : await cSvc.claimVoucherAtCounter({
            token: clean,
            vendorPrivkeyHex: activeVendor.privkeyHex,
            mintUrl: targetMintUrl,
          });

      setClaimResult(claimed);

      const nSvc = nostrService as ExtendedNostrService;
      const voucherHash = claimed.tokenHash || inspection.tokenHash;
      const settledSats = claimed.claimedAmountSats || inspection.amountSats;
      const settledXof =
        matchedStoredVoucher?.amountXof ||
        fxService.satsToXof(settledSats, effectiveFxRateXofPerBtc);

      let receipt: NostrReceiptPayload;
      if (typeof nSvc.publishFulfillmentReceipt === 'function') {
        receipt = await nSvc.publishFulfillmentReceipt({
          voucherHash,
          vendor: activeVendor,
          vendorPrivkeyHex: activeVendor.privkeyHex,
          amountSats: settledSats,
          amountXof: settledXof,
          category: displayCategory,
          mintUrl: claimed.mintUrl || targetMintUrl,
          relays: settings.relays,
        });
      } else {
        const signed = nSvc.createAndSignReceipt({
          voucherHash,
          vendor: activeVendor,
          vendorPrivkeyHex: activeVendor.privkeyHex,
          amountSats: settledSats,
          amountXof: settledXof,
          category: displayCategory,
          mintUrl: claimed.mintUrl || targetMintUrl,
        });
        const relayResult = await nSvc.publishReceiptToRelays(signed, settings.relays);
        receipt = {
          ...signed,
          relaysPublished: relayResult.publishedRelays,
        };
      }

      setClaimedReceipt(receipt);
      addReceipt(receipt);
      updateVoucherByTokenHash(voucherHash, 'redeemed', {
        dleqVerified: inspection.dleqAllValid,
        nostrReceiptEventId: receipt.eventId,
        nostrReceiptRelays: receipt.relaysPublished,
        redeemedAt: receipt.createdAt,
      });

      setSealTriggerKey((prev) => prev + 1);
      pushToast({
        tone: 'success',
        title:
          language === 'fr'
            ? 'Sats encaissés & reçu Nostr kind 30078 publié'
            : 'Sats claimed & Nostr kind 30078 receipt published',
        detail: `${formatXofAmount(settledXof, language)} (${formatSatsAmount(
          settledSats,
          language
        )})`,
      });
    } catch (err) {
      const rawMsg =
        err instanceof Error
          ? err.message
          : language === 'fr'
            ? 'Échec lors de la réclamation du bon sur le mint.'
            : 'Failed to claim voucher against the mint.';
      setClaimError(rawMsg);
      pushToast({
        tone: 'error',
        title: t.redeem.step3Fail,
        detail: rawMsg,
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleTestLiveMintRejection = async () => {
    const clean = tokenInput.trim();
    if (!clean || !inspection || isTestingAttack) return;

    setIsTestingAttack(true);
    setAttackRejectionProof(null);
    setClaimError(null);

    const wrongPrivkeyHex = isAttackerMode
      ? DEMO_UNAUTHORIZED_ATTACKER_KEYS.privkeyHex
      : keyMatchesCounter
        ? DEMO_UNAUTHORIZED_ATTACKER_KEYS.privkeyHex
        : activeVendor.privkeyHex || DEMO_UNAUTHORIZED_ATTACKER_KEYS.privkeyHex;

    try {
      const cSvc = cashuService as ExtendedCashuService;
      const targetMintUrl = inspection.mintUrl || settings.mintUrl;

      if (cSvc.claimLockedVoucher) {
        await cSvc.claimLockedVoucher(
          {
            token: clean,
            vendorPrivkeyHex: wrongPrivkeyHex,
            mintUrl: targetMintUrl,
            forceAttempt: true,
          },
          { forceAttempt: true }
        );
      } else {
        await cSvc.claimVoucherAtCounter({
          token: clean,
          vendorPrivkeyHex: wrongPrivkeyHex,
          mintUrl: targetMintUrl,
          forceAttempt: true,
        });
      }

      setAttackRejectionProof(
        language === 'fr'
          ? 'Réponse inattendue : le mint n’a pas rejeté la transaction.'
          : 'Unexpected response: mint did not reject the transaction.'
      );
    } catch (err) {
      const rawError =
        err instanceof Error ? err.message : String(err);
      const formattedProof = rawError.includes('20008')
        ? rawError
        : `HTTP 400 · code=20008 (P2PK spend conditions are not met) · ${rawError}`;
      setAttackRejectionProof(formattedProof);
      pushToast({
        tone: 'info',
        title:
          language === 'fr'
            ? 'Rejet cryptographique NUT-11 confirmé par le mint'
            : 'NUT-11 cryptographic rejection confirmed by mint',
        detail: 'code 20008: P2PK spend conditions are not met',
      });
    } finally {
      setIsTestingAttack(false);
    }
  };

  const handleCopyReceiptJson = async () => {
    if (!claimedReceipt) return;
    const jsonStr = JSON.stringify(claimedReceipt.rawEvent ?? claimedReceipt, null, 2);
    try {
      await navigator.clipboard.writeText(jsonStr);
      pushToast({
        tone: 'success',
        title:
          language === 'fr'
            ? 'JSON du reçu kind 30078 copié'
            : 'Kind 30078 receipt JSON copied',
        detail: truncateIdentifier(claimedReceipt.eventId, 14, 10),
      });
    } catch {
      pushToast({
        tone: 'info',
        title: t.redeem.copyReceiptJsonButton,
        detail: truncateIdentifier(claimedReceipt.eventId, 14, 10),
      });
    }
  };

  return (
    <div className="kb-animate-enter space-y-6 pb-12">
      {/* Route Header */}
      <header className="border-b border-[#CFD8D4] pb-5">
        <h1 className="type-h1 text-[#0E1E2B]">{t.redeem.pageTitle}</h1>
        <p className="type-body-large mt-2 text-[#3D515F]">
          {t.redeem.pageSubtitle}
        </p>
      </header>

      {/* Top Counter Session Bar */}
      <section
        aria-label={t.redeem.activeVendorBanner}
        className={`rounded-[12px] border p-4 sm:p-5 ${
          isAttackerMode
            ? 'border-[#A62329] bg-[#FBEBEC]'
            : 'border-[#CFD8D4] bg-[#FAFBF9]'
        }`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Active Counter Profile Readout */}
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-semibold ${
                  isAttackerMode
                    ? 'bg-[#A62329] text-[#FAFBF9]'
                    : 'bg-[#E5F2ED] text-[#0C5C44]'
                }`}
              >
                {isAttackerMode ? (
                  <AlertTriangleIcon size={14} />
                ) : (
                  <StoreCounterIcon size={14} />
                )}
                <span>{t.redeem.activeVendorBanner}</span>
              </span>

              <span className="inline-flex items-center gap-1 rounded-[6px] border border-[#CFD8D4] bg-[#F1F4F2] px-2 py-0.5 font-mono text-xs font-medium text-[#3D515F]">
                <KeyIcon size={12} className="text-[#0C5C44]" />
                secp256k1 Schnorr
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="type-h3 text-[#0E1E2B]">
                {effectiveCounterIdentity.name}
              </h2>
              <span className="text-sm font-medium text-[#3D515F]">
                {effectiveCounterIdentity.district}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#4C616F]">
              <p translate="no" className="type-data-row text-xs text-[#3D515F]">
                <span className="font-semibold text-[#4C616F]">npub: </span>
                {truncateIdentifier(effectiveCounterIdentity.npub, 18, 10)}
              </p>
              <p translate="no" className="type-data-row text-xs text-[#3D515F]">
                <span className="font-semibold text-[#4C616F]">P2PK hex: </span>
                {truncateIdentifier(effectiveCounterIdentity.pubkeyHex, 14, 10)}
              </p>
            </div>
          </div>

          {/* Counter Keypair Selector + Attacker Toggle */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="min-w-[230px]">
              <label
                htmlFor="counter-vendor-select"
                className="type-label mb-1 block text-[#0E1E2B]"
              >
                {t.redeem.switchVendorLabel}
              </label>
              <select
                id="counter-vendor-select"
                value={isAttackerMode ? '__attacker__' : activeVendor.id}
                onChange={(e) => {
                  if (e.target.value === '__attacker__') {
                    setIsAttackerMode(true);
                  } else {
                    handleSelectVendor(e.target.value);
                  }
                }}
                className="kb-input text-sm font-medium"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.district})
                  </option>
                ))}
                <option value="__attacker__">
                  {language === 'fr'
                    ? 'Simuler mauvaise clé (Attaquant)'
                    : 'Simulate wrong key (Attacker)'}
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleToggleAttackerMode}
              aria-pressed={isAttackerMode}
              className={
                isAttackerMode
                  ? 'kb-btn-destructive shrink-0 bg-[#A62329] text-[#FAFBF9]'
                  : 'kb-btn-destructive shrink-0'
              }
            >
              <AlertTriangleIcon size={16} />
              <span>
                {language === 'fr'
                  ? isAttackerMode
                    ? 'Quitter mode Attaquant'
                    : 'Simuler mauvaise clé (Attaquant)'
                  : isAttackerMode
                    ? 'Exit Attacker mode'
                    : 'Simulate wrong key (Attacker)'}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Vendor Pill Bar */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-[#CFD8D4] pt-3">
          {vendors.map((v) => {
            const isSelected = !isAttackerMode && v.id === activeVendor.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => handleSelectVendor(v.id)}
                aria-pressed={isSelected}
                className={`kb-pressable inline-flex min-h-[44px] items-center gap-2 rounded-[8px] border px-3 py-2 text-xs font-semibold ${
                  isSelected
                    ? 'border-[#0E1E2B] bg-[#0E1E2B] text-[#FAFBF9]'
                    : 'border-[#637683] bg-[#FAFBF9] text-[#0E1E2B] hover:bg-[#E3E9E5]'
                }`}
              >
                <CategoryIcon category={v.category} size={15} />
                <span>{v.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Token Intake Strip */}
      <section
        aria-labelledby="token-intake-heading"
        className="rounded-[12px] border border-[#CFD8D4] bg-[#FAFBF9] p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            id="token-intake-heading"
            htmlFor="voucher-token-input"
            className="type-label text-[#0E1E2B]"
          >
            {t.redeem.tokenInputLabel}
          </label>
          <span className="font-mono text-xs text-[#4C616F]">
            NUT-00 V4 / V3 · NUT-11 P2PK · NUT-12 DLEQ
          </span>
        </div>

        <textarea
          id="voucher-token-input"
          rows={3}
          value={tokenInput}
          onChange={(e) => {
            setClaimResult(null);
            setClaimedReceipt(null);
            setClaimError(null);
            setAttackRejectionProof(null);
            setTokenInput(e.target.value);
          }}
          spellCheck={false}
          autoComplete="off"
          placeholder={t.redeem.tokenInputPlaceholder}
          aria-describedby="voucher-token-helper"
          className="kb-input mt-2 font-mono text-xs leading-relaxed"
        />

        <p id="voucher-token-helper" className="type-caption mt-1.5 text-[#4C616F]">
          {t.redeem.tokenInputHelper}
        </p>

        {/* Action Strip (>=44px tap targets) */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleLoadLastMinted}
            className="kb-btn-primary text-sm"
          >
            <SendVoucherIcon size={16} />
            <span>{t.redeem.loadLastMintedButton}</span>
          </button>

          <button
            type="button"
            onClick={handleInspectClick}
            disabled={!tokenInput.trim() || isInspecting}
            aria-busy={isInspecting}
            className="kb-btn-secondary text-sm"
          >
            {isInspecting ? (
              <SpinnerRingIcon size={16} />
            ) : (
              <ShieldCheckIcon size={16} />
            )}
            <span>{t.redeem.inspectButton}</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={!tokenInput && !inspection}
            className="kb-btn-secondary text-sm"
          >
            <RefreshIcon size={16} />
            <span>{t.redeem.clearButton}</span>
          </button>

          {!fallbackMintedToken ? (
            <Link
              to="/issue"
              className="kb-btn-secondary text-sm no-underline"
            >
              <span>
                {language === 'fr'
                  ? 'Aucun bon récent : Émettre un bon (/issue)'
                  : 'No recent voucher: Issue a voucher (/issue)'}
              </span>
            </Link>
          ) : null}
        </div>
      </section>

      {/* Hairline Divider & 2-Column Verification Rail & Settlement Sheet */}
      <div className="border-t border-[#CFD8D4] pt-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-start">
          {/* Left Column (7 cols): 3-Row Cryptographic Inspection Rail */}
          <section
            aria-labelledby="inspection-rail-heading"
            className="kb-animate-enter space-y-4 md:col-span-7"
          >
            <h2 id="inspection-rail-heading" className="type-h2 text-[#0E1E2B]">
              {t.redeem.railTitle}
            </h2>

            <div className="divide-y divide-[#CFD8D4] rounded-[12px] border border-[#CFD8D4] bg-[#FAFBF9]">
              {/* ROW 1: Verrou NUT-11 P2PK */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] ${
                        !inspection
                          ? 'bg-[#E3E9E5] text-[#3D515F]'
                          : inspection.validFormat &&
                              inspection.p2pkLocked &&
                              keyMatchesCounter &&
                              !isTokenExpired
                            ? 'bg-[#E5F2ED] text-[#0C5C44]'
                            : isTokenExpired
                              ? 'bg-[#FBF2E6] text-[#9B5305]'
                              : 'bg-[#FBEBEC] text-[#A62329]'
                      }`}
                    >
                      <LockSealIcon size={18} />
                    </span>
                    <h3 className="type-h3 text-[#0E1E2B]">
                      {t.redeem.step1Title}
                    </h3>
                  </div>

                  {/* Step 1 Status Pill */}
                  {!inspection ? (
                    <span className="rounded-[6px] bg-[#E3E9E5] px-2.5 py-1 font-mono text-xs font-semibold text-[#3D515F]">
                      {language === 'fr' ? 'EN ATTENTE' : 'IDLE'}
                    </span>
                  ) : !inspection.validFormat ? (
                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#FBEBEC] px-2.5 py-1 font-mono text-xs font-semibold text-[#A62329]">
                      <AlertTriangleIcon size={14} />
                      {language === 'fr' ? 'FORMAT INVALIDE' : 'MALFORMED'}
                    </span>
                  ) : !inspection.p2pkLocked ? (
                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#FBEBEC] px-2.5 py-1 font-mono text-xs font-semibold text-[#A62329]">
                      <AlertTriangleIcon size={14} />
                      {language === 'fr' ? 'NON VERROUILLÉ' : 'UNLOCKED'}
                    </span>
                  ) : !keyMatchesCounter ? (
                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#FBEBEC] px-2.5 py-1 font-mono text-xs font-semibold text-[#A62329]">
                      <AlertTriangleIcon size={14} />
                      {language === 'fr' ? 'CLÉ NON AUTORISÉE' : 'KEY MISMATCH'}
                    </span>
                  ) : isTokenExpired ? (
                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#FBF2E6] px-2.5 py-1 font-mono text-xs font-semibold text-[#9B5305]">
                      <ClockLockIcon size={14} />
                      {language === 'fr' ? 'VERROU EXPIRÉ' : 'LOCK EXPIRED'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#E5F2ED] px-2.5 py-1 font-mono text-xs font-semibold text-[#0C5C44]">
                      <CheckCircleIcon size={14} />
                      {language === 'fr' ? 'P2PK CONFORME' : 'P2PK VERIFIED'}
                    </span>
                  )}
                </div>

                {/* Step 1 Body Detail */}
                {!inspection ? (
                  <p className="mt-2.5 text-sm text-[#4C616F]">
                    {t.redeem.step1Idle}
                  </p>
                ) : !inspection.validFormat ? (
                  <p role="alert" className="mt-2.5 text-sm font-medium text-[#A62329]">
                    {inspection.errorMessage ||
                      (language === 'fr'
                        ? 'Le jeton collé ne commence pas par un préfixe Cashu valide (cashuA / cashuB).'
                        : 'The pasted token does not start with a valid Cashu prefix (cashuA / cashuB).')}
                  </p>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    <p
                      className={`text-sm font-medium ${
                        !inspection.p2pkLocked || !keyMatchesCounter
                          ? 'text-[#A62329]'
                          : isTokenExpired
                            ? 'text-[#9B5305]'
                            : 'text-[#0C5C44]'
                      }`}
                    >
                      {!inspection.p2pkLocked
                        ? t.redeem.step1FailUnlocked
                        : !keyMatchesCounter
                          ? t.redeem.step1FailMismatch
                          : t.redeem.step1Pass}
                    </p>

                    <dl className="grid grid-cols-1 gap-2 rounded-[8px] border border-[#CFD8D4] bg-[#F1F4F2]/80 p-3 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-[#4C616F]">
                          {language === 'fr'
                            ? 'Valeur nominale inspectée'
                            : 'Inspected face value'}
                        </dt>
                        <dd
                          translate="no"
                          className="mt-0.5 font-mono text-sm font-semibold text-[#0E1E2B] tabular-nums"
                        >
                          {formatXofAmount(displayAmountXof, language)} ·{' '}
                          <span className="text-[#9B5305]">
                            {formatSatsAmount(displayAmountSats, language)}
                          </span>
                        </dd>
                      </div>

                      <div>
                        <dt className="font-semibold text-[#4C616F]">
                          {language === 'fr'
                            ? 'Échéance du verrou (Locktime)'
                            : 'Locktime expiry'}
                        </dt>
                        <dd
                          translate="no"
                          className="mt-0.5 font-mono text-xs font-medium text-[#0E1E2B] tabular-nums"
                        >
                          {locktimeWindow ? (
                            <span>
                              {locktimeWindow.formattedDate} ({locktimeWindow.countdownLabel})
                            </span>
                          ) : (
                            <span>
                              {language === 'fr' ? 'Aucune échéance' : 'No locktime'}
                            </span>
                          )}
                        </dd>
                      </div>

                      <div className="min-w-0 sm:col-span-2">
                        <dt className="font-semibold text-[#4C616F]">
                          {language === 'fr'
                            ? 'Clé publique P2PK cible (verrouillée dans le bon)'
                            : 'Target P2PK pubkey (locked inside voucher)'}
                        </dt>
                        <dd
                          translate="no"
                          className="type-data-row mt-0.5 text-xs text-[#0E1E2B]"
                        >
                          {lockedTargetVendor ? (
                            <span className="font-sans font-semibold text-[#0C5C44]">
                              {lockedTargetVendor.name} ·{' '}
                            </span>
                          ) : null}
                          {inspection.lockedToPubkeyHex
                            ? truncateIdentifier(inspection.lockedToPubkeyHex, 18, 12)
                            : language === 'fr'
                              ? 'Absente'
                              : 'None'}
                        </dd>
                      </div>

                      <div className="min-w-0 sm:col-span-2">
                        <dt className="font-semibold text-[#4C616F]">
                          {language === 'fr'
                            ? 'Clé active de ce comptoir'
                            : 'Active counter keypair'}
                        </dt>
                        <dd
                          translate="no"
                          className={`type-data-row mt-0.5 text-xs ${
                            keyMatchesCounter ? 'text-[#0C5C44]' : 'text-[#A62329]'
                          }`}
                        >
                          <span className="font-sans font-semibold">
                            {effectiveCounterIdentity.name} ·{' '}
                          </span>
                          {truncateIdentifier(effectiveCounterIdentity.pubkeyHex, 18, 12)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>

              {/* ROW 2: Preuve hors ligne NUT-12 DLEQ */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] ${
                        !inspection || !inspection.validFormat
                          ? 'bg-[#E3E9E5] text-[#3D515F]'
                          : inspection.dleqAllValid
                            ? 'bg-[#E5F2ED] text-[#0C5C44]'
                            : 'bg-[#FBEBEC] text-[#A62329]'
                      }`}
                    >
                      <ShieldCheckIcon size={18} />
                    </span>
                    <h3 className="type-h3 text-[#0E1E2B]">
                      {t.redeem.step2Title}
                    </h3>
                  </div>

                  {!inspection || !inspection.validFormat ? (
                    <span className="rounded-[6px] bg-[#E3E9E5] px-2.5 py-1 font-mono text-xs font-semibold text-[#3D515F]">
                      {language === 'fr' ? 'EN ATTENTE' : 'IDLE'}
                    </span>
                  ) : inspection.dleqAllValid ? (
                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#E5F2ED] px-2.5 py-1 font-mono text-xs font-semibold text-[#0C5C44]">
                      <CheckCircleIcon size={14} />
                      {language === 'fr'
                        ? `DLEQ VALIDE (${inspection.totalProofs})`
                        : `DLEQ VALID (${inspection.totalProofs})`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#FBEBEC] px-2.5 py-1 font-mono text-xs font-semibold text-[#A62329]">
                      <AlertTriangleIcon size={14} />
                      {language === 'fr' ? 'DLEQ INVALIDE' : 'DLEQ INVALID'}
                    </span>
                  )}
                </div>

                {!inspection || !inspection.validFormat ? (
                  <p className="mt-2.5 text-sm text-[#4C616F]">
                    {t.redeem.step2Idle}
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    <p
                      className={`text-sm font-medium ${
                        inspection.dleqAllValid ? 'text-[#0C5C44]' : 'text-[#A62329]'
                      }`}
                    >
                      {inspection.dleqAllValid
                        ? t.redeem.step2Pass
                        : t.redeem.step2Fail}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#CFD8D4] bg-[#F1F4F2]/80 px-3 py-2 text-xs">
                      <span className="font-mono text-[#0E1E2B] tabular-nums">
                        {language === 'fr'
                          ? `Coupures inspectées : ${inspection.totalProofs}`
                          : `Inspected proofs: ${inspection.totalProofs}`}
                      </span>
                      <span className="font-mono text-[#3D515F]">
                        {inspection.dleqDetail}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ROW 3: Encaissement Schnorr & Reçu Nostr */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] ${
                        claimedReceipt
                          ? 'bg-[#E5F2ED] text-[#0C5C44]'
                          : claimError || attackRejectionProof
                            ? 'bg-[#FBEBEC] text-[#A62329]'
                            : inspection &&
                                inspection.validFormat &&
                                inspection.p2pkLocked &&
                                keyMatchesCounter
                              ? 'bg-[#FBF2E6] text-[#9B5305]'
                              : 'bg-[#E3E9E5] text-[#3D515F]'
                      }`}
                    >
                      <KeyIcon size={18} />
                    </span>
                    <h3 className="type-h3 text-[#0E1E2B]">
                      {t.redeem.step3Title}
                    </h3>
                  </div>

                  {claimedReceipt ? (
                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#E5F2ED] px-2.5 py-1 font-mono text-xs font-semibold text-[#0C5C44]">
                      <CheckCircleIcon size={14} />
                      {language === 'fr' ? 'ENCAISSÉ · 30078' : 'SETTLED · 30078'}
                    </span>
                  ) : isClaiming || isTestingAttack ? (
                    <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#FBF2E6] px-2.5 py-1 font-mono text-xs font-semibold text-[#9B5305]">
                      <SpinnerRingIcon size={13} />
                      {language === 'fr' ? 'EN COURS' : 'IN PROGRESS'}
                    </span>
                  ) : attackRejectionProof ? (
                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#FBEBEC] px-2.5 py-1 font-mono text-xs font-semibold text-[#A62329]">
                      <AlertTriangleIcon size={14} />
                      CODE 20008 REJECTED
                    </span>
                  ) : claimError ? (
                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#FBEBEC] px-2.5 py-1 font-mono text-xs font-semibold text-[#A62329]">
                      <AlertTriangleIcon size={14} />
                      {language === 'fr' ? 'ÉCHEC MINT' : 'MINT ERROR'}
                    </span>
                  ) : inspection?.validFormat &&
                    inspection.p2pkLocked &&
                    keyMatchesCounter &&
                    !isTokenExpired ? (
                    <span className="rounded-[6px] bg-[#E5F2ED] px-2.5 py-1 font-mono text-xs font-semibold text-[#0C5C44]">
                      {language === 'fr' ? 'PRÊT À SIGNER' : 'READY TO SIGN'}
                    </span>
                  ) : (
                    <span className="rounded-[6px] bg-[#E3E9E5] px-2.5 py-1 font-mono text-xs font-semibold text-[#3D515F]">
                      {language === 'fr' ? 'EN ATTENTE' : 'WAITING'}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 text-sm">
                  {claimedReceipt ? (
                    <div className="space-y-2">
                      <p className="font-medium text-[#0C5C44]">
                        {t.redeem.step3Pass}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#0C5C44]/30 bg-[#E5F2ED]/60 px-3 py-2 font-mono text-xs text-[#0E1E2B] tabular-nums">
                        <span>
                          {language === 'fr' ? 'Sats crédités :' : 'Claimed sats:'}{' '}
                          <strong>{claimResult?.claimedAmountSats ?? displayAmountSats} sats</strong>
                        </span>
                        <span>
                          {language === 'fr' ? 'Relais Nostr :' : 'Nostr relays:'}{' '}
                          <strong>
                            {claimedReceipt.relaysPublished?.length ?? 0}/{settings.relays.length}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ) : isClaiming ? (
                    <p className="font-medium text-[#9B5305]">
                      {t.redeem.step3Claiming}
                    </p>
                  ) : attackRejectionProof ? (
                    <div
                      role="alert"
                      className="rounded-[8px] border border-[#A62329] bg-[#FBEBEC] p-3 text-xs text-[#A62329]"
                    >
                      <p className="font-bold">
                        {language === 'fr'
                          ? 'Preuve de rejet en direct du mint Cashu (NUT-11 P2PK) :'
                          : 'Live Cashu mint rejection proof (NUT-11 P2PK):'}
                      </p>
                      <p translate="no" className="type-data-row mt-1 text-xs">
                        {attackRejectionProof}
                      </p>
                    </div>
                  ) : claimError ? (
                    <p role="alert" className="font-medium text-[#A62329]">
                      {claimError}
                    </p>
                  ) : inspection?.validFormat &&
                    inspection.p2pkLocked &&
                    keyMatchesCounter &&
                    !isTokenExpired ? (
                    <p className="text-[#0C5C44] font-medium">
                      {t.redeem.step3Ready}
                    </p>
                  ) : (
                    <p className="text-[#4C616F]">{t.redeem.step3Idle}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Right Column (5 cols): Counter Action & Receipt Sheet */}
          <aside
            key={sealTriggerKey ? `counter-sheet-${sealTriggerKey}` : 'counter-sheet'}
            aria-label={t.redeem.receiptSheetTitle}
            className={`kb-voucher-stub kb-animate-enter-delayed relative overflow-hidden md:col-span-5 ${
              sealTriggerKey > 0 ? 'kb-animate-stub-settle' : ''
            }`}
          >
            {/* Top Security Guilloche Band */}
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
                    id="redeem-guilloche-pattern"
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
                <rect width="600" height="14" fill="url(#redeem-guilloche-pattern)" />
              </svg>
            </div>

            <div className="p-5 sm:p-6">
              {/* STATE 1: IDLE / EMPTY */}
              {!inspection && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-9 items-center justify-center rounded-[8px] bg-[#E5F2ED] text-[#0C5C44]">
                      <StoreCounterIcon size={20} />
                    </span>
                    <div>
                      <h2 className="type-h3 text-[#0E1E2B]">
                        {language === 'fr'
                          ? 'Terminal de règlement commerçant'
                          : 'Merchant settlement terminal'}
                      </h2>
                      <p className="text-xs text-[#4C616F]">
                        {effectiveCounterIdentity.name}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-[#3D515F]">
                    {language === 'fr'
                      ? 'Le bénéficiaire à Dakar présente son bon par SMS, WhatsApp ou code QR imprimé. Collez le jeton ci-dessus pour vérifier hors-ligne le verrou P2PK et la signature du mint.'
                      : 'The Dakar recipient presents their voucher via SMS, WhatsApp, or printed QR code. Paste the token above to verify the P2PK lock and mint signature offline.'}
                  </p>

                  <div className="flex flex-col gap-2.5 pt-1">
                    {fallbackMintedToken ? (
                      <button
                        type="button"
                        onClick={handleLoadLastMinted}
                        className="kb-btn-emerald w-full"
                      >
                        <SendVoucherIcon size={16} />
                        <span>{t.redeem.loadLastMintedButton}</span>
                      </button>
                    ) : null}

                    <Link
                      to="/issue"
                      className="kb-btn-secondary w-full text-center no-underline"
                    >
                      <span>
                        {language === 'fr'
                          ? 'Créer un bon affecté sur /issue'
                          : 'Issue a purpose voucher on /issue'}
                      </span>
                    </Link>
                  </div>
                </div>
              )}

              {/* STATE 2: CLAIMED & NOSTR RECEIPT PUBLISHED */}
              {inspection && claimedReceipt && (
                <div className="space-y-4">
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="kb-animate-seal-ring pointer-events-none absolute inset-0 rounded-[8px] border-2 border-[#0C5C44]"
                    />
                    <div className="kb-animate-seal flex items-center justify-between gap-2 rounded-[8px] border border-[#0C5C44] bg-[#E5F2ED] px-3.5 py-2.5 text-[#0C5C44]">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon size={18} className="shrink-0" />
                        <span className="text-xs font-bold tracking-tight">
                          {t.stub.nut11SealRedeemed}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold">
                        NIP-01 · 30078
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="type-h3 text-[#0E1E2B]">
                      {t.redeem.receiptSheetTitle}
                    </h2>
                    <p
                      translate="no"
                      className="type-data-hero mt-1 text-[#0E1E2B] tabular-nums"
                    >
                      {formatXofAmount(claimedReceipt.amountXof, language)}
                    </p>
                    <p
                      translate="no"
                      className="font-mono text-sm font-semibold text-[#0C5C44] tabular-nums"
                    >
                      {formatSatsAmount(claimedReceipt.amountSats, language)}
                      {claimResult?.mintFeeSats
                        ? ` (${
                            language === 'fr' ? 'frais mint' : 'mint fee'
                          }: ${claimResult.mintFeeSats} sats)`
                        : ''}
                    </p>
                  </div>

                  <dl className="space-y-2 border-y border-[#CFD8D4] py-3 text-xs">
                    <div>
                      <dt className="font-semibold text-[#4C616F]">
                        {t.redeem.receiptEventIdLabel}
                      </dt>
                      <dd
                        translate="no"
                        className="type-data-row mt-0.5 text-xs text-[#0E1E2B]"
                      >
                        {claimedReceipt.eventId}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-semibold text-[#4C616F]">
                        {language === 'fr'
                          ? 'Empreinte SHA-256 du bon (tag d)'
                          : 'Voucher SHA-256 hash (d-tag)'}
                      </dt>
                      <dd
                        translate="no"
                        className="type-data-row mt-0.5 text-xs text-[#0E1E2B]"
                      >
                        {claimedReceipt.voucherHash}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-semibold text-[#4C616F]">
                        {language === 'fr'
                          ? 'Commerçant signataire (npub)'
                          : 'Signing merchant (npub)'}
                      </dt>
                      <dd
                        translate="no"
                        className="type-data-row mt-0.5 text-xs text-[#3D515F]"
                      >
                        {claimedReceipt.vendorNpub}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-semibold text-[#4C616F]">
                        {t.redeem.receiptRelaysLabel}
                      </dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {settings.relays.map((relayUrl) => {
                          const published =
                            claimedReceipt.relaysPublished?.includes(relayUrl) ?? false;
                          return (
                            <span
                              key={relayUrl}
                              translate="no"
                              className={`inline-flex items-center gap-1 rounded-[6px] border px-2 py-0.5 font-mono text-[11px] ${
                                published
                                  ? 'border-[#0C5C44] bg-[#E5F2ED] text-[#0C5C44]'
                                  : 'border-[#CFD8D4] bg-[#F1F4F2] text-[#3D515F]'
                              }`}
                            >
                              {published ? (
                                <CheckCircleIcon size={12} />
                              ) : (
                                <ClockLockIcon size={12} />
                              )}
                              <span>{relayUrl}</span>
                            </span>
                          );
                        })}
                      </dd>
                    </div>
                  </dl>

                  {/* Signed Nostr Kind 30078 JSON Event Preview */}
                  <div>
                    <p className="text-xs font-semibold text-[#3D515F]">
                      {language === 'fr'
                        ? 'Événement Nostr signé (zéro donnée personnelle · pii: none)'
                        : 'Signed Nostr event (zero personal data · pii: none)'}
                    </p>
                    <pre
                      translate="no"
                      className="mt-1.5 max-h-44 overflow-auto rounded-[8px] border border-[#CFD8D4] bg-[#F1F4F2] p-3 font-mono text-[11px] leading-relaxed text-[#0E1E2B]"
                    >
                      {JSON.stringify(
                        claimedReceipt.rawEvent ?? claimedReceipt,
                        null,
                        2
                      )}
                    </pre>
                  </div>

                  <div className="flex flex-col gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyReceiptJson}
                      className="kb-btn-secondary w-full text-xs"
                    >
                      <CopyIcon size={15} />
                      <span>{t.redeem.copyReceiptJsonButton}</span>
                    </button>

                    <Link
                      to={`/vendors?hash=${encodeURIComponent(
                        claimedReceipt.voucherHash
                      )}`}
                      className="kb-btn-emerald w-full text-center text-xs no-underline"
                    >
                      <ShieldCheckIcon size={15} />
                      <span>
                        {language === 'fr'
                          ? 'Vérifier ce reçu de façon indépendante (/vendors)'
                          : 'Verify receipt independently (/vendors)'}
                      </span>
                    </Link>
                  </div>
                </div>
              )}

              {/* STATE 3: VALID MATCH (READY TO CLAIM) */}
              {inspection &&
                !claimedReceipt &&
                inspection.validFormat &&
                inspection.p2pkLocked &&
                keyMatchesCounter &&
                !isTokenExpired && (
                  <div className="space-y-4">
                    <div className="kb-animate-seal flex items-center justify-between gap-2 rounded-[8px] border border-[#0C5C44] bg-[#E5F2ED] px-3.5 py-2.5 text-[#0C5C44]">
                      <div className="flex items-center gap-2">
                        <ShieldCheckIcon size={18} className="shrink-0" />
                        <span className="text-xs font-bold tracking-tight">
                          {language === 'fr'
                            ? 'VERROU P2PK & DLEQ VALIDÉS'
                            : 'P2PK LOCK & DLEQ VERIFIED'}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold">
                        NUT-11 / NUT-12
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-[#4C616F]">
                        {language === 'fr'
                          ? 'Montant net à servir au bénéficiaire'
                          : 'Net amount payable to beneficiary'}
                      </p>
                      <p
                        translate="no"
                        className="type-data-hero mt-0.5 text-[#0E1E2B] tabular-nums"
                      >
                        {formatXofAmount(displayAmountXof, language)}
                      </p>
                      <p
                        translate="no"
                        className="font-mono text-base font-semibold text-[#9B5305] tabular-nums"
                      >
                        {formatSatsAmount(displayAmountSats, language)}
                      </p>
                    </div>

                    <div className="rounded-[8px] border border-[#CFD8D4] bg-[#F1F4F2]/75 p-3 text-xs space-y-1">
                      <p className="font-semibold text-[#0E1E2B]">
                        {activeVendor.name} ({activeVendor.district})
                      </p>
                      <p className="text-[#3D515F]">
                        {t.categories[displayCategory]}
                      </p>
                      <p translate="no" className="type-data-row text-[11px] text-[#4C616F]">
                        SHA-256: {truncateIdentifier(inspection.tokenHash, 16, 12)}
                      </p>
                    </div>

                    {claimError ? (
                      <div
                        role="alert"
                        className="rounded-[8px] border border-[#A62329] bg-[#FBEBEC] p-3 text-xs text-[#A62329]"
                      >
                        <p className="font-bold">{t.redeem.step3Fail}</p>
                        <p className="mt-1">{claimError}</p>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleClaimAndPublish}
                      disabled={isClaiming}
                      aria-busy={isClaiming}
                      className="kb-btn-emerald w-full"
                    >
                      {isClaiming ? (
                        <SpinnerRingIcon size={16} />
                      ) : (
                        <LockSealIcon size={16} />
                      )}
                      <span>
                        {isClaiming
                          ? t.redeem.claimButtonBusy
                          : language === 'fr'
                            ? 'Encaisser et publier le reçu'
                            : 'Claim & publish receipt'}
                      </span>
                    </button>

                    {/* Judge Helper: Test Attacker Rejection directly */}
                    <div className="border-t border-[#CFD8D4] pt-3">
                      <p className="text-xs text-[#4C616F]">
                        {t.redeem.testAttackDesc}
                      </p>
                      <button
                        type="button"
                        onClick={handleTestLiveMintRejection}
                        disabled={isTestingAttack || isClaiming}
                        aria-busy={isTestingAttack}
                        className="kb-btn-destructive mt-2 w-full text-xs"
                      >
                        {isTestingAttack ? (
                          <SpinnerRingIcon size={15} />
                        ) : (
                          <AlertTriangleIcon size={15} />
                        )}
                        <span>{t.redeem.testAttackButton}</span>
                      </button>
                    </div>
                  </div>
                )}

              {/* STATE 4: WRONG KEY / ATTACKER TEST STATE */}
              {inspection &&
                !claimedReceipt &&
                inspection.validFormat &&
                inspection.p2pkLocked &&
                !keyMatchesCounter && (
                  <div className="space-y-4">
                    <div
                      role="alert"
                      className="rounded-[8px] border border-[#A62329] bg-[#FBEBEC] p-3.5 text-[#A62329]"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangleIcon size={18} className="shrink-0" />
                        <span className="text-xs font-bold tracking-tight">
                          {language === 'fr'
                            ? 'VERROU NUT-11 : CLÉ PRIVÉE NON AUTORISÉE'
                            : 'NUT-11 LOCK: UNAUTHORIZED PRIVATE KEY'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed">
                        {t.redeem.step1FailMismatch}
                      </p>
                    </div>

                    <div className="rounded-[8px] border border-[#CFD8D4] bg-[#F1F4F2] p-3 text-xs space-y-2">
                      <div>
                        <span className="font-semibold text-[#4C616F]">
                          {language === 'fr'
                            ? 'Commerçant requis par le bon :'
                            : 'Merchant required by voucher:'}
                        </span>
                        <p className="font-semibold text-[#0C5C44]">
                          {lockedTargetVendor
                            ? `${lockedTargetVendor.name} (${lockedTargetVendor.district})`
                            : truncateIdentifier(
                                inspection.lockedToPubkeyHex ?? '',
                                16,
                                12
                              )}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-[#4C616F]">
                          {language === 'fr'
                            ? 'Clé active au comptoir :'
                            : 'Active counter key:'}
                        </span>
                        <p className="font-semibold text-[#A62329]">
                          {effectiveCounterIdentity.name}
                        </p>
                      </div>
                    </div>

                    {/* Live Mint Rejection Proof Button for Judges */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleTestLiveMintRejection}
                        disabled={isTestingAttack}
                        aria-busy={isTestingAttack}
                        className="kb-btn-destructive w-full"
                      >
                        {isTestingAttack ? (
                          <SpinnerRingIcon size={16} />
                        ) : (
                          <AlertTriangleIcon size={16} />
                        )}
                        <span>
                          {language === 'fr'
                            ? 'Tester le rejet par le mint (Code 20008)'
                            : 'Test live mint rejection (Code 20008)'}
                        </span>
                      </button>

                      {attackRejectionProof ? (
                        <div
                          role="alert"
                          className="rounded-[8px] border border-[#A62329] bg-[#FBEBEC] p-3 text-xs text-[#A62329]"
                        >
                          <p className="font-bold">
                            {language === 'fr'
                              ? 'Rejet cryptographique du mint confirmé :'
                              : 'Cryptographic mint rejection confirmed:'}
                          </p>
                          <p translate="no" className="type-data-row mt-1 text-xs">
                            {attackRejectionProof}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {/* Quick recovery if locked to a known Dakar vendor */}
                    {lockedTargetVendor ? (
                      <div className="border-t border-[#CFD8D4] pt-3">
                        <button
                          type="button"
                          onClick={() => handleSelectVendor(lockedTargetVendor.id)}
                          className="kb-btn-emerald w-full text-xs"
                        >
                          <StoreCounterIcon size={15} />
                          <span>
                            {language === 'fr'
                              ? `Basculer sur le comptoir ${lockedTargetVendor.name}`
                              : `Switch counter to ${lockedTargetVendor.name}`}
                          </span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

              {/* STATE 5: ERROR / EXPIRED / UNLOCKED / MALFORMED */}
              {inspection &&
                !claimedReceipt &&
                (!inspection.validFormat ||
                  !inspection.p2pkLocked ||
                  (keyMatchesCounter && isTokenExpired)) && (
                  <div className="space-y-4">
                    <div
                      role="alert"
                      className={`rounded-[8px] border p-3.5 ${
                        isTokenExpired
                          ? 'border-[#9B5305] bg-[#FBF2E6] text-[#9B5305]'
                          : 'border-[#A62329] bg-[#FBEBEC] text-[#A62329]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isTokenExpired ? (
                          <ClockLockIcon size={18} className="shrink-0" />
                        ) : (
                          <AlertTriangleIcon size={18} className="shrink-0" />
                        )}
                        <span className="text-xs font-bold tracking-tight">
                          {isTokenExpired
                            ? t.stub.nut11SealExpired
                            : !inspection.validFormat
                              ? language === 'fr'
                                ? 'JETON CASHU MALFORMÉ'
                                : 'MALFORMED CASHU TOKEN'
                              : language === 'fr'
                                ? 'JETON NON VERROUILLÉ NUT-11'
                                : 'TOKEN NOT NUT-11 LOCKED'}
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed">
                        {isTokenExpired
                          ? language === 'fr'
                            ? 'La fenêtre temporelle de ce bon est dépassée. Le commerçant ne peut plus l’encaisser ; la clé de remboursement de l’émetteur peut désormais récupérer les satoshis dans le Coffre.'
                            : 'This voucher locktime has elapsed. The merchant can no longer claim it; the sender refund key can now reclaim the satoshis in the Vault.'
                          : inspection.errorMessage ||
                            (!inspection.validFormat
                              ? language === 'fr'
                                ? 'Vérifiez que la chaîne collée est complète et commence par cashuB ou cashuA.'
                                : 'Ensure the pasted string is complete and starts with cashuB or cashuA.'
                              : t.redeem.step1FailUnlocked)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {isTokenExpired ? (
                        <Link
                          to="/ledger"
                          className="kb-btn-primary w-full text-center text-xs no-underline"
                        >
                          <ClockLockIcon size={15} />
                          <span>
                            {language === 'fr'
                              ? 'Ouvrir le Coffre pour récupérer les sats (/ledger)'
                              : 'Open Vault to reclaim expired sats (/ledger)'}
                          </span>
                        </Link>
                      ) : null}

                      <button
                        type="button"
                        onClick={handleClear}
                        className="kb-btn-secondary w-full text-xs"
                      >
                        <RefreshIcon size={15} />
                        <span>{t.redeem.clearButton}</span>
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default RedeemPage;
