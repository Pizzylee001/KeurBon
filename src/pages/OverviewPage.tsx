import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useKeurBonStore } from '../state/store';
import {
  VoucherStub,
  formatSatsAmount,
  formatXofAmount,
  truncateIdentifier,
} from '../components/VoucherStub';
import {
  ClockLockIcon,
  KeyIcon,
  LockSealIcon,
  SendVoucherIcon,
  ShieldCheckIcon,
  StoreCounterIcon,
} from '../components/Icons';
import { xofToSats } from '../lib/fx';

export function OverviewPage() {
  const {
    language,
    t,
    activeRole,
    activeVendor,
    vendors,
    vouchers,
    senderKeys,
    effectiveFxRateXofPerBtc,
    setActiveRole,
    setActiveVendorId,
    setLastMintedToken,
  } = useKeurBonStore();
  const navigate = useNavigate();

  const latestRealVoucher = vouchers[0] ?? null;
  const healthDemoVendor =
    vendors.find((v) => v.category === 'health') ?? activeVendor;
  const demoAmountXof = 25000;
  const demoAmountSats = xofToSats(demoAmountXof, effectiveFxRateXofPerBtc);
  const demoLocktimeUnix = Math.floor(Date.now() / 1000) + 72 * 3600;

  const handleTestAtCounter = (token: string, vendorId?: string) => {
    setLastMintedToken(token);
    if (vendorId) {
      setActiveVendorId(vendorId);
    }
    setActiveRole('vendor');
    navigate('/redeem');
  };

  const protocolRows = [
    {
      code: 'NUT-11 P2PK',
      title: t.overview.specNut11Title,
      guarantee: t.overview.specNut11Guarantee,
      verify: t.overview.specNut11Verify,
      icon: <LockSealIcon size={16} className="shrink-0 text-[#0C5C44]" />,
    },
    {
      code: 'NUT-12 DLEQ',
      title: t.overview.specNut12Title,
      guarantee: t.overview.specNut12Guarantee,
      verify: t.overview.specNut12Verify,
      icon: <ShieldCheckIcon size={16} className="shrink-0 text-[#0C5C44]" />,
    },
    {
      code: 'Nostr 30078',
      title: t.overview.specNostrTitle,
      guarantee: t.overview.specNostrGuarantee,
      verify: t.overview.specNostrVerify,
      icon: <KeyIcon size={16} className="shrink-0 text-[#9B5305]" />,
    },
  ];

  const judgeJourneySteps =
    language === 'fr'
      ? [
          {
            stepLabel: 'Étape 1 · Frappe NUT-11',
            title: 'Verrouiller un bon en FCFA',
            desc: 'Choisissez un commerçant de Dakar et un délai de 45 sec ou 72 h pour frapper de vraies preuves P2PK sur Testnut.',
            to: '/issue',
            cta: 'Émettre un bon (/issue)',
            icon: <SendVoucherIcon size={16} className="text-[#9B5305]" />,
          },
          {
            stepLabel: 'Étape 2 · Comptoir Dakar',
            title: 'Inspecter hors-ligne & encaisser',
            desc: 'Vérifiez le verrou P2PK et les équations NUT-12 DLEQ hors-ligne, testez le rejet d’un tiers (code 20008) et encaissez.',
            to: '/redeem',
            cta: 'Comptoir commerçant (/redeem)',
            icon: <StoreCounterIcon size={16} className="text-[#0C5C44]" />,
          },
          {
            stepLabel: 'Étape 3 · Coffre émetteur',
            title: 'Suivre NUT-07 & rembourser',
            desc: 'Contrôlez l’état UNSPENT / SPENT en direct et récupérez les satoshis avec la clé émetteur dès l’échéance dépassée.',
            to: '/ledger',
            cta: 'Ouvrir le coffre (/ledger)',
            icon: <ClockLockIcon size={16} className="text-[#9B5305]" />,
          },
          {
            stepLabel: 'Étape 4 · Audit Nostr',
            title: 'Vérifier le reçu kind 30078',
            desc: 'Parcourez les clés npub des commerçants de Dakar et contrôlez la signature Schnorr BIP-340 zéro-PII.',
            to: '/vendors',
            cta: 'Annuaire & audit (/vendors)',
            icon: <ShieldCheckIcon size={16} className="text-[#0C5C44]" />,
          },
        ]
      : [
          {
            stepLabel: 'Step 1 · NUT-11 Minting',
            title: 'Lock an FCFA voucher',
            desc: 'Select a Dakar merchant and a 45 sec or 72 h refund window to mint real P2PK proofs on Testnut.',
            to: '/issue',
            cta: 'Issue a voucher (/issue)',
            icon: <SendVoucherIcon size={16} className="text-[#9B5305]" />,
          },
          {
            stepLabel: 'Step 2 · Dakar Counter',
            title: 'Inspect offline & redeem',
            desc: 'Verify the P2PK lock and NUT-12 DLEQ equations offline, test 3rd-party rejection (code 20008), and claim sats.',
            to: '/redeem',
            cta: 'Vendor counter (/redeem)',
            icon: <StoreCounterIcon size={16} className="text-[#0C5C44]" />,
          },
          {
            stepLabel: 'Step 3 · Sender Vault',
            title: 'Audit NUT-07 & reclaim',
            desc: 'Check live UNSPENT / SPENT state and reclaim satoshis with the sender key as soon as the locktime expires.',
            to: '/ledger',
            cta: 'Open sender vault (/ledger)',
            icon: <ClockLockIcon size={16} className="text-[#9B5305]" />,
          },
          {
            stepLabel: 'Step 4 · Nostr Audit',
            title: 'Verify kind 30078 receipt',
            desc: 'Browse Dakar merchant npub keys and independently verify the zero-PII BIP-340 Schnorr receipt signature.',
            to: '/vendors',
            cta: 'Registry & audit (/vendors)',
            icon: <ShieldCheckIcon size={16} className="text-[#0C5C44]" />,
          },
        ];

  return (
    <div className="kb-animate-enter flex flex-col gap-10">
      {/* Primary Asymmetric 7/5 Desktop Split Desk (Single-Column < 768px) */}
      <section
        aria-labelledby="overview-hero-heading"
        className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start"
      >
        {/* Left Column (7 cols): Headline, Plain-Language Thesis, CTAs, Role Switcher, Protocol Ledger */}
        <div className="flex flex-col md:col-span-7">
          <h1
            id="overview-hero-heading"
            className="type-display-hero max-w-[22ch] text-[#0E1E2B]"
          >
            {t.overview.heroTitle}
          </h1>

          <p className="type-body-large mt-4 text-[#3D515F]">
            {t.overview.heroLead}
          </p>

          {/* Specific Operational CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/issue" className="kb-btn-primary no-underline">
              <SendVoucherIcon size={17} />
              <span>
                {language === 'fr' ? 'Émettre un bon' : 'Issue a voucher'}
              </span>
            </Link>
            <Link to="/redeem" className="kb-btn-secondary no-underline">
              <StoreCounterIcon size={17} />
              <span>
                {language === 'fr' ? 'Comptoir commerçant' : 'Vendor counter'}
              </span>
            </Link>
            <span
              translate="no"
              className="font-mono text-xs font-medium text-[#4C616F] tabular-nums"
            >
              1 BTC = {formatXofAmount(effectiveFxRateXofPerBtc, language)}
            </span>
          </div>

          {/* Active Paris / Dakar Demo Role Switcher Explanation Strip */}
          <div className="mt-8 rounded-[8px] border border-[#CFD8D4] bg-[#E3E9E5]/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="type-h3 text-[#0E1E2B]">
                {t.overview.personaBarTitle}
              </h2>
              <div
                role="group"
                aria-label={t.nav.roleSwitcherLabel}
                className="flex flex-wrap items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setActiveRole('sender')}
                  aria-pressed={activeRole === 'sender'}
                  className={`kb-pressable inline-flex min-h-[44px] items-center gap-2 rounded-[8px] border px-3.5 text-xs font-semibold ${
                    activeRole === 'sender'
                      ? 'border-[#0E1E2B] bg-[#0E1E2B] text-[#FAFBF9]'
                      : 'border-[#637683] bg-[#FAFBF9] text-[#0E1E2B] hover:bg-[#F1F4F2]'
                  }`}
                >
                  <SendVoucherIcon size={15} />
                  <span>{t.nav.roleSenderParis}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRole('vendor')}
                  aria-pressed={activeRole === 'vendor'}
                  className={`kb-pressable inline-flex min-h-[44px] items-center gap-2 rounded-[8px] border px-3.5 text-xs font-semibold ${
                    activeRole === 'vendor'
                      ? 'border-[#0C5C44] bg-[#0C5C44] text-[#FAFBF9]'
                      : 'border-[#637683] bg-[#FAFBF9] text-[#0E1E2B] hover:bg-[#F1F4F2]'
                  }`}
                >
                  <StoreCounterIcon size={15} />
                  <span>{t.nav.roleVendorDakar}</span>
                </button>
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-[#3D515F]">
              {activeRole === 'sender'
                ? t.overview.personaSenderDesc
                : t.overview.personaVendorDesc}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#CFD8D4] pt-2.5 text-xs">
              {activeRole === 'sender' ? (
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-semibold text-[#0E1E2B]">
                    {language === 'fr'
                      ? 'Clé de remboursement émetteur (Paris) :'
                      : 'Sender refund key (Paris):'}
                  </span>
                  <span
                    translate="no"
                    className="type-data-row text-xs text-[#3D515F]"
                  >
                    {truncateIdentifier(senderKeys.npub, 16, 10)}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <label
                    htmlFor="overview-active-vendor"
                    className="font-semibold text-[#0E1E2B]"
                  >
                    {t.nav.activeVendorLabel} :
                  </label>
                  <select
                    id="overview-active-vendor"
                    value={activeVendor.id}
                    onChange={(e) => setActiveVendorId(e.target.value)}
                    className="min-h-[44px] rounded-[8px] border border-[#637683] bg-[#FAFBF9] px-2.5 py-1.5 text-xs font-semibold text-[#0E1E2B]"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.district})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Link
                to={activeRole === 'sender' ? '/issue' : '/redeem'}
                className="font-semibold text-[#0C5C44] underline"
              >
                {activeRole === 'sender'
                  ? language === 'fr'
                    ? 'Aller au bureau d’émission'
                    : 'Go to issuance desk'
                  : language === 'fr'
                    ? 'Aller au comptoir commerçant'
                    : 'Go to merchant counter'}
              </Link>
            </div>
          </div>

          {/* Hairline-Ruled 3-Row Protocol Ledger */}
          <div className="mt-8">
            <h2 className="type-h3 text-[#0E1E2B]">
              {t.overview.protocolTableTitle}
            </h2>
            <div className="mt-3 border-t border-b border-[#CFD8D4] divide-y divide-[#CFD8D4]">
              {protocolRows.map((row) => (
                <div
                  key={row.code}
                  className="grid grid-cols-1 gap-2 py-3.5 sm:grid-cols-12 sm:items-start sm:gap-4"
                >
                  <div className="flex items-center gap-2 sm:col-span-4">
                    {row.icon}
                    <span
                      translate="no"
                      className="font-mono text-xs font-semibold text-[#0E1E2B]"
                    >
                      {row.code}
                    </span>
                  </div>
                  <div className="sm:col-span-8">
                    <p className="text-sm font-semibold text-[#0E1E2B]">
                      {row.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#3D515F]">
                      {row.guarantee}
                    </p>
                    <p
                      translate="no"
                      className="mt-1 font-mono text-[11px] text-[#4C616F]"
                    >
                      {row.verify}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Live Tactile VoucherStub (Latest Real Voucher OR Clearly Labeled Demo Specimen) */}
        <div className="kb-animate-enter-delayed flex flex-col gap-3 md:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CFD8D4] pb-2.5">
            <div>
              <h2 className="type-h3 text-[#0E1E2B]">
                {latestRealVoucher
                  ? language === 'fr'
                    ? 'Dernier bon réel émis'
                    : 'Latest real issued voucher'
                  : language === 'fr'
                    ? 'Bon affecté · Santé (Démo)'
                    : 'Purpose voucher · Health (Demo)'}
              </h2>
              <p className="text-xs text-[#4C616F]">
                {latestRealVoucher
                  ? language === 'fr'
                    ? `Frappé sur ${latestRealVoucher.mintUrl.replace(/^https?:\/\//, '')}`
                    : `Minted on ${latestRealVoucher.mintUrl.replace(/^https?:\/\//, '')}`
                  : t.overview.livePreviewSubtitle}
              </p>
            </div>

            <span
              className={`inline-flex items-center rounded-[6px] border px-2 py-0.5 font-mono text-xs font-semibold ${
                latestRealVoucher
                  ? 'border-[#0C5C44] bg-[#E5F2ED] text-[#0C5C44]'
                  : 'border-[#9B5305] bg-[#FBF2E6] text-[#9B5305]'
              }`}
            >
              {latestRealVoucher
                ? language === 'fr'
                  ? 'JETON CASHU ACTIF'
                  : 'LIVE CASHU TOKEN'
                : t.nav.demoTag.toUpperCase()}
            </span>
          </div>

          {latestRealVoucher ? (
            <VoucherStub
              serialCode={latestRealVoucher.serialCode}
              amountXof={latestRealVoucher.amountXof}
              amountSats={latestRealVoucher.amountSats}
              purpose={latestRealVoucher.purpose}
              vendorName={latestRealVoucher.vendorName}
              vendorDistrict={latestRealVoucher.vendorDistrict}
              vendorNpub={latestRealVoucher.vendorNpub}
              senderNpub={latestRealVoucher.senderNpub}
              locktimeUnix={latestRealVoucher.locktimeUnix}
              status={latestRealVoucher.status}
              token={latestRealVoucher.token}
              tokenHash={latestRealVoucher.tokenHash}
              mintUrl={latestRealVoucher.mintUrl}
              dleqVerified={latestRealVoucher.dleqVerified}
              nostrReceiptEventId={latestRealVoucher.nostrReceiptEventId}
              memo={latestRealVoucher.memo}
              onTestAtCounter={(tok) =>
                handleTestAtCounter(tok, latestRealVoucher.vendorId)
              }
              showActions={true}
            />
          ) : (
            <>
              <VoucherStub
                serialCode="KB-DKR-DEMO-01"
                amountXof={demoAmountXof}
                amountSats={demoAmountSats}
                purpose="health"
                vendorName={`${healthDemoVendor.name} (${t.nav.demoTag})`}
                vendorDistrict={healthDemoVendor.district}
                vendorNpub={healthDemoVendor.npub}
                senderNpub={senderKeys.npub}
                locktimeUnix={demoLocktimeUnix}
                status="locked"
                tokenHash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                dleqVerified={true}
                memo={
                  language === 'fr'
                    ? 'Spécimen de démonstration (Bon affecté · Santé)'
                    : 'Demonstration specimen (Purpose voucher · Health)'
                }
                showActions={false}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#CFD8D4] bg-[#FAFBF9] p-3 text-xs">
                <span className="text-[#3D515F]">
                  {language === 'fr'
                    ? `Spécimen de ${formatXofAmount(demoAmountXof, language)} (${formatSatsAmount(demoAmountSats, language)}).`
                    : `Specimen for ${formatXofAmount(demoAmountXof, language)} (${formatSatsAmount(demoAmountSats, language)}).`}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={`/issue?vendor=${healthDemoVendor.id}`}
                    className="font-semibold text-[#9B5305] underline"
                  >
                    {language === 'fr'
                      ? 'Émettre ce bon réel'
                      : 'Issue this real voucher'}
                  </Link>
                  <Link
                    to="/redeem"
                    className="font-semibold text-[#0C5C44] underline"
                  >
                    {language === 'fr'
                      ? 'Tester au comptoir'
                      : 'Test at counter'}
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Hairline-Ruled 4-Step Live Judge Demo Journey Strip */}
      <section
        aria-labelledby="judge-journey-heading"
        className="border-t border-[#CFD8D4] pt-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="judge-journey-heading" className="type-h2 text-[#0E1E2B]">
            {language === 'fr'
              ? 'Parcours de vérification en direct (4 étapes)'
              : 'Live cryptographic verification journey (4 steps)'}
          </h2>
          <p className="text-xs text-[#4C616F]">
            {language === 'fr'
              ? 'Exécution réelle sur Testnut Cashu (NUT-11 / NUT-12 / NUT-07) et relais Nostr publics'
              : 'Live execution on Cashu Testnut (NUT-11 / NUT-12 / NUT-07) and public Nostr relays'}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 divide-y divide-[#CFD8D4] border-t border-b border-[#CFD8D4] md:grid-cols-4 md:divide-x md:divide-y-0">
          {judgeJourneySteps.map((item) => (
            <div
              key={item.to}
              className="flex flex-col justify-between gap-3 py-4 md:px-4 first:md:pl-0 last:md:pr-0"
            >
              <div>
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="font-mono text-xs font-semibold text-[#3D515F]">
                    {item.stepLabel}
                  </span>
                </div>
                <h3 className="type-h3 mt-1.5 text-[#0E1E2B]">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#3D515F]">
                  {item.desc}
                </p>
              </div>
              <div>
                <Link
                  to={item.to}
                  className="kb-btn-secondary w-full justify-center text-xs no-underline"
                >
                  <span>{item.cta}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default OverviewPage;
