// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FX_RATE_XOF_PER_BTC,
  DEFAULT_MINT_URL,
  DEMO_DAKAR_VENDORS,
  DEMO_PARIS_SENDER_KEYS,
  DEMO_UNAUTHORIZED_ATTACKER_KEYS,
} from '../data/demoVendors';
import {
  cashuService,
  checkNut7SpendState,
  claimLockedVoucher,
  computeTokenHash,
  getEncodedTokenV4,
  getOrLoadWallet,
  inspectTokenOffline,
  issueLockedVoucher,
  normalizeCompressedPubkeyHex,
  parseProofP2PKLock,
  pubkeysMatch,
  verifyProofsDleqOffline,
} from './cashu';

describe('cashuService NUT-11 P2PK, NUT-12 offline DLEQ, and live Testnut integration', () => {
  const vendor = DEMO_DAKAR_VENDORS[0];
  const senderKeys = DEMO_PARIS_SENDER_KEYS;
  const attackerKeys = DEMO_UNAUTHORIZED_ATTACKER_KEYS;

  it('computes deterministic 64-char SHA-256 token hashes', async () => {
    const h1 = await computeTokenHash('cashuBtest123');
    const h2 = await computeTokenHash('  cashuBtest123  ');
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).toBe(h2);
  });

  it('matches x-only 64-char hex and 02/03-prefixed 66-char compressed pubkeys safely', () => {
    const compressed = vendor.pubkeyHex;
    const xOnly = compressed.slice(2);
    expect(compressed).toHaveLength(66);
    expect(xOnly).toHaveLength(64);
    expect(pubkeysMatch(compressed, xOnly)).toBe(true);
    expect(pubkeysMatch(compressed.toUpperCase(), xOnly)).toBe(true);
    expect(pubkeysMatch(compressed, attackerKeys.pubkeyHex)).toBe(false);
    expect(normalizeCompressedPubkeyHex(xOnly)).toBe(`02${xOnly}`);
  });

  it('parses NUT-11 P2PK secret tuples and extracts vendor pubkey, locktime, and refund key', () => {
    const sampleSecret = JSON.stringify([
      'P2PK',
      {
        nonce: '889e97c5797635bd509577ce8c5cd357f6c1e457701502c757ac42cbc3fff581',
        data: vendor.pubkeyHex,
        tags: [
          ['locktime', '1795174604'],
          ['refund', senderKeys.pubkeyHex],
        ],
      },
    ]);

    const parsed = parseProofP2PKLock(sampleSecret);
    expect(parsed.isP2PK).toBe(true);
    expect(parsed.lockedToPubkeyHex).toBe(vendor.pubkeyHex);
    expect(parsed.locktimeUnix).toBe(1795174604);
    expect(parsed.refundPubkeyHex).toBe(senderKeys.pubkeyHex);

    const nonP2pk = parseProofP2PKLock('plain_unlocked_secret_nonce');
    expect(nonP2pk.isP2PK).toBe(false);
    expect(nonP2pk.lockedToPubkeyHex).toBeNull();
  });

  it('returns structured error codes for empty or malformed tokens', async () => {
    const emptyRes = await inspectTokenOffline('   ');
    expect(emptyRes.validFormat).toBe(false);
    expect(emptyRes.errorCode).toBe('EMPTY_TOKEN');

    const badRes = await inspectTokenOffline('cashuB_not_valid_cbor_token');
    expect(badRes.validFormat).toBe(false);
    expect(badRes.errorCode).toBe('MALFORMED_TOKEN');
  });

  it(
    'mints, locks (NUT-11 P2PK), verifies offline DLEQ + tamper negative control, rejects unauthorized claim (20008), and claims on live Testnut',
    async () => {
      const targetSats = 32;
      const locktimeUnix = Math.floor(Date.now() / 1000) + 3600;
      const stages: string[] = [];

      // 1. Issue real NUT-11 P2PK locked voucher on live Testnut
      const issued = await issueLockedVoucher({
        mintUrl: DEFAULT_MINT_URL,
        amountSats: targetSats,
        amountXof: 20,
        fxRateXofPerBtc: DEFAULT_FX_RATE_XOF_PER_BTC,
        purpose: 'health',
        vendor,
        senderKeys,
        locktimeUnix,
        memo: 'Medina Pharmacy voucher test',
        onProgress: (stage) => stages.push(stage),
      });

      expect(issued.token.startsWith('cashuB')).toBe(true);
      expect(issued.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(issued.dleqVerified).toBe(true);
      expect(issued.voucher.amountSats).toBe(targetSats);
      expect(stages).toEqual([
        'loading_mint',
        'creating_quote',
        'minting_proofs',
        'locking_p2pk',
        'verifying_dleq',
      ]);

      // 2. 100% Offline NUT-11 + NUT-12 DLEQ inspection (positive control)
      const offlineInspection = await inspectTokenOffline({
        token: issued.token,
        activeVendorPubkeyHex: vendor.pubkeyHex,
        allowNetworkFallback: false,
      });

      expect(offlineInspection.validFormat).toBe(true);
      expect(offlineInspection.p2pkLocked).toBe(true);
      expect(offlineInspection.lockedToPubkeyHex).toBe(vendor.pubkeyHex);
      expect(offlineInspection.matchesActiveVendor).toBe(true);
      expect(offlineInspection.refundPubkeyHex).toBe(senderKeys.pubkeyHex);
      expect(offlineInspection.locktimeUnix).toBe(locktimeUnix);
      expect(offlineInspection.isExpired).toBe(false);
      expect(offlineInspection.dleqAllValid).toBe(true);
      expect(offlineInspection.errorCode).toBeUndefined();

      // 3. Offline inspection against wrong vendor / attacker key
      const mismatchInspection = await inspectTokenOffline({
        token: issued.token,
        activeVendorPubkeyHex: attackerKeys.pubkeyHex,
        allowNetworkFallback: false,
      });
      expect(mismatchInspection.matchesActiveVendor).toBe(false);
      expect(mismatchInspection.errorCode).toBe('VENDOR_PUBKEY_MISMATCH');

      // 4. Offline NUT-12 DLEQ tampered negative control
      const { wallet } = await getOrLoadWallet(DEFAULT_MINT_URL, {
        preferCache: true,
        allowNetwork: false,
      });
      const decoded = wallet.decodeToken(issued.token);
      const tamperedProofs = decoded.proofs.map((p, idx) => {
        if (idx !== 0 || !p.dleq) return p;
        const lastChar = p.dleq.s.slice(-1);
        const flippedS = p.dleq.s.slice(0, -1) + (lastChar === '0' ? '1' : '0');
        return {
          ...p,
          dleq: {
            ...p.dleq,
            s: flippedS,
          },
        };
      });

      const directTamperCheck = await verifyProofsDleqOffline(tamperedProofs, DEFAULT_MINT_URL);
      expect(directTamperCheck.dleqAllValid).toBe(false);
      expect(directTamperCheck.invalidCount).toBe(1);

      const tamperedToken = getEncodedTokenV4({
        mint: DEFAULT_MINT_URL,
        proofs: tamperedProofs,
        unit: 'sat',
      });
      const tamperedInspection = await inspectTokenOffline({
        token: tamperedToken,
        activeVendorPubkeyHex: vendor.pubkeyHex,
        allowNetworkFallback: false,
      });
      expect(tamperedInspection.dleqAllValid).toBe(false);
      expect(tamperedInspection.errorCode).toBe('DLEQ_INVALID');

      // 5. Live mint unauthorized attacker claim must be rejected with code 20008
      await expect(
        claimLockedVoucher(
          {
            token: issued.token,
            vendorPrivkeyHex: attackerKeys.privkeyHex,
          },
          { forceAttempt: true }
        )
      ).rejects.toThrow(/20008|P2PK spend conditions are not met/i);

      // 6. Check live NUT-7 state is UNSPENT before vendor claim
      const preClaimState = await checkNut7SpendState(issued.token);
      expect(preClaimState.overallState).toBe('UNSPENT');

      // 7. Claim voucher with authorized Dakar vendor private key
      const claimed = await cashuService.claimLockedVoucher({
        token: issued.token,
        vendorPrivkeyHex: vendor.privkeyHex!,
      });
      expect(claimed.claimedAmountSats).toBeGreaterThanOrEqual(targetSats);
      expect(claimed.tokenHash).toBe(issued.tokenHash);

      // 8. Check live NUT-7 state is SPENT after vendor claim
      const postClaimState = await checkNut7SpendState(issued.token);
      expect(postClaimState.overallState).toBe('SPENT');
    },
    30_000
  );
});
