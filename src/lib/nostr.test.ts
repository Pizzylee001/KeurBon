import { describe, expect, it } from 'vitest';
import { type Event as NostrEvent } from 'nostr-tools/pure';
import { DEFAULT_MINT_URL, DEMO_DAKAR_VENDORS } from '../data/demoVendors';
import {
  KEURBON_RECEIPT_KIND,
  assertZeroPiiObject,
  createAndSignReceipt,
  generateLocalKeypair,
  nostrService,
  verifyRawReceiptJson,
  verifyReceiptEventJson,
} from './nostr';

describe('nostrService zero-PII fulfillment receipts (kind 30078) and BIP-340 verification', () => {
  const sampleVendor = DEMO_DAKAR_VENDORS[0];
  const sampleVoucherHash =
    '5fc552a4c15202970c90c2868c664848d7ac959ff1a36828cf7cbe59354b2f6a';

  it('generates unified secp256k1 keypairs for Cashu NUT-11 and Nostr NIP-01/NIP-19', () => {
    const keys = generateLocalKeypair();
    expect(keys.privkeyHex).toMatch(/^[0-9a-f]{64}$/);
    expect(keys.pubkeyHex).toMatch(/^(02|03)[0-9a-f]{64}$/);
    expect(keys.xOnlyPubkeyHex).toMatch(/^[0-9a-f]{64}$/);
    expect(keys.pubkeyHex.slice(2)).toBe(keys.xOnlyPubkeyHex);
    expect(keys.npub).toMatch(/^npub1[0-9a-z]+$/);
    expect(keys.nsec).toMatch(/^nsec1[0-9a-z]+$/);
  });

  it('signs a zero-PII kind 30078 receipt event with required tags and valid BIP-340 signature', () => {
    const receipt = createAndSignReceipt({
      voucherHash: sampleVoucherHash,
      vendor: sampleVendor,
      vendorPrivkeyHex: sampleVendor.privkeyHex!,
      amountSats: 24_194,
      amountXof: 15_000,
      category: 'health',
      mintUrl: DEFAULT_MINT_URL,
    });

    expect(receipt.verifiedSignature).toBe(true);
    expect(receipt.voucherHash).toBe(sampleVoucherHash);
    expect(receipt.vendorNpub).toBe(sampleVendor.npub);
    expect(receipt.amountSats).toBe(24_194);
    expect(receipt.amountXof).toBe(15_000);
    expect(receipt.category).toBe('health');

    const rawEvent = receipt.rawEvent as NostrEvent;
    expect(rawEvent.kind).toBe(KEURBON_RECEIPT_KIND);
    expect(rawEvent.tags).toEqual([
      ['d', sampleVoucherHash],
      ['t', 'keurbon-receipt'],
      ['v', sampleVendor.npub],
      ['amt_sats', '24194'],
      ['amt_xof', '15000'],
      ['cat', 'health'],
      ['mint', DEFAULT_MINT_URL],
      ['pii', 'none'],
    ]);

    const verified = verifyReceiptEventJson(JSON.stringify(rawEvent));
    expect(verified.valid).toBe(true);
    expect(verified.verifiedSignature).toBe(true);
    expect(verified.eventId).toBe(rawEvent.id);
    expect(verified.voucherHash).toBe(sampleVoucherHash);
  });

  it('rejects tampered content, tampered tags, or tampered Schnorr signature (negative controls)', () => {
    const receipt = nostrService.createAndSignReceipt({
      voucherHash: sampleVoucherHash,
      vendor: sampleVendor,
      vendorPrivkeyHex: sampleVendor.privkeyHex!,
      amountSats: 8065,
      amountXof: 5000,
      category: 'school',
      mintUrl: DEFAULT_MINT_URL,
    });

    const rawEvent = receipt.rawEvent as NostrEvent;

    // 1. Tamper with amount tag without re-signing
    const tamperedTagEvent: NostrEvent = {
      ...rawEvent,
      tags: rawEvent.tags.map((t) => (t[0] === 'amt_sats' ? ['amt_sats', '999999'] : t)),
    };
    const tagCheck = verifyRawReceiptJson(JSON.stringify(tamperedTagEvent));
    expect(tagCheck.valid).toBe(false);
    expect(() => verifyReceiptEventJson(tamperedTagEvent)).toThrow(/signature|tampered/i);

    // 2. Flip 1 hex character in BIP-340 Schnorr signature
    const lastSigChar = rawEvent.sig.slice(-1);
    const flippedSig =
      rawEvent.sig.slice(0, -1) + (lastSigChar === 'a' ? 'b' : 'a');
    const tamperedSigEvent: NostrEvent = {
      ...rawEvent,
      sig: flippedSig,
    };
    const sigCheck = verifyRawReceiptJson(tamperedSigEvent);
    expect(sigCheck.valid).toBe(false);
    expect(() => verifyReceiptEventJson(tamperedSigEvent)).toThrow(/signature|tampered/i);

    // 3. Wrong event kind
    const wrongKindEvent = {
      ...rawEvent,
      kind: 1,
    };
    expect(verifyRawReceiptJson(wrongKindEvent).valid).toBe(false);
  });

  it('strictly enforces Zero-PII policy on receipt content and tags', () => {
    expect(() =>
      assertZeroPiiObject({
        voucher_hash: sampleVoucherHash,
        recipient_name: 'Amadou Diallo',
      })
    ).toThrow(/Zero-PII policy violation/i);

    expect(() =>
      assertZeroPiiObject({
        voucher_hash: sampleVoucherHash,
        note: 'contact user@example.com',
      })
    ).toThrow(/Zero-PII policy violation/i);

    const receipt = createAndSignReceipt({
      voucherHash: sampleVoucherHash,
      vendor: sampleVendor,
      vendorPrivkeyHex: sampleVendor.privkeyHex!,
      amountSats: 1000,
      amountXof: 620,
      category: 'groceries',
      mintUrl: DEFAULT_MINT_URL,
    });
    const rawEvent = receipt.rawEvent as NostrEvent;

    const piiTagEvent = {
      ...rawEvent,
      tags: [...rawEvent.tags, ['phone', '+221771234567']],
    };
    const piiTagResult = verifyRawReceiptJson(piiTagEvent);
    expect(piiTagResult.valid).toBe(false);
    expect(piiTagResult.error).toMatch(/Zero-PII policy violation/i);

    const piiContentEvent = {
      ...rawEvent,
      content: JSON.stringify({
        schema: 'keurbon.receipt.v1',
        voucher_hash: sampleVoucherHash,
        patient_name: 'Fatou Ndiaye',
      }),
    };
    const piiContentResult = verifyRawReceiptJson(piiContentEvent);
    expect(piiContentResult.valid).toBe(false);
    expect(piiContentResult.error).toMatch(/Zero-PII policy violation/i);
  });
});
