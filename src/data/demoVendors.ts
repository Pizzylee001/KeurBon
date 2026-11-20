import { getPubKeyFromPrivKey } from '@cashu/cashu-ts';
import { getPublicKey } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import type { Secp256k1Keypair, VendorProfile } from '../types/keurbon';

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function deriveKeypairFromPrivkeyHex(privkeyHex: string): Secp256k1Keypair {
  const skBytes = hexToBytes(privkeyHex);
  const compressedPubBytes = getPubKeyFromPrivKey(skBytes);
  const pubkeyHex = bytesToHex(compressedPubBytes);
  const xOnlyPubkeyHex = getPublicKey(skBytes);
  const npub = nip19.npubEncode(xOnlyPubkeyHex);
  const nsec = nip19.nsecEncode(skBytes);

  return {
    privkeyHex: privkeyHex.toLowerCase(),
    pubkeyHex,
    xOnlyPubkeyHex,
    npub,
    nsec,
  };
}

/**
 * Deterministic Paris Diaspora Sender Demo Keypair
 * Allows instant NUT-11 refund testing and live judge persona switching.
 */
const DEMO_SENDER_PRIVKEY_HEX =
  '2f8b41c79a63d01e4b825c91f37a60e2c419b85d7e023a6f1c549d80e7b31a24';

export const DEMO_PARIS_SENDER_KEYS: Secp256k1Keypair =
  deriveKeypairFromPrivkeyHex(DEMO_SENDER_PRIVKEY_HEX);

/**
 * Deterministic Unauthorized Third-Party Keypair
 * Used in /redeem to prove that an attacker cannot claim a NUT-11 P2PK voucher locked to a Dakar vendor.
 */
const DEMO_ATTACKER_PRIVKEY_HEX =
  '7e19c408b532f6d1a904e83c2b715f90d4a82e61c37b59f02a46d81e5c397b10';

export const DEMO_UNAUTHORIZED_ATTACKER_KEYS: Secp256k1Keypair =
  deriveKeypairFromPrivkeyHex(DEMO_ATTACKER_PRIVKEY_HEX);

const VENDOR_SEEDS = [
  {
    id: 'vendor-medina-pharma',
    name: 'Pharmacie Médina Rue 6',
    district: 'Médina · Dakar',
    address: 'Angle Rue 6 x Avenue Blaise Diagne, Médina',
    category: 'health' as const,
    privkeyHex:
      '4a91e307c6b28d15f409a72c8e31b56d90f24c71e83a59b02d64f81c3a579e12',
    createdAt: 1715000000,
  },
  {
    id: 'vendor-fass-quincaillerie',
    name: 'Quincaillerie Fass Delorme',
    district: 'Fass · Dakar',
    address: 'Boulevard Dial Diop, face Canal IV, Fass Delorme',
    category: 'hardware' as const,
    privkeyHex:
      '5b82f418d7c39e26a510b83d9f42c67e01a35d82f94b60c13e75a92d4b680f23',
    createdAt: 1715010000,
  },
  {
    id: 'vendor-hann-ecole',
    name: 'Cours Sainte-Marie de Hann (Économat)',
    district: 'Hann Bel-Air · Dakar',
    address: 'Route du Front de Terre, Hann Maristes',
    category: 'school' as const,
    privkeyHex:
      '6c73a529e8d40f37b621c94ea053d78f12b46e93a05c71d24f86b03e5c791a34',
    createdAt: 1715020000,
  },
  {
    id: 'vendor-plateau-alimentation',
    name: 'Alimentation Générale Sandaga & Plateau',
    district: 'Plateau · Dakar',
    address: 'Avenue Lamine Guèye x Rue Félix Faure, Dakar-Plateau',
    category: 'groceries' as const,
    privkeyHex:
      '7d64b630f9e51a48c732da5fb164e89a23c57fa4b16d82e35a97c14f6d802b45',
    createdAt: 1715030000,
  },
] as const;

export const DEMO_DAKAR_VENDORS: VendorProfile[] = VENDOR_SEEDS.map((seed) => {
  const keys = deriveKeypairFromPrivkeyHex(seed.privkeyHex);
  return {
    id: seed.id,
    name: seed.name,
    district: seed.district,
    address: seed.address,
    category: seed.category,
    npub: keys.npub,
    pubkeyHex: keys.pubkeyHex,
    privkeyHex: keys.privkeyHex,
    isDemo: true,
    createdAt: seed.createdAt,
  };
});

export const DEFAULT_MINT_URL = 'https://testnut.cashu.space';

export const DEFAULT_NOSTR_RELAYS = [
  'wss://nos.lol',
  'wss://relay.primal.net',
];

/**
 * Realistic reference BTC/XOF rate (~62,000,000 FCFA per 1 BTC -> ~620 FCFA per 1,000 sats)
 * Used as deterministic initial rate before live FX refresh or manual override.
 */
export const DEFAULT_FX_RATE_XOF_PER_BTC = 62_000_000;
