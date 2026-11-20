import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createRandomSecretKey } from '@cashu/cashu-ts';
import { finalizeEvent, verifyEvent, type VerifiedEvent } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import {
  AlertTriangleIcon,
  CategoryIcon,
  CheckCircleIcon,
  CopyIcon,
  KeyIcon,
  RefreshIcon,
  SendVoucherIcon,
  ShieldCheckIcon,
  SpinnerRingIcon,
  StoreCounterIcon,
} from '../components/Icons';
import {
  formatSatsAmount,
  formatXofAmount,
  truncateIdentifier,
} from '../components/VoucherStub';
import {
  DEFAULT_MINT_URL,
  DEMO_DAKAR_VENDORS,
  bytesToHex,
  deriveKeypairFromPrivkeyHex,
  hexToBytes,
} from '../data/demoVendors';
import { nostrService } from '../lib/nostr';
import { useKeurBonStore } from '../state/store';
import type {
  NostrReceiptPayload,
  NostrReceiptService,
  PurposeCategory,
  Secp256k1Keypair,
} from '../types/keurbon';

type ExtendedNostrService = NostrReceiptService & {
  fetchAndVerifyReceiptByHash?: (
    voucherHash: string,
    relays: string[],
    vendorPubkeyHex?: string
  ) => Promise<NostrReceiptPayload | null>;
  verifyReceiptEventJson?: (
    rawJsonOrEvent: string | unknown
  ) =>
    | NostrReceiptPayload
    | {
        valid: boolean;
        receipt?: NostrReceiptPayload;
        error?: string;
      };
  generateLocalKeypair?: () => Secp256k1Keypair;
};

type CategoryFilter = 'all' | PurposeCategory;
type VerifierMode = 'hash' | 'json';
type VerificationSource = 'live_relay' | 'local_cache' | 'offline_json';

const ALL_CATEGORIES: PurposeCategory[] = [
  'health',
  'school',
  'hardware',
  'groceries',
  'electricity',
];

function isPurposeCategory(val: string | null): val is PurposeCategory {
  return (
    val === 'health' ||
    val === 'school' ||
    val === 'hardware' ||
    val === 'groceries' ||
    val === 'electricity'
  );
}

function buildSampleSignedReceiptEvent(): NostrReceiptPayload {
  const demoVendor = DEMO_DAKAR_VENDORS[0];
  const sampleHash =
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const createdAt = 1715088000;
  const amountSats = 40322;
  const amountXof = 25000;
  const contentObj = {
    schema: 'keurbon.receipt.v1',
    voucher_hash: sampleHash,
    vendor_npub: demoVendor.npub,
    amount_sats: amountSats,
    amount_xof: amountXof,
    category: demoVendor.category,
    timestamp: createdAt,
    mint_url: DEFAULT_MINT_URL,
  };

  const skBytes = hexToBytes(
    demoVendor.privkeyHex ??
      '4a91e307c6b28d15f409a72c8e31b56d90f24c71e83a59b02d64f81c3a579e12'
  );

  const signedEvent: VerifiedEvent = finalizeEvent(
    {
      kind: 30078,
      created_at: createdAt,
      tags: [
        ['d', sampleHash],
        ['t', 'keurbon-receipt'],
        ['v', demoVendor.npub],
        ['amt_sats', String(amountSats)],
        ['amt_xof', String(amountXof)],
        ['cat', demoVendor.category],
        ['mint', DEFAULT_MINT_URL],
        ['pii', 'none'],
      ],
      content: JSON.stringify(contentObj),
    },
    skBytes
  );

  return {
    eventId: signedEvent.id,
    pubkey: signedEvent.pubkey,
    createdAt: signedEvent.created_at,
    voucherHash: sampleHash,
    vendorNpub: demoVendor.npub,
    amountSats,
    amountXof,
    category: demoVendor.category,
    mintUrl: DEFAULT_MINT_URL,
    verifiedSignature: true,
    relaysPublished: [],
    rawEvent: signedEvent,
  };
}

function verifyNostrEventOfflineFallback(rawInput: string | unknown): {
  valid: boolean;
  receipt?: NostrReceiptPayload;
  error?: string;
} {
  try {
    const parsed: unknown =
      typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
    if (!parsed || typeof parsed !== 'object') {
      return {
        valid: false,
        error: 'Invalid JSON structure: expected a Nostr event object.',
      };
    }

    const candidate = parsed as Record<string, unknown>;
    const rawCandidate =
      candidate.rawEvent && typeof candidate.rawEvent === 'object'
        ? (candidate.rawEvent as Record<string, unknown>)
        : candidate;

    if (rawCandidate.kind !== 30078) {
      return {
        valid: false,
        error: `Invalid event kind: expected 30078, received ${String(
          rawCandidate.kind
        )}.`,
      };
    }

    if (
      typeof rawCandidate.id !== 'string' ||
      typeof rawCandidate.pubkey !== 'string' ||
      typeof rawCandidate.sig !== 'string' ||
      typeof rawCandidate.created_at !== 'number' ||
      !Array.isArray(rawCandidate.tags) ||
      typeof rawCandidate.content !== 'string'
    ) {
      return {
        valid: false,
        error: 'Incomplete Nostr NIP-01 event fields (id, pubkey, sig, tags, content).',
      };
    }

    const isSigValid = verifyEvent(rawCandidate as unknown as VerifiedEvent);
    if (!isSigValid) {
      return {
        valid: false,
        error:
          'BIP-340 Schnorr signature verification failed: event payload or signature was tampered with.',
      };
    }

    const tags = rawCandidate.tags as string[][];
    const getTag = (key: string): string | undefined =>
      tags.find((t) => Array.isArray(t) && t[0] === key)?.[1];

    let parsedContent: Record<string, unknown> = {};
    try {
      parsedContent = JSON.parse(rawCandidate.content) as Record<string, unknown>;
    } catch {
      parsedContent = {};
    }

    const voucherHash =
      getTag('d') ||
      (typeof parsedContent.voucher_hash === 'string'
        ? parsedContent.voucher_hash
        : '');
    const vendorNpub =
      getTag('v') ||
      (typeof parsedContent.vendor_npub === 'string'
        ? parsedContent.vendor_npub
        : nip19.npubEncode(rawCandidate.pubkey));
    const amountSats =
      Number(getTag('amt_sats') ?? parsedContent.amount_sats ?? 0) || 0;
    const amountXof =
      Number(getTag('amt_xof') ?? parsedContent.amount_xof ?? 0) || 0;
    const catRaw =
      getTag('cat') ??
      (typeof parsedContent.category === 'string'
        ? parsedContent.category
        : 'health');
    const category: PurposeCategory = isPurposeCategory(catRaw)
      ? catRaw
      : 'health';
    const mintUrl =
      getTag('mint') ||
      (typeof parsedContent.mint_url === 'string'
        ? parsedContent.mint_url
        : DEFAULT_MINT_URL);

    return {
      valid: true,
      receipt: {
        eventId: rawCandidate.id,
        pubkey: rawCandidate.pubkey,
        createdAt: rawCandidate.created_at,
        voucherHash,
        vendorNpub,
        amountSats,
        amountXof,
        category,
        mintUrl,
        verifiedSignature: true,
        rawEvent: rawCandidate,
      },
    };
  } catch (err) {
    return {
      valid: false,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to parse or verify Nostr event JSON.',
    };
  }
}

export function VendorsPage() {
  const {
    language,
    t,
    vendors,
    receipts,
    settings,
    registerLocalVendor,
    setActiveVendorId,
    setActiveRole,
    pushToast,
  } = useKeurBonStore();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const catParam = searchParams.get('cat');
  const hashParam = searchParams.get('hash');

  const activeCategory: CategoryFilter = isPurposeCategory(catParam)
    ? catParam
    : 'all';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddVendorOpen, setIsAddVendorOpen] = useState<boolean>(false);

  // Local Vendor Registration Form State
  const [newName, setNewName] = useState<string>('');
  const [newDistrict, setNewDistrict] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newCategory, setNewCategory] = useState<PurposeCategory>('health');
  const [keyInput, setKeyInput] = useState<string>('');
  const [generatedKeypair, setGeneratedKeypair] =
    useState<Secp256k1Keypair | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Independent Nostr Receipt Verifier State
  const [verifierMode, setVerifierMode] = useState<VerifierMode>('hash');
  const [hashInput, setHashInput] = useState<string>(hashParam ?? '');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifiedReceipt, setVerifiedReceipt] =
    useState<NostrReceiptPayload | null>(null);
  const [verificationSource, setVerificationSource] =
    useState<VerificationSource | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );

  const handleSelectCategory = (cat: CategoryFilter) => {
    const next = new URLSearchParams(searchParams);
    if (cat === 'all') {
      next.delete('cat');
    } else {
      next.set('cat', cat);
    }
    setSearchParams(next, { replace: true });
  };

  const filteredVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vendors.filter((v) => {
      if (activeCategory !== 'all' && v.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.district.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q) ||
        v.npub.toLowerCase().includes(q) ||
        v.pubkeyHex.toLowerCase().includes(q)
      );
    });
  }, [vendors, activeCategory, searchQuery]);

  const runHashVerification = useCallback(
    async (targetHash: string) => {
      const cleanHash = targetHash.trim().toLowerCase();
      if (!cleanHash) {
        setVerificationError(
          language === 'fr'
            ? 'Veuillez saisir l’empreinte SHA-256 (d-tag) du bon à rechercher.'
            : 'Please enter the voucher SHA-256 hash (d-tag) to look up.'
        );
        setVerifiedReceipt(null);
        return;
      }

      setIsVerifying(true);
      setVerificationError(null);
      setVerifiedReceipt(null);
      setVerificationSource(null);

      try {
        const nSvc = nostrService as ExtendedNostrService;
        const liveResult =
          typeof nSvc.fetchAndVerifyReceiptByHash === 'function'
            ? await nSvc.fetchAndVerifyReceiptByHash(cleanHash, settings.relays)
            : await nSvc.fetchReceiptByVoucherHash(cleanHash, settings.relays);

        if (liveResult && liveResult.verifiedSignature) {
          setVerifiedReceipt(liveResult);
          setVerificationSource('live_relay');
          setIsVerifying(false);
          return;
        }
      } catch {
        // Proceed to check local verified store cache if relays are unreachable
      }

      const localMatch = receipts.find(
        (r) =>
          r.voucherHash.toLowerCase() === cleanHash ||
          r.eventId.toLowerCase() === cleanHash
      );

      if (localMatch) {
        const check = localMatch.rawEvent
          ? verifyNostrEventOfflineFallback(localMatch.rawEvent)
          : { valid: localMatch.verifiedSignature, receipt: localMatch };

        if (check.valid && (check.receipt || localMatch)) {
          setVerifiedReceipt(check.receipt ?? localMatch);
          setVerificationSource('local_cache');
          setIsVerifying(false);
          return;
        }
      }

      // Also check sample deterministic hash if user tests the sample receipt hash
      const sample = buildSampleSignedReceiptEvent();
      if (cleanHash === sample.voucherHash) {
        setVerifiedReceipt(sample);
        setVerificationSource('local_cache');
        setIsVerifying(false);
        return;
      }

      setVerificationError(
        language === 'fr'
          ? `Aucun reçu Nostr kind 30078 trouvé pour l’empreinte "${truncateIdentifier(
              cleanHash,
              14,
              10
            )}" sur les relais (${settings.relays.join(', ')}) ni dans le cache local.`
          : `No Nostr kind 30078 receipt found for hash "${truncateIdentifier(
              cleanHash,
              14,
              10
            )}" on live relays (${settings.relays.join(', ')}) or local cache.`
      );
      setIsVerifying(false);
    },
    [language, settings.relays, receipts]
  );

  const runOfflineJsonVerification = useCallback(
    (rawJsonStr: string) => {
      const clean = rawJsonStr.trim();
      if (!clean) {
        setVerificationError(
          language === 'fr'
            ? 'Veuillez coller un objet JSON d’événement Nostr kind 30078.'
            : 'Please paste a Nostr kind 30078 event JSON object.'
        );
        setVerifiedReceipt(null);
        return;
      }

      setVerificationError(null);
      setVerifiedReceipt(null);
      setVerificationSource(null);

      const nSvc = nostrService as ExtendedNostrService;
      try {
        if (typeof nSvc.verifyReceiptEventJson === 'function') {
          const out = nSvc.verifyReceiptEventJson(clean);
          if (out && typeof out === 'object' && 'valid' in out) {
            if (out.valid && out.receipt) {
              setVerifiedReceipt(out.receipt);
              setVerificationSource('offline_json');
              return;
            }
          } else if (out && typeof out === 'object' && 'eventId' in out) {
            setVerifiedReceipt(out as NostrReceiptPayload);
            setVerificationSource('offline_json');
            return;
          }
        }

        const svcRes = nSvc.verifyRawReceiptJson(clean);
        if (svcRes.valid && svcRes.receipt) {
          setVerifiedReceipt(svcRes.receipt);
          setVerificationSource('offline_json');
          return;
        }
      } catch {
        // Fall through to direct nostr-tools verifyEvent check
      }

      const fallbackRes = verifyNostrEventOfflineFallback(clean);
      if (fallbackRes.valid && fallbackRes.receipt) {
        setVerifiedReceipt(fallbackRes.receipt);
        setVerificationSource('offline_json');
      } else {
        setVerificationError(
          fallbackRes.error || t.vendors.verifierInvalidBanner
        );
      }
    },
    [language, t.vendors.verifierInvalidBanner]
  );

  // Automatically trigger verification if ?hash=<voucherHash> is present in URL
  useEffect(() => {
    if (hashParam && hashParam.trim().length > 0) {
      const clean = hashParam.trim();
      setVerifierMode('hash');
      setHashInput(clean);
      void runHashVerification(clean);
    }
  }, [hashParam, runHashVerification]);

  const handleGenerateLocalKeypair = () => {
    const nSvc = nostrService as ExtendedNostrService;
    let kp: Secp256k1Keypair;
    if (typeof nSvc.generateLocalKeypair === 'function') {
      kp = nSvc.generateLocalKeypair();
    } else {
      const privHex = bytesToHex(createRandomSecretKey());
      kp = deriveKeypairFromPrivkeyHex(privHex);
    }
    setGeneratedKeypair(kp);
    setKeyInput(kp.npub);
    setFormError(null);
  };

  const handleRegisterVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim() || !newDistrict.trim() || !newAddress.trim()) {
      setFormError(
        language === 'fr'
          ? 'Veuillez renseigner l’enseigne, le quartier de Dakar et l’adresse du commerçant.'
          : 'Please enter the merchant business name, Dakar district, and street address.'
      );
      return;
    }

    let customPrivkeyHex: string | undefined = generatedKeypair?.privkeyHex;
    const trimmedKey = keyInput.trim();

    if (trimmedKey && (!generatedKeypair || trimmedKey !== generatedKeypair.npub)) {
      if (/^[0-9a-fA-F]{64}$/.test(trimmedKey)) {
        customPrivkeyHex = trimmedKey.toLowerCase();
      } else if (trimmedKey.startsWith('nsec1')) {
        try {
          const decoded = nip19.decode(trimmedKey);
          if (decoded.type === 'nsec') {
            customPrivkeyHex = bytesToHex(decoded.data);
          } else {
            throw new Error('Not nsec');
          }
        } catch {
          setFormError(
            language === 'fr'
              ? 'Clé nsec1 invalide. Vérifiez le format Bech32 ou générez une paire locale.'
              : 'Invalid nsec1 key. Check the Bech32 format or generate a local keypair.'
          );
          return;
        }
      } else if (trimmedKey.startsWith('npub1')) {
        try {
          const decoded = nip19.decode(trimmedKey);
          if (decoded.type !== 'npub' || typeof decoded.data !== 'string') {
            throw new Error('Not npub');
          }
          // Deterministic derivation if a matching demo/generated key exists
          const existing = vendors.find((v) => v.npub === trimmedKey);
          if (existing?.privkeyHex) {
            customPrivkeyHex = existing.privkeyHex;
          }
        } catch {
          setFormError(
            language === 'fr'
              ? 'Clé publique npub1 invalide (échec du contrôle Bech32 NIP-19).'
              : 'Invalid npub1 public key (failed NIP-19 Bech32 checksum).'
          );
          return;
        }
      } else {
        setFormError(
          language === 'fr'
            ? 'Format de clé non reconnu. Utilisez le bouton pour générer une clé Nostr locale ou collez une clé npub1 / hex.'
            : 'Unrecognized key format. Use the button to generate a local Nostr keypair or paste an npub1 / hex key.'
        );
        return;
      }
    }

    const created = registerLocalVendor({
      name: newName.trim(),
      district: newDistrict.trim(),
      address: newAddress.trim(),
      category: newCategory,
      customPrivkeyHex,
    });

    setNewName('');
    setNewDistrict('');
    setNewAddress('');
    setKeyInput('');
    setGeneratedKeypair(null);
    setIsAddVendorOpen(false);

    pushToast({
      tone: 'success',
      title:
        language === 'fr'
          ? `Commerçant inscrit : ${created.name}`
          : `Merchant registered: ${created.name}`,
      detail: truncateIdentifier(created.npub, 16, 10),
    });
  };

  const handleCopyNpub = async (npub: string, vendorName: string) => {
    try {
      await navigator.clipboard.writeText(npub);
      pushToast({
        tone: 'success',
        title:
          language === 'fr'
            ? `Clé npub copiée (${vendorName})`
            : `Copied npub key (${vendorName})`,
        detail: truncateIdentifier(npub, 18, 10),
      });
    } catch {
      pushToast({
        tone: 'info',
        title: vendorName,
        detail: truncateIdentifier(npub, 18, 10),
      });
    }
  };

  const handleSimulateCounter = (vendorId: string) => {
    setActiveVendorId(vendorId);
    setActiveRole('vendor');
    navigate('/redeem');
  };

  const handleLoadSampleReceipt = () => {
    const latestReceipt = receipts[0] ?? buildSampleSignedReceiptEvent();
    const rawEventObj = latestReceipt.rawEvent ?? latestReceipt;
    const formatted = JSON.stringify(rawEventObj, null, 2);
    setVerifierMode('json');
    setJsonInput(formatted);
    runOfflineJsonVerification(formatted);
  };

  const handleQuickVerifyReceipt = (receipt: NostrReceiptPayload) => {
    if (verifierMode === 'json') {
      const formatted = JSON.stringify(receipt.rawEvent ?? receipt, null, 2);
      setJsonInput(formatted);
      runOfflineJsonVerification(formatted);
    } else {
      setHashInput(receipt.voucherHash);
      const next = new URLSearchParams(searchParams);
      next.set('hash', receipt.voucherHash);
      setSearchParams(next, { replace: true });
      void runHashVerification(receipt.voucherHash);
    }
  };

  const matchedSignerVendor = useMemo(() => {
    if (!verifiedReceipt) return null;
    return (
      vendors.find(
        (v) =>
          v.npub === verifiedReceipt.vendorNpub ||
          v.pubkeyHex.endsWith(verifiedReceipt.pubkey.toLowerCase())
      ) ?? null
    );
  }, [verifiedReceipt, vendors]);

  return (
    <div className="kb-animate-enter space-y-6 pb-12">
      {/* Route Header */}
      <header className="border-b border-[#CFD8D4] pb-5">
        <h1 className="type-h1 text-[#0E1E2B]">{t.vendors.pageTitle}</h1>
        <p className="type-body-large mt-2 text-[#3D515F]">
          {t.vendors.pageSubtitle}
        </p>
      </header>

      {/* Asymmetric 7/5 Split Desk */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start">
        {/* LEFT COLUMN (7 cols): Dakar Vendor Registry */}
        <section
          aria-labelledby="vendor-directory-heading"
          className="space-y-5 md:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="vendor-directory-heading" className="type-h2 text-[#0E1E2B]">
              {language === 'fr'
                ? `Commerçants certifiés à Dakar (${filteredVendors.length})`
                : `Verified Dakar merchants (${filteredVendors.length})`}
            </h2>

            <button
              type="button"
              onClick={() => {
                setIsAddVendorOpen((prev) => !prev);
                setFormError(null);
              }}
              aria-expanded={isAddVendorOpen}
              className="kb-btn-secondary text-xs"
            >
              <KeyIcon size={15} className="text-[#0C5C44]" />
              <span>
                {language === 'fr'
                  ? isAddVendorOpen
                    ? 'Fermer le formulaire'
                    : 'Enregistrer un commerçant local'
                  : isAddVendorOpen
                    ? 'Close registration form'
                    : 'Register local vendor'}
              </span>
            </button>
          </div>

          {/* Category Filter Chips (>= 44px tap targets, URL-reflected via ?cat=) */}
          <div
            role="group"
            aria-label={
              language === 'fr'
                ? 'Filtrer par catégorie de dépense'
                : 'Filter by spending category'
            }
            className="flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              onClick={() => handleSelectCategory('all')}
              aria-pressed={activeCategory === 'all'}
              className={`kb-pressable inline-flex min-h-[44px] items-center gap-2 rounded-[8px] border px-3.5 py-2 text-xs font-semibold ${
                activeCategory === 'all'
                  ? 'border-[#0E1E2B] bg-[#0E1E2B] text-[#FAFBF9]'
                  : 'border-[#637683] bg-[#FAFBF9] text-[#0E1E2B] hover:bg-[#E3E9E5]'
              }`}
            >
              <span>
                {language === 'fr' ? 'Tous' : 'All'} ({vendors.length})
              </span>
            </button>

            {ALL_CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat;
              const shortLabelsFr: Record<PurposeCategory, string> = {
                health: 'Santé',
                school: 'Scolarité',
                hardware: 'Matériaux',
                groceries: 'Épicerie',
                electricity: 'Électricité',
              };
              const shortLabelsEn: Record<PurposeCategory, string> = {
                health: 'Health',
                school: 'School',
                hardware: 'Hardware',
                groceries: 'Groceries',
                electricity: 'Electricity',
              };
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  aria-pressed={isSelected}
                  className={`kb-pressable inline-flex min-h-[44px] items-center gap-1.5 rounded-[8px] border px-3 py-2 text-xs font-semibold ${
                    isSelected
                      ? 'border-[#0E1E2B] bg-[#0E1E2B] text-[#FAFBF9]'
                      : 'border-[#637683] bg-[#FAFBF9] text-[#0E1E2B] hover:bg-[#E3E9E5]'
                  }`}
                >
                  <CategoryIcon category={cat} size={15} />
                  <span>
                    {language === 'fr' ? shortLabelsFr[cat] : shortLabelsEn[cat]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div>
            <label
              htmlFor="vendor-search-input"
              className="type-label mb-1.5 block text-[#0E1E2B]"
            >
              {t.vendors.searchLabel}
            </label>
            <input
              id="vendor-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.vendors.searchPlaceholder}
              className="kb-input"
            />
          </div>

          {/* Collapsible Register Local Vendor Form */}
          {isAddVendorOpen ? (
            <form
              onSubmit={handleRegisterVendorSubmit}
              className="kb-animate-enter space-y-4 rounded-[12px] border border-[#CFD8D4] bg-[#FAFBF9] p-5"
            >
              <div className="border-b border-[#CFD8D4] pb-3">
                <h3 className="type-h3 text-[#0E1E2B]">
                  {t.vendors.addVendorTitle}
                </h3>
                <p className="type-caption mt-1 text-[#3D515F]">
                  {language === 'fr'
                    ? 'Sécurité dès la conception : la clé privée secp256k1 générée reste strictement dans le stockage local de votre navigateur (localStorage) et n’est jamais transmise à un serveur.'
                    : 'Security by design: the generated secp256k1 private key remains strictly inside your browser local storage (localStorage) and is never transmitted to any server.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="vendor-name-input"
                    className="type-label mb-1 block text-[#0E1E2B]"
                  >
                    {t.vendors.vendorNameLabel}
                  </label>
                  <input
                    id="vendor-name-input"
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={
                      language === 'fr'
                        ? 'Ex. Pharmacie Ouakam Cité Avion'
                        : 'E.g. Pharmacie Ouakam Cité Avion'
                    }
                    className="kb-input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vendor-district-input"
                    className="type-label mb-1 block text-[#0E1E2B]"
                  >
                    {t.vendors.vendorDistrictLabel}
                  </label>
                  <input
                    id="vendor-district-input"
                    type="text"
                    required
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    placeholder={
                      language === 'fr'
                        ? 'Ex. Ouakam · Dakar'
                        : 'E.g. Ouakam · Dakar'
                    }
                    className="kb-input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vendor-address-input"
                    className="type-label mb-1 block text-[#0E1E2B]"
                  >
                    {t.vendors.vendorAddressLabel}
                  </label>
                  <input
                    id="vendor-address-input"
                    type="text"
                    required
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder={
                      language === 'fr'
                        ? 'Ex. Route de la Corniche Ouest, Ouakam'
                        : 'E.g. Route de la Corniche Ouest, Ouakam'
                    }
                    className="kb-input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vendor-category-select"
                    className="type-label mb-1 block text-[#0E1E2B]"
                  >
                    {t.vendors.vendorCategoryLabel}
                  </label>
                  <select
                    id="vendor-category-select"
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as PurposeCategory)
                    }
                    className="kb-input"
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {t.categories[cat]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Local Nostr Keypair Generation or Paste */}
              <div className="space-y-2 rounded-[8px] border border-[#CFD8D4] bg-[#F1F4F2]/75 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="vendor-key-input"
                    className="type-label text-[#0E1E2B]"
                  >
                    {language === 'fr'
                      ? 'Clé Nostr / P2PK du commerçant (npub1… ou génération locale)'
                      : 'Merchant Nostr / P2PK key (npub1… or local generation)'}
                  </label>

                  <button
                    type="button"
                    onClick={handleGenerateLocalKeypair}
                    className="kb-btn-secondary text-xs"
                  >
                    <KeyIcon size={15} className="text-[#0C5C44]" />
                    <span>
                      {language === 'fr'
                        ? 'Générer une clé Nostr locale'
                        : 'Generate local Nostr keypair'}
                    </span>
                  </button>
                </div>

                <input
                  id="vendor-key-input"
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder={
                    language === 'fr'
                      ? 'Cliquez sur Générer ou collez une clé npub1… / hex'
                      : 'Click Generate or paste an existing npub1… / hex key'
                  }
                  className="kb-input font-mono text-xs"
                />

                {generatedKeypair ? (
                  <div className="mt-2 space-y-1 text-xs text-[#0C5C44]">
                    <p className="font-semibold">
                      {language === 'fr'
                        ? 'Paire secp256k1 générée localement :'
                        : 'Locally generated secp256k1 keypair:'}
                    </p>
                    <p translate="no" className="type-data-row text-[11px] text-[#0E1E2B]">
                      P2PK SEC1 (66-hex): {generatedKeypair.pubkeyHex}
                    </p>
                  </div>
                ) : null}
              </div>

              {formError ? (
                <div
                  role="alert"
                  className="rounded-[8px] border border-[#A62329] bg-[#FBEBEC] p-3 text-xs font-medium text-[#A62329]"
                >
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddVendorOpen(false)}
                  className="kb-btn-secondary text-xs"
                >
                  <span>{language === 'fr' ? 'Annuler' : 'Cancel'}</span>
                </button>
                <button type="submit" className="kb-btn-emerald text-xs">
                  <KeyIcon size={15} />
                  <span>{t.vendors.generateVendorButton}</span>
                </button>
              </div>
            </form>
          ) : null}

          {/* Hairline-Ruled Operational Vendor Directory Rows */}
          <div className="divide-y divide-[#CFD8D4] border-y border-[#CFD8D4]">
            {filteredVendors.length === 0 ? (
              <div className="py-8 text-center">
                <p className="type-h3 text-[#0E1E2B]">
                  {language === 'fr'
                    ? 'Aucun commerçant ne correspond à ce filtre'
                    : 'No merchant matches this filter'}
                </p>
                <p className="mt-1 text-sm text-[#4C616F]">
                  {language === 'fr'
                    ? 'Réinitialisez la catégorie sélectionnée ou élargissez votre recherche.'
                    : 'Reset the selected category filter or broaden your search query.'}
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      handleSelectCategory('all');
                    }}
                    className="kb-btn-secondary text-xs"
                  >
                    <RefreshIcon size={15} />
                    <span>
                      {language === 'fr'
                        ? 'Afficher tous les commerçants'
                        : 'Show all merchants'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              filteredVendors.map((v) => (
                <article
                  key={v.id}
                  className="py-4 first:pt-4 last:pb-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#E5F2ED] px-2.5 py-0.5 text-xs font-semibold text-[#0C5C44]">
                          <CategoryIcon category={v.category} size={14} />
                          <span>{t.categories[v.category]}</span>
                        </span>

                        <span className="rounded-[6px] border border-[#CFD8D4] bg-[#FAFBF9] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#3D515F]">
                          {v.isDemo
                            ? t.nav.demoTag
                            : language === 'fr'
                              ? 'Local'
                              : 'Local'}
                        </span>

                        <span className="text-xs font-semibold text-[#3D515F]">
                          {v.district}
                        </span>
                      </div>

                      <h3 className="type-h3 text-[#0E1E2B]">{v.name}</h3>
                      <p className="text-sm text-[#3D515F]">{v.address}</p>

                      {/* Cryptographic Keys Box */}
                      <div className="mt-2 rounded-[8px] border border-[#CFD8D4] bg-[#FAFBF9] p-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-[#4C616F]">
                              Nostr NIP-19 (npub) & Cashu NUT-11 P2PK
                            </p>
                            <p
                              translate="no"
                              className="type-data-row mt-0.5 text-xs text-[#0E1E2B]"
                            >
                              {v.npub}
                            </p>
                            <p
                              translate="no"
                              className="type-data-row mt-0.5 text-[11px] text-[#4C616F]"
                            >
                              SEC1: {truncateIdentifier(v.pubkeyHex, 20, 14)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyNpub(v.npub, v.name)}
                            className="kb-btn-secondary shrink-0 text-xs"
                          >
                            <CopyIcon size={14} />
                            <span>
                              {language === 'fr' ? 'Copier npub' : 'Copy npub'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Row Operational Actions (>= 44px tap targets) */}
                    <div className="flex flex-row flex-wrap gap-2 sm:flex-col sm:items-stretch">
                      <Link
                        to={`/issue?vendor=${encodeURIComponent(v.id)}`}
                        className="kb-btn-primary text-xs no-underline"
                      >
                        <SendVoucherIcon size={15} />
                        <span>{t.vendors.issueForVendorButton}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleSimulateCounter(v.id)}
                        className="kb-btn-secondary text-xs"
                      >
                        <StoreCounterIcon size={15} />
                        <span>{t.vendors.useAtCounterButton}</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* RIGHT COLUMN (5 cols): Independent Nostr Fulfillment Receipt Verifier */}
        <aside
          aria-labelledby="nostr-verifier-heading"
          className="kb-animate-enter-delayed rounded-[12px] border border-[#CFD8D4] bg-[#FAFBF9] p-5 sm:p-6 md:col-span-5"
        >
          <div className="flex items-start gap-3 border-b border-[#CFD8D4] pb-4">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-[#E5F2ED] text-[#0C5C44]">
              <ShieldCheckIcon size={20} />
            </span>
            <div>
              <h2 id="nostr-verifier-heading" className="type-h3 text-[#0E1E2B]">
                {t.vendors.verifierPanelTitle}
              </h2>
              <p className="type-caption mt-1 text-[#3D515F]">
                {t.vendors.verifierPanelSubtitle}
              </p>
            </div>
          </div>

          {/* 2-Mode Segmented Control (>= 44px tap targets) */}
          <div
            role="group"
            aria-label={
              language === 'fr'
                ? 'Mode de vérification du reçu Nostr'
                : 'Nostr receipt verification mode'
            }
            className="mt-4 grid grid-cols-2 gap-1.5 rounded-[8px] bg-[#E3E9E5] p-1"
          >
            <button
              type="button"
              onClick={() => {
                setVerifierMode('hash');
                setVerificationError(null);
              }}
              aria-pressed={verifierMode === 'hash'}
              className={`kb-pressable min-h-[44px] rounded-[6px] px-2.5 py-2 text-xs font-semibold ${
                verifierMode === 'hash'
                  ? 'bg-[#FAFBF9] text-[#0E1E2B] shadow-xs'
                  : 'text-[#3D515F] hover:text-[#0E1E2B]'
              }`}
            >
              {language === 'fr'
                ? 'Par empreinte (d-tag)'
                : 'By voucher hash (d-tag)'}
            </button>

            <button
              type="button"
              onClick={() => {
                setVerifierMode('json');
                setVerificationError(null);
              }}
              aria-pressed={verifierMode === 'json'}
              className={`kb-pressable min-h-[44px] rounded-[6px] px-2.5 py-2 text-xs font-semibold ${
                verifierMode === 'json'
                  ? 'bg-[#FAFBF9] text-[#0E1E2B] shadow-xs'
                  : 'text-[#3D515F] hover:text-[#0E1E2B]'
              }`}
            >
              {language === 'fr'
                ? 'Vérifier JSON hors-ligne'
                : 'Verify signed JSON offline'}
            </button>
          </div>

          {/* MODE 1: BY VOUCHER HASH (D-TAG) */}
          {verifierMode === 'hash' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = hashInput.trim();
                if (clean) {
                  const next = new URLSearchParams(searchParams);
                  next.set('hash', clean);
                  setSearchParams(next, { replace: true });
                }
                void runHashVerification(clean);
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label
                  htmlFor="verifier-hash-input"
                  className="type-label mb-1 block text-[#0E1E2B]"
                >
                  {language === 'fr'
                    ? 'Empreinte SHA-256 du bon (tag Nostr "d")'
                    : 'Voucher SHA-256 hash (Nostr "d" tag)'}
                </label>
                <input
                  id="verifier-hash-input"
                  type="text"
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder={
                    language === 'fr'
                      ? 'Ex. e3b0c44298fc1c149afbf4c8996fb924…'
                      : 'E.g. e3b0c44298fc1c149afbf4c8996fb924…'
                  }
                  className="kb-input font-mono text-xs"
                />
                <p className="type-caption mt-1 text-[#4C616F]">
                  {language === 'fr'
                    ? `Interroge en direct ${settings.relays.join(
                        ', '
                      )} et vérifie la signature Schnorr BIP-340.`
                    : `Queries live relays (${settings.relays.join(
                        ', '
                      )}) and verifies the BIP-340 Schnorr signature.`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isVerifying || !hashInput.trim()}
                  aria-busy={isVerifying}
                  className="kb-btn-emerald flex-1 text-xs"
                >
                  {isVerifying ? (
                    <SpinnerRingIcon size={15} />
                  ) : (
                    <ShieldCheckIcon size={15} />
                  )}
                  <span>
                    {language === 'fr'
                      ? 'Interroger & vérifier BIP-340'
                      : 'Query & verify BIP-340'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleReceipt}
                  className="kb-btn-secondary text-xs"
                >
                  <span>{t.vendors.verifierLoadSampleButton}</span>
                </button>
              </div>
            </form>
          ) : (
            /* MODE 2: VERIFY RAW SIGNED JSON OFFLINE */
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="verifier-json-input"
                  className="type-label mb-1 block text-[#0E1E2B]"
                >
                  {t.vendors.verifierInputLabel}
                </label>
                <textarea
                  id="verifier-json-input"
                  rows={6}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder={t.vendors.verifierInputPlaceholder}
                  className="kb-input font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => runOfflineJsonVerification(jsonInput)}
                  disabled={!jsonInput.trim()}
                  className="kb-btn-emerald flex-1 text-xs"
                >
                  <ShieldCheckIcon size={15} />
                  <span>{t.vendors.verifierButton}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleReceipt}
                  className="kb-btn-secondary text-xs"
                >
                  <span>{t.vendors.verifierLoadSampleButton}</span>
                </button>
              </div>
            </div>
          )}

          {/* Verification Result Banner */}
          {verificationError ? (
            <div
              role="alert"
              className="mt-4 rounded-[8px] border border-[#A62329] bg-[#FBEBEC] p-3.5 text-xs text-[#A62329]"
            >
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangleIcon size={16} className="shrink-0" />
                <span>{t.vendors.verifierInvalidBanner}</span>
              </div>
              <p className="mt-1.5 leading-relaxed">{verificationError}</p>
            </div>
          ) : null}

          {verifiedReceipt ? (
            <div className="mt-4 space-y-3 rounded-[10px] border border-[#0C5C44] bg-[#E5F2ED]/65 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#0C5C44]">
                  <CheckCircleIcon size={18} className="shrink-0" />
                  <span className="text-xs font-bold">
                    {language === 'fr'
                      ? 'Signature BIP-340 valide · Aucune donnée personnelle'
                      : 'Valid BIP-340 signature · Zero PII'}
                  </span>
                </div>

                <span className="rounded-[6px] border border-[#0C5C44] bg-[#FAFBF9] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#0C5C44]">
                  {verificationSource === 'live_relay'
                    ? language === 'fr'
                      ? 'Relais Nostr en direct'
                      : 'Live Nostr relays'
                    : verificationSource === 'local_cache'
                      ? language === 'fr'
                        ? 'Cache local vérifié'
                        : 'Verified local cache'
                      : language === 'fr'
                        ? 'Vérifié hors-ligne'
                        : 'Verified offline'}
                </span>
              </div>

              <p className="text-xs text-[#0C5C44]">
                {t.vendors.verifierZeroPiiNotice}
              </p>

              <dl className="space-y-2 border-t border-[#0C5C44]/30 pt-2.5 text-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="font-semibold text-[#3D515F]">
                    {language === 'fr' ? 'Montant exécuté' : 'Fulfilled amount'}
                  </dt>
                  <dd
                    translate="no"
                    className="font-mono font-semibold text-[#0E1E2B] tabular-nums"
                  >
                    {formatXofAmount(verifiedReceipt.amountXof, language)} ·{' '}
                    <span className="text-[#9B5305]">
                      {formatSatsAmount(verifiedReceipt.amountSats, language)}
                    </span>
                  </dd>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="font-semibold text-[#3D515F]">
                    {language === 'fr' ? 'Catégorie' : 'Category'}
                  </dt>
                  <dd className="font-semibold text-[#0E1E2B]">
                    {t.categories[verifiedReceipt.category]}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-[#3D515F]">
                    {language === 'fr'
                      ? 'Commerçant signataire'
                      : 'Signing merchant'}
                  </dt>
                  <dd className="mt-0.5 text-[#0E1E2B]">
                    {matchedSignerVendor ? (
                      <span className="font-semibold text-[#0C5C44]">
                        {matchedSignerVendor.name} ({matchedSignerVendor.district}) ·{' '}
                      </span>
                    ) : null}
                    <span translate="no" className="type-data-row text-[11px]">
                      {truncateIdentifier(verifiedReceipt.vendorNpub, 18, 10)}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-[#3D515F]">
                    {language === 'fr'
                      ? 'Empreinte SHA-256 du bon (d-tag)'
                      : 'Voucher SHA-256 hash (d-tag)'}
                  </dt>
                  <dd
                    translate="no"
                    className="type-data-row mt-0.5 text-[11px] text-[#0E1E2B]"
                  >
                    {verifiedReceipt.voucherHash}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-[#3D515F]">
                    Nostr Event ID (Kind 30078)
                  </dt>
                  <dd
                    translate="no"
                    className="type-data-row mt-0.5 text-[11px] text-[#3D515F]"
                  >
                    {verifiedReceipt.eventId}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {/* Recent Verified Receipts from Store for 1-Click Judge Testing */}
          <div className="mt-5 border-t border-[#CFD8D4] pt-4">
            <h3 className="text-xs font-semibold text-[#3D515F]">
              {language === 'fr'
                ? `Reçus récents signés dans cette session (${receipts.length})`
                : `Recent signed receipts in this session (${receipts.length})`}
            </h3>

            {receipts.length === 0 ? (
              <p className="mt-1.5 text-xs text-[#4C616F]">
                {language === 'fr'
                  ? 'Aucun reçu encaissé dans cette session pour le moment. Utilisez "Charger le dernier reçu signé" ci-dessus pour inspecter un spécimen signé BIP-340.'
                  : 'No receipts claimed in this session yet. Click "Load latest signed receipt" above to inspect a BIP-340 signed specimen.'}
              </p>
            ) : (
              <div className="mt-2.5 flex flex-col gap-2">
                {receipts.slice(0, 5).map((r) => (
                  <button
                    key={r.eventId}
                    type="button"
                    onClick={() => handleQuickVerifyReceipt(r)}
                    className="kb-pressable flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[8px] border border-[#CFD8D4] bg-[#F1F4F2] px-3 py-2 text-left text-xs hover:bg-[#E3E9E5]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0E1E2B] truncate">
                        {t.categories[r.category]} ·{' '}
                        {formatXofAmount(r.amountXof, language)}
                      </p>
                      <p
                        translate="no"
                        className="type-data-row text-[11px] text-[#4C616F]"
                      >
                        d: {truncateIdentifier(r.voucherHash, 14, 10)}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-[6px] bg-[#E5F2ED] px-2 py-1 font-mono text-[11px] font-semibold text-[#0C5C44]">
                      <ShieldCheckIcon size={13} />
                      <span>{language === 'fr' ? 'Vérifier' : 'Verify'}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default VendorsPage;
