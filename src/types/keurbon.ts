export type Language = 'fr' | 'en';

export type ActiveRole = 'sender' | 'vendor';

export type PurposeCategory =
  | 'health'
  | 'school'
  | 'hardware'
  | 'groceries'
  | 'electricity';

export type VoucherStatus =
  | 'draft'
  | 'locked'
  | 'redeemed'
  | 'expired'
  | 'refunded';

export interface Secp256k1Keypair {
  /** 64-character lowercase hex private key (32 bytes) */
  privkeyHex: string;
  /** 66-character lowercase hex compressed SEC1 public key (starts with 02 or 03) for Cashu NUT-11 P2PK */
  pubkeyHex: string;
  /** 64-character lowercase hex x-only public key for Nostr NIP-01 events */
  xOnlyPubkeyHex: string;
  /** NIP-19 bech32 npub1... encoded public key */
  npub: string;
  /** NIP-19 bech32 nsec1... encoded private key (optional display helper) */
  nsec?: string;
}

export interface VendorProfile {
  id: string;
  name: string;
  district: string;
  address: string;
  category: PurposeCategory;
  npub: string;
  /** 66-character compressed SEC1 pubkey hex (02/03 + 64-char x-only pubkey) */
  pubkeyHex: string;
  /** Optional 64-character hex private key for demo profiles or locally created vendors */
  privkeyHex?: string;
  isDemo: boolean;
  createdAt: number;
}

export interface IssuedVoucher {
  id: string;
  serialCode: string;
  token: string;
  tokenHash: string;
  mintUrl: string;
  amountSats: number;
  amountXof: number;
  fxRateXofPerBtc: number;
  feeReserveSats: number;
  purpose: PurposeCategory;
  vendorId: string;
  vendorName: string;
  vendorDistrict: string;
  vendorPubkeyHex: string;
  vendorNpub: string;
  senderPubkeyHex: string;
  senderNpub: string;
  locktimeUnix: number;
  createdAt: number;
  status: VoucherStatus;
  dleqVerified: boolean;
  nostrReceiptEventId?: string;
  nostrReceiptRelays?: string[];
  redeemedAt?: number;
  refundedAt?: number;
  memo?: string;
}

export type InspectionErrorCode =
  | 'EMPTY_TOKEN'
  | 'MALFORMED_TOKEN'
  | 'UNSUPPORTED_MINT'
  | 'NOT_P2PK_LOCKED'
  | 'VENDOR_PUBKEY_MISMATCH'
  | 'LOCKTIME_EXPIRED'
  | 'DLEQ_MISSING'
  | 'DLEQ_INVALID'
  | 'ALREADY_SPENT'
  | 'MINT_UNREACHABLE';

export interface InspectionResult {
  validFormat: boolean;
  mintUrl: string;
  amountSats: number;
  totalProofs: number;
  p2pkLocked: boolean;
  lockedToPubkeyHex: string | null;
  matchesActiveVendor: boolean;
  refundPubkeyHex: string | null;
  locktimeUnix: number | null;
  isExpired: boolean;
  dleqAllValid: boolean;
  dleqDetail: string;
  tokenHash: string;
  errorCode?: InspectionErrorCode;
  errorMessage?: string;
}

export interface NostrReceiptSchemaV1 {
  schema: 'keurbon.receipt.v1';
  voucher_hash: string;
  vendor_npub: string;
  amount_sats: number;
  amount_xof: number;
  category: PurposeCategory;
  timestamp: number;
  mint_url: string;
}

export interface NostrReceiptPayload {
  eventId: string;
  pubkey: string;
  createdAt: number;
  voucherHash: string;
  vendorNpub: string;
  amountSats: number;
  amountXof: number;
  category: PurposeCategory;
  mintUrl: string;
  verifiedSignature: boolean;
  relaysPublished?: string[];
  rawEvent: unknown;
}

export interface AppSettings {
  mintUrl: string;
  relays: string[];
  manualFxRateXofPerBtc: number | null;
  lastLiveFxRateXofPerBtc: number;
  lastLiveFxUpdatedAt: number | null;
}

export interface ToastMessage {
  id: string;
  tone: 'success' | 'error' | 'info';
  title: string;
  detail?: string;
}

export interface KeurBonStoragePayloadV1 {
  version: 1;
  language: Language;
  activeRole: ActiveRole;
  activeVendorId: string;
  senderKeys: Secp256k1Keypair;
  vendors: VendorProfile[];
  vouchers: IssuedVoucher[];
  receipts: NostrReceiptPayload[];
  settings: AppSettings;
  lastMintedToken: string | null;
}

/* ============================================================================
 * Service Contracts for Wave 2 Modules (src/lib/cashu.ts, nostr.ts, fx.ts)
 * ========================================================================== */

export interface IssueLockedVoucherParams {
  mintUrl: string;
  amountSats: number;
  amountXof: number;
  fxRateXofPerBtc: number;
  purpose: PurposeCategory;
  vendor: VendorProfile;
  senderKeys: Secp256k1Keypair;
  locktimeUnix: number;
  memo?: string;
  onProgress?: (stage: 'loading_mint' | 'creating_quote' | 'minting_proofs' | 'locking_p2pk' | 'verifying_dleq') => void;
}

export interface IssueLockedVoucherResult {
  voucher: IssuedVoucher;
  rawProofsCount: number;
  mintClockDriftSec: number;
}

export interface ClaimLockedVoucherParams {
  token: string;
  vendorPrivkeyHex: string;
  mintUrl?: string;
}

export interface ClaimLockedVoucherResult {
  claimedAmountSats: number;
  mintFeeSats: number;
  claimedProofsCount: number;
  tokenHash: string;
  mintUrl: string;
}

export interface RefundExpiredVoucherParams {
  token: string;
  senderPrivkeyHex: string;
  mintUrl?: string;
}

export interface RefundExpiredVoucherResult {
  refundedAmountSats: number;
  mintFeeSats: number;
  refundedProofsCount: number;
  tokenHash: string;
}

export type Nut7SpendState = 'UNSPENT' | 'SPENT' | 'PENDING' | 'UNKNOWN';

export interface Nut7StateCheckResult {
  overallState: Nut7SpendState;
  perProofStates: string[];
  checkedAt: number;
}

export interface CashuCryptoService {
  computeTokenHash(token: string): Promise<string>;
  inspectVoucherToken(
    token: string,
    activeVendorPubkeyHex?: string,
    mintUrlFallback?: string
  ): Promise<InspectionResult>;
  issueLockedVoucher(params: IssueLockedVoucherParams): Promise<IssueLockedVoucherResult>;
  claimVoucherAtCounter(params: ClaimLockedVoucherParams): Promise<ClaimLockedVoucherResult>;
  reclaimExpiredVoucher(params: RefundExpiredVoucherParams): Promise<RefundExpiredVoucherResult>;
  checkVoucherNut7State(token: string, mintUrl?: string): Promise<Nut7StateCheckResult>;
}

export interface PublishNostrReceiptParams {
  voucherHash: string;
  vendor: VendorProfile;
  vendorPrivkeyHex: string;
  amountSats: number;
  amountXof: number;
  category: PurposeCategory;
  mintUrl: string;
  relays: string[];
}

export interface NostrReceiptService {
  createAndSignReceipt(params: Omit<PublishNostrReceiptParams, 'relays'>): NostrReceiptPayload;
  publishReceiptToRelays(
    receipt: NostrReceiptPayload,
    relays: string[]
  ): Promise<{ publishedRelays: string[]; failedRelays: string[] }>;
  verifyRawReceiptJson(rawJsonOrEvent: string | unknown): {
    valid: boolean;
    receipt?: NostrReceiptPayload;
    error?: string;
  };
  fetchReceiptByVoucherHash(
    voucherHash: string,
    relays: string[],
    vendorPubkeyHex?: string
  ): Promise<NostrReceiptPayload | null>;
}

export interface FxRateSnapshot {
  xofPerBtc: number;
  satsPerThousandXof: number;
  source: 'live' | 'manual' | 'fallback';
  updatedAt: number;
}

export interface FxConversionService {
  fetchLiveXofPerBtc(): Promise<FxRateSnapshot>;
  xofToSats(amountXof: number, xofPerBtc: number): number;
  satsToXof(amountSats: number, xofPerBtc: number): number;
  formatXof(amountXof: number, lang?: Language): string;
  formatSats(amountSats: number, lang?: Language): string;
}
