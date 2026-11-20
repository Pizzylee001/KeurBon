import { getPubKeyFromPrivKey } from '@cashu/cashu-ts';
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  verifyEvent,
  type Event as NostrEvent,
} from 'nostr-tools/pure';
import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool';
import * as nip19 from 'nostr-tools/nip19';
import {
  DEFAULT_MINT_URL,
  DEFAULT_NOSTR_RELAYS,
  bytesToHex,
  deriveKeypairFromPrivkeyHex,
  hexToBytes,
} from '../data/demoVendors';
import type {
  NostrReceiptPayload,
  NostrReceiptService,
  PublishNostrReceiptParams,
  PurposeCategory,
  Secp256k1Keypair,
  VendorProfile,
} from '../types/keurbon';

if (typeof WebSocket !== 'undefined') {
  try {
    useWebSocketImplementation(WebSocket);
  } catch {
    // WebSocket implementation already configured
  }
}

export const KEURBON_RECEIPT_KIND = 30078;
export const KEURBON_RECEIPT_TAG = 'keurbon-receipt';
export const RELAY_PUBLISH_TIMEOUT_MS = 6000;

const VALID_CATEGORIES = new Set<PurposeCategory>([
  'health',
  'school',
  'hardware',
  'groceries',
  'electricity',
]);

const FORBIDDEN_PII_KEYS = new Set([
  'name',
  'fullname',
  'full_name',
  'firstname',
  'first_name',
  'lastname',
  'last_name',
  'sender_name',
  'recipient_name',
  'beneficiary_name',
  'patient_name',
  'student_name',
  'email',
  'phone',
  'phone_number',
  'telephone',
  'mobile',
  'address',
  'street',
  'passport',
  'national_id',
  'ssn',
]);

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export function normalizeXOnlyPubkeyHex(pubkeyHex: string): string {
  const clean = pubkeyHex.trim().toLowerCase();
  if (clean.length === 66 && (clean.startsWith('02') || clean.startsWith('03'))) {
    return clean.slice(2);
  }
  return clean;
}

export function generateLocalKeypair(): Secp256k1Keypair {
  const skBytes = generateSecretKey();
  const privkeyHex = bytesToHex(skBytes);
  const compressedPubBytes = getPubKeyFromPrivKey(skBytes);
  const pubkeyHex = bytesToHex(compressedPubBytes);
  const xOnlyPubkeyHex = getPublicKey(skBytes);
  const npub = nip19.npubEncode(xOnlyPubkeyHex);
  const nsec = nip19.nsecEncode(skBytes);

  return {
    privkeyHex,
    pubkeyHex,
    xOnlyPubkeyHex,
    npub,
    nsec,
  };
}

export function assertZeroPiiObject(obj: Record<string, unknown>): void {
  for (const [rawKey, val] of Object.entries(obj)) {
    const key = rawKey.trim().toLowerCase();
    if (FORBIDDEN_PII_KEYS.has(key)) {
      throw new Error(`Zero-PII policy violation: forbidden personal field "${rawKey}"`);
    }
    if (typeof val === 'string' && EMAIL_REGEX.test(val)) {
      throw new Error(`Zero-PII policy violation: email pattern detected in field "${rawKey}"`);
    }
  }
}

export interface FlexibleReceiptParams {
  voucherHash: string;
  vendor?: VendorProfile;
  vendorNpub?: string;
  vendorPrivkeyHex: string;
  amountSats: number;
  amountXof: number;
  category: PurposeCategory;
  mintUrl?: string;
  relays?: string[];
  createdAt?: number;
}

export function createAndSignReceipt(
  params: Omit<PublishNostrReceiptParams, 'relays'> | FlexibleReceiptParams
): NostrReceiptPayload {
  const voucherHash = params.voucherHash?.trim().toLowerCase();
  if (!voucherHash) {
    throw new Error('Voucher SHA-256 hash (d-tag) is required to sign a Nostr receipt.');
  }

  const keypair = deriveKeypairFromPrivkeyHex(params.vendorPrivkeyHex);
  const vendorNpub =
    params.vendor?.npub?.trim() ||
    (params as FlexibleReceiptParams).vendorNpub?.trim() ||
    keypair.npub;

  if (!vendorNpub.startsWith('npub1')) {
    throw new Error('Invalid vendor npub format.');
  }

  const amountSats = Math.round(Number(params.amountSats));
  const amountXof = Math.round(Number(params.amountXof));
  if (!Number.isFinite(amountSats) || amountSats <= 0) {
    throw new Error('Receipt amountSats must be a positive integer.');
  }
  if (!Number.isFinite(amountXof) || amountXof < 0) {
    throw new Error('Receipt amountXof must be a non-negative integer.');
  }

  const category: PurposeCategory = VALID_CATEGORIES.has(params.category)
    ? params.category
    : 'health';
  const mintUrl = (params.mintUrl || DEFAULT_MINT_URL).trim();
  const createdAt =
    typeof (params as FlexibleReceiptParams).createdAt === 'number'
      ? Math.floor((params as FlexibleReceiptParams).createdAt!)
      : Math.floor(Date.now() / 1000);

  const contentPayload = {
    schema: 'keurbon.receipt.v1' as const,
    version: 1,
    voucher_hash: voucherHash,
    vendor_npub: vendorNpub,
    amount_sats: amountSats,
    amount_xof: amountXof,
    category,
    timestamp: createdAt,
    mint_url: mintUrl,
    pii: 'none' as const,
  };

  assertZeroPiiObject(contentPayload);

  const tags: string[][] = [
    ['d', voucherHash],
    ['t', KEURBON_RECEIPT_TAG],
    ['v', vendorNpub],
    ['amt_sats', String(amountSats)],
    ['amt_xof', String(amountXof)],
    ['cat', category],
    ['mint', mintUrl],
    ['pii', 'none'],
  ];

  const signedEvent = finalizeEvent(
    {
      kind: KEURBON_RECEIPT_KIND,
      created_at: createdAt,
      tags,
      content: JSON.stringify(contentPayload),
    },
    hexToBytes(keypair.privkeyHex)
  );

  const verifiedSignature = verifyEvent(signedEvent);
  if (!verifiedSignature) {
    throw new Error('Local BIP-340 Schnorr signature verification failed.');
  }

  return {
    eventId: signedEvent.id,
    pubkey: signedEvent.pubkey,
    createdAt: signedEvent.created_at,
    voucherHash,
    vendorNpub,
    amountSats,
    amountXof,
    category,
    mintUrl,
    verifiedSignature,
    relaysPublished: [],
    rawEvent: signedEvent,
  };
}

async function publishSingleRelayWithTimeout(
  pool: SimplePool,
  relayUrl: string,
  event: NostrEvent,
  timeoutMs: number
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const publishPromises = pool.publish([relayUrl], event);
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Relay timeout (${timeoutMs}ms): ${relayUrl}`));
      }, timeoutMs);
    });
    await Promise.race([Promise.all(publishPromises), timeoutPromise]);
    return true;
  } catch {
    return false;
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export async function publishReceiptToRelays(
  receipt: NostrReceiptPayload,
  relays: string[] = DEFAULT_NOSTR_RELAYS,
  timeoutMs = RELAY_PUBLISH_TIMEOUT_MS
): Promise<{ publishedRelays: string[]; failedRelays: string[] }> {
  const targetRelays = Array.from(
    new Set((relays.length > 0 ? relays : DEFAULT_NOSTR_RELAYS).map((r) => r.trim()).filter(Boolean))
  );

  if (targetRelays.length === 0) {
    return { publishedRelays: [], failedRelays: [] };
  }

  const validation = verifyRawReceiptJson(receipt.rawEvent ?? receipt);
  if (!validation.valid || !validation.receipt) {
    throw new Error(validation.error || 'Cannot publish invalid Nostr receipt event.');
  }

  const signedEvent = validation.receipt.rawEvent as NostrEvent;
  const pool = new SimplePool();
  const publishedRelays: string[] = [];
  const failedRelays: string[] = [];

  try {
    const outcomes = await Promise.all(
      targetRelays.map(async (relayUrl) => {
        const ok = await publishSingleRelayWithTimeout(pool, relayUrl, signedEvent, timeoutMs);
        return { relayUrl, ok };
      })
    );

    for (const outcome of outcomes) {
      if (outcome.ok) {
        publishedRelays.push(outcome.relayUrl);
      } else {
        failedRelays.push(outcome.relayUrl);
      }
    }
  } finally {
    try {
      pool.close(targetRelays);
    } catch {
      // Ignore pool close errors
    }
  }

  return { publishedRelays, failedRelays };
}

export type PublishFulfillmentReceiptResult = NostrReceiptPayload & {
  receipt: NostrReceiptPayload;
  publishedRelays: string[];
  failedRelays: string[];
};

export async function publishFulfillmentReceipt(
  params: PublishNostrReceiptParams | FlexibleReceiptParams,
  timeoutMs = RELAY_PUBLISH_TIMEOUT_MS
): Promise<PublishFulfillmentReceiptResult> {
  const signedReceipt = createAndSignReceipt(params);
  const relays =
    Array.isArray(params.relays) && params.relays.length > 0
      ? params.relays
      : DEFAULT_NOSTR_RELAYS;

  const { publishedRelays, failedRelays } = await publishReceiptToRelays(
    signedReceipt,
    relays,
    timeoutMs
  );

  const finalizedReceipt: NostrReceiptPayload = {
    ...signedReceipt,
    relaysPublished: publishedRelays,
  };

  return {
    ...finalizedReceipt,
    receipt: finalizedReceipt,
    publishedRelays,
    failedRelays,
  };
}

function getTagValue(tags: string[][], names: string[]): string | undefined {
  for (const name of names) {
    const found = tags.find((t) => Array.isArray(t) && t[0] === name && typeof t[1] === 'string');
    if (found && found[1].trim()) {
      return found[1].trim();
    }
  }
  return undefined;
}

export function verifyRawReceiptJson(rawJsonOrEvent: string | unknown): {
  valid: boolean;
  receipt?: NostrReceiptPayload;
  error?: string;
} {
  try {
    let parsed: unknown = rawJsonOrEvent;
    if (typeof rawJsonOrEvent === 'string') {
      const trimmed = rawJsonOrEvent.trim();
      if (!trimmed) {
        return { valid: false, error: 'Empty receipt JSON input.' };
      }
      parsed = JSON.parse(trimmed);
    }

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Receipt input must be a JSON object.' };
    }

    const record = parsed as Record<string, unknown>;
    const candidateEvent = (
      record.rawEvent && typeof record.rawEvent === 'object' ? record.rawEvent : record
    ) as Record<string, unknown>;

    if (
      typeof candidateEvent.id !== 'string' ||
      typeof candidateEvent.pubkey !== 'string' ||
      typeof candidateEvent.created_at !== 'number' ||
      typeof candidateEvent.kind !== 'number' ||
      !Array.isArray(candidateEvent.tags) ||
      typeof candidateEvent.content !== 'string' ||
      typeof candidateEvent.sig !== 'string'
    ) {
      return {
        valid: false,
        error: 'Malformed Nostr event: missing required NIP-01 fields (id, pubkey, created_at, kind, tags, content, sig).',
      };
    }

    if (candidateEvent.kind !== KEURBON_RECEIPT_KIND) {
      return {
        valid: false,
        error: `Invalid Nostr event kind: expected ${KEURBON_RECEIPT_KIND}, got ${candidateEvent.kind}.`,
      };
    }

    const tags = candidateEvent.tags as string[][];
    for (const tag of tags) {
      if (Array.isArray(tag) && typeof tag[0] === 'string') {
        const tagKey = tag[0].trim().toLowerCase();
        if (FORBIDDEN_PII_KEYS.has(tagKey)) {
          return {
            valid: false,
            error: `Zero-PII policy violation: forbidden tag "${tag[0]}" present in event.`,
          };
        }
        if (typeof tag[1] === 'string' && EMAIL_REGEX.test(tag[1])) {
          return {
            valid: false,
            error: `Zero-PII policy violation: email address detected in tag "${tag[0]}".`,
          };
        }
      }
    }

    const piiTag = getTagValue(tags, ['pii']);
    if (piiTag && piiTag.toLowerCase() !== 'none') {
      return {
        valid: false,
        error: `Zero-PII policy violation: pii tag must be "none", got "${piiTag}".`,
      };
    }

    let contentObj: Record<string, unknown> = {};
    if (candidateEvent.content.trim()) {
      try {
        const parsedContent: unknown = JSON.parse(candidateEvent.content);
        if (!parsedContent || typeof parsedContent !== 'object' || Array.isArray(parsedContent)) {
          return { valid: false, error: 'Event content must be a JSON object.' };
        }
        contentObj = parsedContent as Record<string, unknown>;
        assertZeroPiiObject(contentObj);
      } catch (err) {
        return {
          valid: false,
          error: err instanceof Error ? err.message : 'Invalid receipt content JSON.',
        };
      }
    }

    const voucherHash =
      getTagValue(tags, ['d']) ||
      (typeof contentObj.voucher_hash === 'string' ? contentObj.voucher_hash.trim() : '');
    if (!voucherHash) {
      return {
        valid: false,
        error: 'Missing required "d" tag (voucherHash) on kind 30078 receipt event.',
      };
    }

    const topicTag = getTagValue(tags, ['t']);
    if (topicTag && topicTag !== KEURBON_RECEIPT_TAG) {
      return {
        valid: false,
        error: `Unexpected receipt topic tag "t": expected "${KEURBON_RECEIPT_TAG}", got "${topicTag}".`,
      };
    }

    const rawVendorNpub =
      getTagValue(tags, ['v', 'vendor_npub']) ||
      (typeof contentObj.vendor_npub === 'string' ? contentObj.vendor_npub.trim() : '');
    const vendorNpub =
      rawVendorNpub && rawVendorNpub.startsWith('npub1')
        ? rawVendorNpub
        : nip19.npubEncode(candidateEvent.pubkey);

    const rawSats =
      getTagValue(tags, ['amt_sats', 'amount_sats']) ??
      (typeof contentObj.amount_sats === 'number' ? String(contentObj.amount_sats) : undefined);
    const amountSats = rawSats !== undefined ? Number(rawSats) : NaN;
    if (!Number.isFinite(amountSats) || amountSats <= 0) {
      return {
        valid: false,
        error: 'Missing or invalid amountSats (amt_sats tag) on receipt event.',
      };
    }

    const rawXof =
      getTagValue(tags, ['amt_xof', 'amount_xof']) ??
      (typeof contentObj.amount_xof === 'number' ? String(contentObj.amount_xof) : undefined);
    const amountXof = rawXof !== undefined ? Number(rawXof) : 0;
    if (!Number.isFinite(amountXof) || amountXof < 0) {
      return {
        valid: false,
        error: 'Invalid amountXof (amt_xof tag) on receipt event.',
      };
    }

    const rawCat =
      getTagValue(tags, ['cat', 'category']) ||
      (typeof contentObj.category === 'string' ? contentObj.category.trim() : 'health');
    const category: PurposeCategory = VALID_CATEGORIES.has(rawCat as PurposeCategory)
      ? (rawCat as PurposeCategory)
      : 'health';

    const mintUrl =
      getTagValue(tags, ['mint', 'mint_url']) ||
      (typeof contentObj.mint_url === 'string' ? contentObj.mint_url.trim() : DEFAULT_MINT_URL);

    const nostrEvent: NostrEvent = {
      id: candidateEvent.id,
      pubkey: candidateEvent.pubkey,
      created_at: candidateEvent.created_at,
      kind: candidateEvent.kind,
      tags: candidateEvent.tags as string[][],
      content: candidateEvent.content,
      sig: candidateEvent.sig,
    };
    const isSigValid = verifyEvent(nostrEvent);
    if (!isSigValid) {
      return {
        valid: false,
        error: 'Invalid BIP-340 Schnorr signature or tampered Nostr event payload.',
      };
    }

    const receipt: NostrReceiptPayload = {
      eventId: nostrEvent.id,
      pubkey: nostrEvent.pubkey,
      createdAt: nostrEvent.created_at,
      voucherHash: voucherHash.toLowerCase(),
      vendorNpub,
      amountSats: Math.round(amountSats),
      amountXof: Math.round(amountXof),
      category,
      mintUrl,
      verifiedSignature: true,
      relaysPublished: Array.isArray(record.relaysPublished)
        ? (record.relaysPublished as string[])
        : undefined,
      rawEvent: nostrEvent,
    };

    return { valid: true, receipt };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Unable to parse or verify Nostr receipt JSON.',
    };
  }
}

export type VerifiedReceiptEventResult = NostrReceiptPayload & {
  valid: true;
  receipt: NostrReceiptPayload;
};

export function verifyReceiptEventJson(
  rawJsonOrEvent: string | unknown
): VerifiedReceiptEventResult {
  const result = verifyRawReceiptJson(rawJsonOrEvent);
  if (!result.valid || !result.receipt) {
    throw new Error(result.error || 'Invalid Nostr kind 30078 receipt event.');
  }
  return {
    ...result.receipt,
    valid: true,
    receipt: result.receipt,
  };
}

export async function fetchReceiptByVoucherHash(
  voucherHashOrParams:
    | string
    | { voucherHash: string; relays?: string[]; vendorPubkeyHex?: string },
  relays: string[] = DEFAULT_NOSTR_RELAYS,
  vendorPubkeyHex?: string,
  timeoutMs = RELAY_PUBLISH_TIMEOUT_MS
): Promise<NostrReceiptPayload | null> {
  const rawHash =
    typeof voucherHashOrParams === 'string'
      ? voucherHashOrParams
      : voucherHashOrParams.voucherHash;
  const resolvedRelays =
    typeof voucherHashOrParams === 'string'
      ? relays
      : voucherHashOrParams.relays ?? relays;
  const resolvedVendorPubkey =
    typeof voucherHashOrParams === 'string'
      ? vendorPubkeyHex
      : voucherHashOrParams.vendorPubkeyHex ?? vendorPubkeyHex;

  const cleanHash = rawHash?.trim().toLowerCase();
  if (!cleanHash) {
    return null;
  }

  const targetRelays = Array.from(
    new Set(
      (resolvedRelays && resolvedRelays.length > 0 ? resolvedRelays : DEFAULT_NOSTR_RELAYS)
        .map((r) => r.trim())
        .filter(Boolean)
    )
  );

  if (targetRelays.length === 0) {
    return null;
  }

  const pool = new SimplePool();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const filter: {
      kinds: number[];
      '#d': string[];
      authors?: string[];
    } = {
      kinds: [KEURBON_RECEIPT_KIND],
      '#d': [cleanHash],
    };

    if (resolvedVendorPubkey && resolvedVendorPubkey.trim()) {
      filter.authors = [normalizeXOnlyPubkeyHex(resolvedVendorPubkey)];
    }

    const queryPromise = pool.querySync(targetRelays, filter, {
      maxWait: timeoutMs,
    });
    const timeoutPromise = new Promise<NostrEvent[]>((resolve) => {
      timer = setTimeout(() => resolve([]), timeoutMs + 500);
    });

    const events = await Promise.race([queryPromise, timeoutPromise]);
    const sorted = [...events].sort((a, b) => b.created_at - a.created_at);

    for (const ev of sorted) {
      const checked = verifyRawReceiptJson(ev);
      if (checked.valid && checked.receipt && checked.receipt.voucherHash === cleanHash) {
        return {
          ...checked.receipt,
          relaysPublished: targetRelays,
        };
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    try {
      pool.close(targetRelays);
    } catch {
      // Ignore pool close errors
    }
  }
}

export async function fetchAndVerifyReceiptByHash(
  voucherHashOrParams:
    | string
    | { voucherHash: string; relays?: string[]; vendorPubkeyHex?: string },
  relays: string[] = DEFAULT_NOSTR_RELAYS,
  vendorPubkeyHex?: string,
  timeoutMs = RELAY_PUBLISH_TIMEOUT_MS
): Promise<NostrReceiptPayload | null> {
  return fetchReceiptByVoucherHash(
    voucherHashOrParams,
    relays,
    vendorPubkeyHex,
    timeoutMs
  );
}

export interface ExtendedNostrReceiptService extends NostrReceiptService {
  publishFulfillmentReceipt(
    params: PublishNostrReceiptParams | FlexibleReceiptParams,
    timeoutMs?: number
  ): Promise<PublishFulfillmentReceiptResult>;
  fetchAndVerifyReceiptByHash(
    voucherHashOrParams:
      | string
      | { voucherHash: string; relays?: string[]; vendorPubkeyHex?: string },
    relays?: string[],
    vendorPubkeyHex?: string,
    timeoutMs?: number
  ): Promise<NostrReceiptPayload | null>;
  verifyReceiptEventJson(rawJsonOrEvent: string | unknown): VerifiedReceiptEventResult;
  generateLocalKeypair(): Secp256k1Keypair;
}

export const nostrService: ExtendedNostrReceiptService = {
  createAndSignReceipt,
  publishReceiptToRelays,
  publishFulfillmentReceipt,
  verifyRawReceiptJson,
  verifyReceiptEventJson,
  fetchReceiptByVoucherHash,
  fetchAndVerifyReceiptByHash,
  generateLocalKeypair,
};
