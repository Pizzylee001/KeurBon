import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createRandomSecretKey } from '@cashu/cashu-ts';
import {
  DEFAULT_FX_RATE_XOF_PER_BTC,
  DEFAULT_MINT_URL,
  DEFAULT_NOSTR_RELAYS,
  DEMO_DAKAR_VENDORS,
  DEMO_PARIS_SENDER_KEYS,
  bytesToHex,
  deriveKeypairFromPrivkeyHex,
} from '../data/demoVendors';
import { TRANSLATIONS, type TranslationDictionary } from '../i18n/translations';
import type {
  ActiveRole,
  AppSettings,
  IssuedVoucher,
  KeurBonStoragePayloadV1,
  Language,
  NostrReceiptPayload,
  PurposeCategory,
  Secp256k1Keypair,
  ToastMessage,
  VendorProfile,
  VoucherStatus,
} from '../types/keurbon';

export const STORAGE_KEY = 'keurbon_v1';

function createDefaultStorageState(): KeurBonStoragePayloadV1 {
  return {
    version: 1,
    language: 'fr',
    activeRole: 'sender',
    activeVendorId: DEMO_DAKAR_VENDORS[0].id,
    senderKeys: DEMO_PARIS_SENDER_KEYS,
    vendors: [...DEMO_DAKAR_VENDORS],
    vouchers: [],
    receipts: [],
    settings: {
      mintUrl: DEFAULT_MINT_URL,
      relays: [...DEFAULT_NOSTR_RELAYS],
      manualFxRateXofPerBtc: null,
      lastLiveFxRateXofPerBtc: DEFAULT_FX_RATE_XOF_PER_BTC,
      lastLiveFxUpdatedAt: null,
    },
    lastMintedToken: null,
  };
}

function isValidStoragePayloadV1(raw: unknown): raw is KeurBonStoragePayloadV1 {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Record<string, unknown>;
  if (candidate.version !== 1) return false;
  if (candidate.language !== 'fr' && candidate.language !== 'en') return false;
  if (candidate.activeRole !== 'sender' && candidate.activeRole !== 'vendor') return false;
  if (typeof candidate.activeVendorId !== 'string') return false;
  if (!Array.isArray(candidate.vendors) || candidate.vendors.length === 0) return false;
  if (!Array.isArray(candidate.vouchers)) return false;
  if (!Array.isArray(candidate.receipts)) return false;
  if (!candidate.senderKeys || typeof candidate.senderKeys !== 'object') return false;
  if (!candidate.settings || typeof candidate.settings !== 'object') return false;
  return true;
}

function loadInitialState(): KeurBonStoragePayloadV1 {
  if (typeof window === 'undefined') {
    return createDefaultStorageState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultStorageState();
    const parsed: unknown = JSON.parse(raw);
    if (!isValidStoragePayloadV1(parsed)) {
      return createDefaultStorageState();
    }
    // Ensure all 4 seeded demo vendors remain present
    const existingIds = new Set(parsed.vendors.map((v) => v.id));
    const mergedVendors = [
      ...parsed.vendors,
      ...DEMO_DAKAR_VENDORS.filter((d) => !existingIds.has(d.id)),
    ];
    const validActiveVendor = mergedVendors.some((v) => v.id === parsed.activeVendorId)
      ? parsed.activeVendorId
      : mergedVendors[0].id;

    return {
      ...parsed,
      vendors: mergedVendors,
      activeVendorId: validActiveVendor,
    };
  } catch {
    return createDefaultStorageState();
  }
}

export interface RegisterLocalVendorInput {
  name: string;
  district: string;
  address: string;
  category: PurposeCategory;
  customPrivkeyHex?: string;
}

export interface KeurBonStoreContextValue {
  language: Language;
  t: TranslationDictionary;
  activeRole: ActiveRole;
  activeVendorId: string;
  activeVendor: VendorProfile;
  senderKeys: Secp256k1Keypair;
  vendors: VendorProfile[];
  vouchers: IssuedVoucher[];
  receipts: NostrReceiptPayload[];
  settings: AppSettings;
  effectiveFxRateXofPerBtc: number;
  lastMintedToken: string | null;
  toasts: ToastMessage[];
  setLanguage: (lang: Language) => void;
  setActiveRole: (role: ActiveRole) => void;
  setActiveVendorId: (vendorId: string) => void;
  addVoucher: (voucher: IssuedVoucher) => void;
  updateVoucherStatus: (
    voucherId: string,
    status: VoucherStatus,
    extra?: Partial<Pick<IssuedVoucher, 'dleqVerified' | 'nostrReceiptEventId' | 'nostrReceiptRelays' | 'redeemedAt' | 'refundedAt'>>
  ) => void;
  updateVoucherByTokenHash: (
    tokenHash: string,
    status: VoucherStatus,
    extra?: Partial<Pick<IssuedVoucher, 'dleqVerified' | 'nostrReceiptEventId' | 'nostrReceiptRelays' | 'redeemedAt' | 'refundedAt'>>
  ) => void;
  addReceipt: (receipt: NostrReceiptPayload) => void;
  registerLocalVendor: (input: RegisterLocalVendorInput) => VendorProfile;
  setLastMintedToken: (token: string | null) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  exportBackupJson: () => string;
  importBackupJson: (jsonString: string) => { ok: boolean; error?: string };
  resetDemoData: () => void;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const KeurBonStoreContext = createContext<KeurBonStoreContextValue | null>(null);

export function KeurBonStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<KeurBonStoragePayloadV1>(() => loadInitialState());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors in private browsing
    }
  }, [state]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = state.language;
    }
  }, [state.language]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4000);
    },
    [dismissToast]
  );

  const setLanguage = useCallback((language: Language) => {
    setState((prev) => ({ ...prev, language }));
  }, []);

  const setActiveRole = useCallback((activeRole: ActiveRole) => {
    setState((prev) => ({ ...prev, activeRole }));
  }, []);

  const setActiveVendorId = useCallback((activeVendorId: string) => {
    setState((prev) => ({ ...prev, activeVendorId }));
  }, []);

  const addVoucher = useCallback((voucher: IssuedVoucher) => {
    setState((prev) => ({
      ...prev,
      vouchers: [voucher, ...prev.vouchers.filter((v) => v.id !== voucher.id)],
      lastMintedToken: voucher.token,
    }));
  }, []);

  const updateVoucherStatus = useCallback(
    (
      voucherId: string,
      status: VoucherStatus,
      extra?: Partial<
        Pick<
          IssuedVoucher,
          'dleqVerified' | 'nostrReceiptEventId' | 'nostrReceiptRelays' | 'redeemedAt' | 'refundedAt'
        >
      >
    ) => {
      setState((prev) => ({
        ...prev,
        vouchers: prev.vouchers.map((v) =>
          v.id === voucherId ? { ...v, status, ...extra } : v
        ),
      }));
    },
    []
  );

  const updateVoucherByTokenHash = useCallback(
    (
      tokenHash: string,
      status: VoucherStatus,
      extra?: Partial<
        Pick<
          IssuedVoucher,
          'dleqVerified' | 'nostrReceiptEventId' | 'nostrReceiptRelays' | 'redeemedAt' | 'refundedAt'
        >
      >
    ) => {
      setState((prev) => ({
        ...prev,
        vouchers: prev.vouchers.map((v) =>
          v.tokenHash === tokenHash ? { ...v, status, ...extra } : v
        ),
      }));
    },
    []
  );

  const addReceipt = useCallback((receipt: NostrReceiptPayload) => {
    setState((prev) => ({
      ...prev,
      receipts: [
        receipt,
        ...prev.receipts.filter((r) => r.eventId !== receipt.eventId),
      ],
    }));
  }, []);

  const registerLocalVendor = useCallback((input: RegisterLocalVendorInput): VendorProfile => {
    const privkeyHex =
      input.customPrivkeyHex && /^[0-9a-fA-F]{64}$/.test(input.customPrivkeyHex.trim())
        ? input.customPrivkeyHex.trim().toLowerCase()
        : bytesToHex(createRandomSecretKey());

    const keypair = deriveKeypairFromPrivkeyHex(privkeyHex);
    const createdVendor: VendorProfile = {
      id: `vendor-local-${Date.now()}`,
      name: input.name.trim(),
      district: input.district.trim(),
      address: input.address.trim(),
      category: input.category,
      npub: keypair.npub,
      pubkeyHex: keypair.pubkeyHex,
      privkeyHex: keypair.privkeyHex,
      isDemo: false,
      createdAt: Math.floor(Date.now() / 1000),
    };

    setState((prev) => ({
      ...prev,
      vendors: [...prev.vendors, createdVendor],
      activeVendorId: createdVendor.id,
    }));

    return createdVendor;
  }, []);

  const setLastMintedToken = useCallback((lastMintedToken: string | null) => {
    setState((prev) => ({ ...prev, lastMintedToken }));
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
    }));
  }, []);

  const exportBackupJson = useCallback((): string => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importBackupJson = useCallback(
    (jsonString: string): { ok: boolean; error?: string } => {
      try {
        const parsed: unknown = JSON.parse(jsonString);
        if (!isValidStoragePayloadV1(parsed)) {
          return {
            ok: false,
            error:
              state.language === 'fr'
                ? 'Schéma JSON KeurBon v1 invalide ou incomplet.'
                : 'Invalid or incomplete KeurBon v1 JSON backup schema.',
          };
        }
        setState(parsed);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : state.language === 'fr'
                ? 'Impossible d’analyser le fichier JSON.'
                : 'Unable to parse JSON file.',
        };
      }
    },
    [state.language]
  );

  const resetDemoData = useCallback(() => {
    const fresh = createDefaultStorageState();
    setState((prev) => ({
      ...fresh,
      language: prev.language,
    }));
  }, []);

  const activeVendor = useMemo(() => {
    return (
      state.vendors.find((v) => v.id === state.activeVendorId) ??
      state.vendors[0] ??
      DEMO_DAKAR_VENDORS[0]
    );
  }, [state.vendors, state.activeVendorId]);

  const effectiveFxRateXofPerBtc = useMemo(() => {
    if (
      state.settings.manualFxRateXofPerBtc &&
      state.settings.manualFxRateXofPerBtc > 0
    ) {
      return state.settings.manualFxRateXofPerBtc;
    }
    return state.settings.lastLiveFxRateXofPerBtc || DEFAULT_FX_RATE_XOF_PER_BTC;
  }, [state.settings.manualFxRateXofPerBtc, state.settings.lastLiveFxRateXofPerBtc]);

  const value = useMemo<KeurBonStoreContextValue>(
    () => ({
      language: state.language,
      t: TRANSLATIONS[state.language],
      activeRole: state.activeRole,
      activeVendorId: state.activeVendorId,
      activeVendor,
      senderKeys: state.senderKeys,
      vendors: state.vendors,
      vouchers: state.vouchers,
      receipts: state.receipts,
      settings: state.settings,
      effectiveFxRateXofPerBtc,
      lastMintedToken: state.lastMintedToken,
      toasts,
      setLanguage,
      setActiveRole,
      setActiveVendorId,
      addVoucher,
      updateVoucherStatus,
      updateVoucherByTokenHash,
      addReceipt,
      registerLocalVendor,
      setLastMintedToken,
      updateSettings,
      exportBackupJson,
      importBackupJson,
      resetDemoData,
      pushToast,
      dismissToast,
    }),
    [
      state,
      activeVendor,
      effectiveFxRateXofPerBtc,
      toasts,
      setLanguage,
      setActiveRole,
      setActiveVendorId,
      addVoucher,
      updateVoucherStatus,
      updateVoucherByTokenHash,
      addReceipt,
      registerLocalVendor,
      setLastMintedToken,
      updateSettings,
      exportBackupJson,
      importBackupJson,
      resetDemoData,
      pushToast,
      dismissToast,
    ]
  );

  return (
    <KeurBonStoreContext.Provider value={value}>
      {children}
    </KeurBonStoreContext.Provider>
  );
}

export function useKeurBonStore(): KeurBonStoreContextValue {
  const ctx = useContext(KeurBonStoreContext);
  if (!ctx) {
    throw new Error('useKeurBonStore must be used inside <KeurBonStoreProvider>');
  }
  return ctx;
}
