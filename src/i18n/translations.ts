import type { Language, PurposeCategory, VoucherStatus } from '../types/keurbon';

export interface TranslationDictionary {
  meta: {
    skipToContent: string;
    brandTagline: string;
    protocolFooter: string;
    securityByDesignTitle: string;
    securityByDesignNote: string;
  };
  nav: {
    overview: string;
    issue: string;
    redeem: string;
    ledger: string;
    vendors: string;
    roleSenderParis: string;
    roleVendorDakar: string;
    roleSwitcherLabel: string;
    languageSwitcherLabel: string;
    openMenu: string;
    closeMenu: string;
    activeVendorLabel: string;
    demoTag: string;
  };
  categories: Record<PurposeCategory, string>;
  statuses: Record<VoucherStatus, string>;
  stub: {
    voucherHeaderPrefix: string;
    faceValueLabel: string;
    satsEquivalentLabel: string;
    beneficiaryVendorLabel: string;
    vendorNpubLabel: string;
    senderRefundKeyLabel: string;
    locktimeLabel: string;
    tokenHashLabel: string;
    dleqVerifiedBadge: string;
    dleqPendingBadge: string;
    nut11SealLocked: string;
    nut11SealDraft: string;
    nut11SealRedeemed: string;
    nut11SealExpired: string;
    nut11SealRefunded: string;
    copyTokenButton: string;
    copiedTokenToast: string;
    printVoucherButton: string;
    testAtCounterButton: string;
    qrAltText: string;
    qrDraftPlaceholder: string;
    autoRefundActive: string;
    expiredRefundReady: string;
    serialLabel: string;
    mintLabel: string;
  };
  overview: {
    heroTitle: string;
    heroLead: string;
    ctaIssueVoucher: string;
    ctaVendorCounter: string;
    personaBarTitle: string;
    personaSenderDesc: string;
    personaVendorDesc: string;
    protocolTableTitle: string;
    specColumnPrimitive: string;
    specColumnGuarantee: string;
    specColumnVerification: string;
    specNut11Title: string;
    specNut11Guarantee: string;
    specNut11Verify: string;
    specNut12Title: string;
    specNut12Guarantee: string;
    specNut12Verify: string;
    specNut07Title: string;
    specNut07Guarantee: string;
    specNut07Verify: string;
    specNostrTitle: string;
    specNostrGuarantee: string;
    specNostrVerify: string;
    livePreviewTitle: string;
    livePreviewSubtitle: string;
  };
  issue: {
    pageTitle: string;
    pageSubtitle: string;
    amountXofLabel: string;
    amountXofHelper: string;
    amountSatsLabel: string;
    fxRateLabel: string;
    refreshFxButton: string;
    manualFxToggle: string;
    categoryLabel: string;
    vendorSelectLabel: string;
    vendorSelectHelper: string;
    locktimePresetLabel: string;
    locktime24h: string;
    locktime72h: string;
    locktime7d: string;
    locktimeDemo20s: string;
    locktimeHelper: string;
    memoLabel: string;
    memoPlaceholder: string;
    feeDisclosureLabel: string;
    mintButtonIdle: string;
    mintButtonLoading: string;
    stageLoadingMint: string;
    stageCreatingQuote: string;
    stageMintingProofs: string;
    stageLockingP2pk: string;
    stageVerifyingDleq: string;
    exportSectionTitle: string;
    copySmsTextButton: string;
    sendToCounterButton: string;
    errMinAmount: string;
    errNoVendor: string;
    errMintFailure: string;
  };
  redeem: {
    pageTitle: string;
    pageSubtitle: string;
    activeVendorBanner: string;
    switchVendorLabel: string;
    tokenInputLabel: string;
    tokenInputPlaceholder: string;
    tokenInputHelper: string;
    loadLastMintedButton: string;
    inspectButton: string;
    clearButton: string;
    railTitle: string;
    step1Title: string;
    step1Idle: string;
    step1Pass: string;
    step1FailMismatch: string;
    step1FailUnlocked: string;
    step2Title: string;
    step2Idle: string;
    step2Pass: string;
    step2Fail: string;
    step3Title: string;
    step3Idle: string;
    step3Ready: string;
    step3Claiming: string;
    step3Pass: string;
    step3Fail: string;
    claimButtonIdle: string;
    claimButtonBusy: string;
    testAttackButton: string;
    testAttackDesc: string;
    receiptSheetTitle: string;
    receiptEventIdLabel: string;
    receiptRelaysLabel: string;
    copyReceiptJsonButton: string;
  };
  ledger: {
    pageTitle: string;
    pageSubtitle: string;
    summaryTotalIssued: string;
    summaryActiveLocked: string;
    summaryRedeemed: string;
    summaryRefunded: string;
    checkAllNut7Button: string;
    exportBackupButton: string;
    importBackupButton: string;
    resetDemoDataButton: string;
    colVoucher: string;
    colVendor: string;
    colAmount: string;
    colLocktime: string;
    colStatus: string;
    colActions: string;
    actionCheckNut7: string;
    actionReclaimSats: string;
    actionReclaiming: string;
    actionCopyToken: string;
    actionOpenCounter: string;
    emptyTitle: string;
    emptyReason: string;
    emptyCta: string;
  };
  vendors: {
    pageTitle: string;
    pageSubtitle: string;
    filterAllCategories: string;
    searchLabel: string;
    searchPlaceholder: string;
    addVendorTitle: string;
    vendorNameLabel: string;
    vendorDistrictLabel: string;
    vendorAddressLabel: string;
    vendorCategoryLabel: string;
    generateVendorButton: string;
    useAtCounterButton: string;
    issueForVendorButton: string;
    verifierPanelTitle: string;
    verifierPanelSubtitle: string;
    verifierInputLabel: string;
    verifierInputPlaceholder: string;
    verifierButton: string;
    verifierLoadSampleButton: string;
    verifierValidBanner: string;
    verifierInvalidBanner: string;
    verifierZeroPiiNotice: string;
  };
  notFound: {
    title: string;
    description: string;
    backHomeCta: string;
  };
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  fr: {
    meta: {
      skipToContent: 'Aller au contenu principal',
      brandTagline: 'Bons affectés Cashu NUT-11 & Nostr pour Dakar',
      protocolFooter: 'Protocole KeurBon v1.0 · Cashu NUT-11 P2PK · NUT-12 DLEQ hors-ligne · Nostr NIP-01 kind 30078',
      securityByDesignTitle: 'Architecture non-custodiale & zéro donnée personnelle',
      securityByDesignNote:
        'Les clés privées restent dans votre navigateur. Le mint vérifie les signatures Schnorr NUT-11 sans connaître l’identité du bénéficiaire, et les reçus Nostr kind 30078 ne publient que l’empreinte SHA-256 du bon.',
    },
    nav: {
      overview: 'Aperçu',
      issue: 'Émettre',
      redeem: 'Encaisser',
      ledger: 'Coffre',
      vendors: 'Commerçants',
      roleSenderParis: 'Paris · Émetteur',
      roleVendorDakar: 'Dakar · Commerçant',
      roleSwitcherLabel: 'Rôle actif de démonstration',
      languageSwitcherLabel: 'Langue de l’interface',
      openMenu: 'Ouvrir le menu de navigation',
      closeMenu: 'Fermer le menu de navigation',
      activeVendorLabel: 'Comptoir actif',
      demoTag: 'Démo',
    },
    categories: {
      health: 'Santé & Pharmacie',
      school: 'Scolarité & Fournitures',
      hardware: 'Quincaillerie & Matériaux',
      groceries: 'Alimentation & Vivres',
      electricity: 'Électricité Senelec (Woyofal)',
    },
    statuses: {
      draft: 'Brouillon non verrouillé',
      locked: 'Verrouillé NUT-11',
      redeemed: 'Encaissé · Reçu Nostr',
      expired: 'Expiré · Remboursable',
      refunded: 'Remboursé à l’émetteur',
    },
    stub: {
      voucherHeaderPrefix: 'BON AFFECTÉ KEURBON',
      faceValueLabel: 'Valeur faciale affectée',
      satsEquivalentLabel: 'Équivalent Bitcoin Cashu',
      beneficiaryVendorLabel: 'Commerçant autorisé (Verrou P2PK)',
      vendorNpubLabel: 'Clé publique Nostr / P2PK du commerçant',
      senderRefundKeyLabel: 'Clé de remboursement automatique (Émetteur)',
      locktimeLabel: 'Échéance du verrou & remboursement',
      tokenHashLabel: 'Empreinte SHA-256 du bon',
      dleqVerifiedBadge: 'Preuve NUT-12 DLEQ vérifiée hors-ligne',
      dleqPendingBadge: 'Signature DLEQ en attente de frappe',
      nut11SealLocked: 'SCELLÉ NUT-11 P2PK',
      nut11SealDraft: 'APERÇU NON VERROUILLÉ',
      nut11SealRedeemed: 'ENCAISSÉ AU COMPTOIR',
      nut11SealExpired: 'VERROU EXPIRÉ · REMBOURSABLE',
      nut11SealRefunded: 'SATS RÉCUPÉRÉS PAR L’ÉMETTEUR',
      copyTokenButton: 'Copier le jeton Cashu',
      copiedTokenToast: 'Jeton Cashu copié dans le presse-papiers.',
      printVoucherButton: 'Imprimer le bon papier',
      testAtCounterButton: 'Tester au comptoir',
      qrAltText: 'Code QR du jeton Cashu NUT-11 P2PK pour scan au comptoir',
      qrDraftPlaceholder: 'Le code QR Cashu NUT-11 sera généré dès le verrouillage du bon.',
      autoRefundActive: 'Remboursement automatique actif après échéance',
      expiredRefundReady: 'Échéance dépassée : l’émetteur peut récupérer les sats',
      serialLabel: 'N° Série',
      mintLabel: 'Mint Cashu',
    },
    overview: {
      heroTitle: 'Des bons d’achat ciblés, verrouillés par cryptographie pour Dakar.',
      heroLead:
        'Convertissez des FCFA en bons Bitcoin Cashu verrouillés sur la clé publique d’un commerçant de quartier à Dakar (NUT-11 P2PK), vérifiables hors-ligne (NUT-12 DLEQ) et remboursables automatiquement s’ils ne sont pas utilisés.',
      ctaIssueVoucher: 'Émettre un bon affecté',
      ctaVendorCounter: 'Ouvrir le comptoir Dakar',
      personaBarTitle: 'Sélecteur de rôle en direct (Bascule 1 clic pour le jury)',
      personaSenderDesc:
        'Mode Émetteur (Diaspora Paris) : frappe de bons NUT-11 verrouillés, suivi NUT-7 dans le coffre et récupération après expiration.',
      personaVendorDesc:
        'Mode Commerçant (Dakar) : inspection hors-ligne NUT-11/NUT-12, encaissement par signature Schnorr et publication de reçu Nostr kind 30078.',
      protocolTableTitle: 'Garanties cryptographiques vérifiées de bout en bout',
      specColumnPrimitive: 'Primitive',
      specColumnGuarantee: 'Garantie opérationnelle',
      specColumnVerification: 'Preuve de vérification',
      specNut11Title: 'Cashu NUT-11 (P2PK + Locktime)',
      specNut11Guarantee:
        'Seul le commerçant désigné peut encaisser les sats avant l’échéance. Tout tiers non autorisé est rejeté par le mint (erreur 20008).',
      specNut11Verify: 'Secret P2PK signé via Schnorr secp256k1 + tag refund émetteur',
      specNut12Title: 'Cashu NUT-12 (Preuve DLEQ)',
      specNut12Guarantee:
        'Le comptoir de Dakar vérifie mathématiquement la signature aveugle du mint sur chaque coupure avant même d’appeler le réseau.',
      specNut12Verify: 'Égalité des logarithmes discrets (e, s, r) sur le trousseau du mint',
      specNut07Title: 'Cashu NUT-07 (État & Remboursement)',
      specNut07Guarantee:
        'Audit en direct de l’état UNSPENT / SPENT et récupération non-custodiale par la clé de l’émetteur dès que le locktime UNIX expire.',
      specNut07Verify: 'Requête /v1/checkstate + swap de remboursement signé',
      specNostrTitle: 'Nostr NIP-01 (Kind 30078 Zéro-PII)',
      specNostrGuarantee:
        'Preuve publique d’exécution signée par le commerçant sans aucun nom, téléphone ou adresse personnelle.',
      specNostrVerify: 'Signature Schnorr BIP-340 sur l’empreinte SHA-256 du bon',
      livePreviewTitle: 'Spécimen de bon affecté actif',
      livePreviewSubtitle:
        'Inspectez la structure d’un bon NUT-11 verrouillé pour un commerçant de Dakar ou testez son encaissement immédiat.',
    },
    issue: {
      pageTitle: 'Émettre un bon affecté pour Dakar',
      pageSubtitle:
        'Définissez le montant en FCFA, choisissez le commerçant bénéficiaire à Dakar et fixez la fenêtre de remboursement automatique avant de verrouiller les preuves Cashu NUT-11.',
      amountXofLabel: 'Montant à affecter (FCFA / XOF)',
      amountXofHelper: 'Conversion instantanée en satoshis selon le cours BTC/XOF de référence.',
      amountSatsLabel: 'Montant verrouillé en satoshis',
      fxRateLabel: 'Cours de référence BTC / FCFA',
      refreshFxButton: 'Actualiser le cours',
      manualFxToggle: 'Saisir un cours manuel',
      categoryLabel: 'Catégorie de dépense affectée',
      vendorSelectLabel: 'Commerçant de quartier autorisé (Dakar)',
      vendorSelectHelper: 'Le bon sera verrouillé exclusivement sur la clé publique secp256k1 de ce commerçant.',
      locktimePresetLabel: 'Délai avant remboursement automatique à l’émetteur',
      locktime24h: '24 heures',
      locktime72h: '72 heures',
      locktime7d: '7 jours',
      locktimeDemo20s: '20 sec (Test remboursement rapide)',
      locktimeHelper:
        'Si le bon n’est pas encaissé avant cette échéance, votre clé d’émetteur peut récupérer les sats dans le Coffre.',
      memoLabel: 'Note opérationnelle locale (non publiée sur Nostr)',
      memoPlaceholder: 'Ex. Ordonnance pédiatrie ou frais de scolarité trimestre 2…',
      feeDisclosureLabel: 'Réserve de frais de swap du mint (NUT-02 fee_ppk)',
      mintButtonIdle: 'Verrouiller le bon NUT-11',
      mintButtonLoading: 'Verrouillage en cours…',
      stageLoadingMint: 'Chargement des clés du mint Cashu…',
      stageCreatingQuote: 'Création de la requête de frappe NUT-04…',
      stageMintingProofs: 'Frappe des coupures aveugles sur le mint…',
      stageLockingP2pk: 'Application du verrou NUT-11 P2PK & clé de remboursement…',
      stageVerifyingDleq: 'Vérification hors-ligne des signatures NUT-12 DLEQ…',
      exportSectionTitle: 'Remise du bon au bénéficiaire ou test comptoir',
      copySmsTextButton: 'Copier le message SMS / WhatsApp',
      sendToCounterButton: 'Tester ce bon au comptoir (/redeem)',
      errMinAmount: 'Le montant minimal est de 200 FCFA (ou au moins 10 sats) pour couvrir une coupure valide.',
      errNoVendor: 'Veuillez sélectionner un commerçant autorisé à Dakar avant de verrouiller le bon.',
      errMintFailure: 'Échec de communication avec le mint Cashu. Vérifiez votre connexion ou réessayez.',
    },
    redeem: {
      pageTitle: 'Comptoir d’encaissement commerçant (Dakar)',
      pageSubtitle:
        'Collez un jeton Cashu reçu par SMS ou scannez le bon papier. Le comptoir vérifie d’abord le verrou NUT-11 et la preuve NUT-12 DLEQ hors-ligne avant de réclamer les sats sur le mint.',
      activeVendorBanner: 'Identité cryptographique active au comptoir',
      switchVendorLabel: 'Changer de commerçant actif',
      tokenInputLabel: 'Jeton Cashu NUT-11 à inspecter (cashuB…)',
      tokenInputPlaceholder: 'Collez ici une chaîne commençant par cashuB…',
      tokenInputHelper:
        'L’inspection des étapes 1 et 2 s’exécute localement sans dépenser le jeton.',
      loadLastMintedButton: 'Charger le dernier bon émis',
      inspectButton: 'Inspecter hors-ligne',
      clearButton: 'Effacer',
      railTitle: 'Rail d’inspection cryptographique en 3 étapes',
      step1Title: '1. Verrou NUT-11 P2PK & Échéance',
      step1Idle: 'En attente d’un jeton Cashu pour analyser la clé publique autorisée et le locktime.',
      step1Pass: 'Verrou P2PK conforme : le jeton correspond à la clé publique de ce commerçant.',
      step1FailMismatch:
        'Rejeté : ce bon est verrouillé pour un autre commerçant. Seul le détenteur de la clé privée cible peut l’encaisser.',
      step1FailUnlocked: 'Ce jeton ne comporte pas de verrou NUT-11 P2PK valide.',
      step2Title: '2. Preuve NUT-12 DLEQ (Signature aveugle du mint)',
      step2Idle: 'En attente du contrôle hors-ligne des équations DLEQ sur chaque coupure.',
      step2Pass: 'Toutes les coupures portent une preuve mathématique NUT-12 DLEQ valide du mint.',
      step2Fail: 'Alerte sécurité : preuve DLEQ absente ou invalide sur au moins une coupure.',
      step3Title: '3. Règlement Schnorr & Reçu Nostr kind 30078',
      step3Idle: 'Prêt après validation des étapes 1 et 2.',
      step3Ready: 'Vérifications hors-ligne réussies. Prêt à signer l’échange sur le mint.',
      step3Claiming: 'Signature Schnorr P2PK, échange des preuves sur le mint et publication Nostr…',
      step3Pass: 'Sats encaissés avec succès et reçu Nostr kind 30078 signé (zéro donnée personnelle).',
      step3Fail: 'Échec du règlement sur le mint.',
      claimButtonIdle: 'Encaisser au comptoir',
      claimButtonBusy: 'Encaissement Schnorr…',
      testAttackButton: 'Simuler une tentative par un tiers non autorisé',
      testAttackDesc:
        'Tente d’encaisser ce bon sur le mint en direct avec une clé privée tierce non autorisée pour prouver le rejet cryptographique NUT-11.',
      receiptSheetTitle: 'Reçu d’exécution Nostr kind 30078 (Zéro-PII)',
      receiptEventIdLabel: 'Identifiant d’événement Nostr (Event ID)',
      receiptRelaysLabel: 'Relais Nostr sollicités',
      copyReceiptJsonButton: 'Copier le JSON signé du reçu',
    },
    ledger: {
      pageTitle: 'Coffre de l’émetteur & récupération sur expiration',
      pageSubtitle:
        'Suivez l’état NUT-07 en direct de tous vos bons émis, vérifiez les reçus d’exécution Nostr et récupérez vos satoshis dès qu’un verrou temporel expire sans avoir été utilisé.',
      summaryTotalIssued: 'Total émis (sats)',
      summaryActiveLocked: 'Verrouillés actifs',
      summaryRedeemed: 'Encaissés à Dakar',
      summaryRefunded: 'Récupérés (Remboursés)',
      checkAllNut7Button: 'Vérifier l’état NUT-07 sur le mint',
      exportBackupButton: 'Exporter la sauvegarde JSON',
      importBackupButton: 'Importer une sauvegarde JSON',
      resetDemoDataButton: 'Réinitialiser la démo',
      colVoucher: 'Bon & Empreinte',
      colVendor: 'Commerçant & Catégorie',
      colAmount: 'Montant (FCFA / sats)',
      colLocktime: 'Échéance NUT-11',
      colStatus: 'État cryptographique',
      colActions: 'Actions opérationnelles',
      actionCheckNut7: 'Vérifier NUT-07',
      actionReclaimSats: 'Récupérer les sats',
      actionReclaiming: 'Récupération…',
      actionCopyToken: 'Copier le jeton',
      actionOpenCounter: 'Ouvrir au comptoir',
      emptyTitle: 'Aucun bon émis dans ce navigateur',
      emptyReason:
        'Votre coffre local est vide. Émettez un premier bon affecté NUT-11 ou importez une sauvegarde JSON existante.',
      emptyCta: 'Émettre un premier bon',
    },
    vendors: {
      pageTitle: 'Répertoire des commerçants de Dakar & vérificateur Nostr',
      pageSubtitle:
        'Consultez les clés publiques certifiées des commerçants de quartier à Dakar, ajoutez un profil local ou vérifiez de manière indépendante la signature Schnorr BIP-340 de tout reçu Nostr kind 30078.',
      filterAllCategories: 'Toutes les catégories',
      searchLabel: 'Filtrer par nom, quartier ou clé npub',
      searchPlaceholder: 'Rechercher Médina, Fass, pharmacie, npub1…',
      addVendorTitle: 'Inscrire un nouveau commerçant local (Génération secp256k1)',
      vendorNameLabel: 'Enseigne du commerçant',
      vendorDistrictLabel: 'Quartier de Dakar',
      vendorAddressLabel: 'Repère ou adresse de rue',
      vendorCategoryLabel: 'Catégorie autorisée',
      generateVendorButton: 'Générer la paire de clés & inscrire',
      useAtCounterButton: 'Simuler ce comptoir',
      issueForVendorButton: 'Émettre un bon',
      verifierPanelTitle: 'Vérificateur indépendant de reçu Nostr (Kind 30078)',
      verifierPanelSubtitle:
        'Collez l’événement JSON complet d’un reçu KeurBon pour contrôler sa signature Schnorr BIP-340, l’empreinte SHA-256 du bon et l’absence totale de données personnelles.',
      verifierInputLabel: 'JSON de l’événement Nostr kind 30078',
      verifierInputPlaceholder: 'Collez un objet JSON {"id":"...","pubkey":"...","kind":30078,"sig":"..."}…',
      verifierButton: 'Vérifier la signature BIP-340',
      verifierLoadSampleButton: 'Charger le dernier reçu signé',
      verifierValidBanner: 'Signature Schnorr BIP-340 authentique · Schéma keurbon.receipt.v1 conforme',
      verifierInvalidBanner: 'Signature invalide ou structure d’événement Nostr altérée',
      verifierZeroPiiNotice:
        'Audit de confidentialité : ce reçu contient uniquement l’empreinte SHA-256 du bon, le montant, la catégorie et la clé publique du commerçant.',
    },
    notFound: {
      title: 'Page introuvable (404)',
      description: 'Cette adresse ne correspond à aucune des 5 routes opérationnelles de KeurBon.',
      backHomeCta: 'Retourner à l’aperçu',
    },
  },
  en: {
    meta: {
      skipToContent: 'Skip to main content',
      brandTagline: 'Purpose-locked Cashu NUT-11 & Nostr vouchers for Dakar',
      protocolFooter: 'KeurBon Protocol v1.0 · Cashu NUT-11 P2PK · Offline NUT-12 DLEQ · Nostr NIP-01 kind 30078',
      securityByDesignTitle: 'Non-custodial architecture & zero personal data',
      securityByDesignNote:
        'Private keys remain in your browser. The Cashu mint enforces NUT-11 Schnorr spend conditions without knowing recipient identities, and Nostr kind 30078 receipts publish only the voucher SHA-256 hash.',
    },
    nav: {
      overview: 'Overview',
      issue: 'Issue',
      redeem: 'Redeem',
      ledger: 'Vault',
      vendors: 'Vendors',
      roleSenderParis: 'Paris · Sender',
      roleVendorDakar: 'Dakar · Vendor',
      roleSwitcherLabel: 'Active demo role',
      languageSwitcherLabel: 'Interface language',
      openMenu: 'Open navigation menu',
      closeMenu: 'Close navigation menu',
      activeVendorLabel: 'Active counter',
      demoTag: 'Demo',
    },
    categories: {
      health: 'Health & Pharmacy',
      school: 'School Tuition & Supplies',
      hardware: 'Hardware & Building Materials',
      groceries: 'Groceries & Staple Foods',
      electricity: 'Senelec Prepaid Electricity (Woyofal)',
    },
    statuses: {
      draft: 'Unlocked draft',
      locked: 'NUT-11 Locked',
      redeemed: 'Redeemed · Nostr Receipt',
      expired: 'Expired · Refundable',
      refunded: 'Refunded to sender',
    },
    stub: {
      voucherHeaderPrefix: 'KEURBON PURPOSE VOUCHER',
      faceValueLabel: 'Purpose-locked face value',
      satsEquivalentLabel: 'Bitcoin Cashu equivalent',
      beneficiaryVendorLabel: 'Authorized merchant (P2PK Lock)',
      vendorNpubLabel: 'Merchant Nostr / P2PK public key',
      senderRefundKeyLabel: 'Automatic refund key (Sender)',
      locktimeLabel: 'Lock expiry & refund window',
      tokenHashLabel: 'Voucher SHA-256 fingerprint',
      dleqVerifiedBadge: 'NUT-12 DLEQ proof verified offline',
      dleqPendingBadge: 'DLEQ signature pending minting',
      nut11SealLocked: 'NUT-11 P2PK SEALED',
      nut11SealDraft: 'UNLOCKED DRAFT PREVIEW',
      nut11SealRedeemed: 'REDEEMED AT COUNTER',
      nut11SealExpired: 'LOCK EXPIRED · REFUNDABLE',
      nut11SealRefunded: 'SATS RECLAIMED BY SENDER',
      copyTokenButton: 'Copy Cashu token',
      copiedTokenToast: 'Cashu token copied to clipboard.',
      printVoucherButton: 'Print paper voucher',
      testAtCounterButton: 'Test at counter',
      qrAltText: 'Cashu NUT-11 P2PK token QR code for counter scanning',
      qrDraftPlaceholder: 'The Cashu NUT-11 QR code will be generated once the voucher is locked.',
      autoRefundActive: 'Automatic sender refund active after expiry',
      expiredRefundReady: 'Locktime elapsed: sender key can reclaim sats',
      serialLabel: 'Serial No.',
      mintLabel: 'Cashu Mint',
    },
    overview: {
      heroTitle: 'Purpose-bound vouchers, cryptographically locked for Dakar.',
      heroLead:
        'Convert FCFA into Bitcoin Cashu vouchers locked to a Dakar neighborhood merchant public key (NUT-11 P2PK), verifiable offline (NUT-12 DLEQ), and automatically refundable to the sender if unused.',
      ctaIssueVoucher: 'Issue a purpose voucher',
      ctaVendorCounter: 'Open Dakar vendor counter',
      personaBarTitle: 'Live Role Switcher (1-click judge persona toggle)',
      personaSenderDesc:
        'Sender Mode (Paris Diaspora): mint NUT-11 locked vouchers, audit live NUT-7 spend state in the Vault, and reclaim expired funds.',
      personaVendorDesc:
        'Vendor Mode (Dakar Counter): run offline NUT-11/NUT-12 inspection, claim sats with vendor Schnorr key, and broadcast kind 30078 receipts.',
      protocolTableTitle: 'End-to-end verified cryptographic guarantees',
      specColumnPrimitive: 'Primitive',
      specColumnGuarantee: 'Operational guarantee',
      specColumnVerification: 'Verification proof',
      specNut11Title: 'Cashu NUT-11 (P2PK + Locktime)',
      specNut11Guarantee:
        'Only the designated merchant key can claim the sats before expiry. Any unauthorized key is rejected by the live mint (error 20008).',
      specNut11Verify: 'secp256k1 Schnorr P2PK secret + sender refund tag',
      specNut12Title: 'Cashu NUT-12 (Offline DLEQ Proof)',
      specNut12Guarantee:
        'The Dakar counter mathematically verifies the mint blind signature on every proof denomination before making any network call.',
      specNut12Verify: 'Discrete Log Equality (e, s, r) against cached mint keyset',
      specNut07Title: 'Cashu NUT-07 (State & Auto-Refund)',
      specNut07Guarantee:
        'Live UNSPENT / SPENT state auditing and non-custodial sender recovery as soon as the UNIX locktime elapses.',
      specNut07Verify: '/v1/checkstate query + signed sender refund swap',
      specNostrTitle: 'Nostr NIP-01 (Kind 30078 Zero-PII)',
      specNostrGuarantee:
        'Public fulfillment proof signed by the merchant containing zero personal names, phone numbers, or street addresses.',
      specNostrVerify: 'BIP-340 Schnorr signature over voucher SHA-256 hash',
      livePreviewTitle: 'Active purpose voucher specimen',
      livePreviewSubtitle:
        'Inspect a live NUT-11 voucher locked to a Dakar merchant or jump straight to counter redemption.',
    },
    issue: {
      pageTitle: 'Issue a purpose-locked voucher for Dakar',
      pageSubtitle:
        'Enter the FCFA amount, select an authorized Dakar merchant, and set the automatic refund locktime before minting real NUT-11 P2PK Cashu proofs.',
      amountXofLabel: 'Purpose amount (FCFA / XOF)',
      amountXofHelper: 'Instant conversion into satoshis using the reference BTC/XOF rate.',
      amountSatsLabel: 'Locked amount in satoshis',
      fxRateLabel: 'Reference BTC / FCFA exchange rate',
      refreshFxButton: 'Refresh rate',
      manualFxToggle: 'Set manual rate',
      categoryLabel: 'Purpose spending category',
      vendorSelectLabel: 'Authorized neighborhood merchant (Dakar)',
      vendorSelectHelper: 'The voucher will be cryptographically locked to this merchant secp256k1 public key.',
      locktimePresetLabel: 'Automatic sender refund window',
      locktime24h: '24 hours',
      locktime72h: '72 hours',
      locktime7d: '7 days',
      locktimeDemo20s: '20 sec (Fast refund demo)',
      locktimeHelper:
        'If the voucher is not claimed before this deadline, your sender key can reclaim the sats in the Vault.',
      memoLabel: 'Local operational note (never published to Nostr)',
      memoPlaceholder: 'E.g. Pediatric prescription or Term 2 school tuition…',
      feeDisclosureLabel: 'Mint swap fee reserve (NUT-02 fee_ppk)',
      mintButtonIdle: 'Lock NUT-11 voucher',
      mintButtonLoading: 'Locking voucher…',
      stageLoadingMint: 'Loading Cashu mint keysets…',
      stageCreatingQuote: 'Creating NUT-04 mint quote…',
      stageMintingProofs: 'Minting blind signatures from mint…',
      stageLockingP2pk: 'Applying NUT-11 P2PK lock & refund key…',
      stageVerifyingDleq: 'Verifying offline NUT-12 DLEQ proofs…',
      exportSectionTitle: 'Deliver voucher or test at counter',
      copySmsTextButton: 'Copy SMS / WhatsApp payload',
      sendToCounterButton: 'Test this voucher at counter (/redeem)',
      errMinAmount: 'Minimum amount is 200 FCFA (or at least 10 sats) to fund a valid proof denomination.',
      errNoVendor: 'Please select an authorized Dakar merchant before locking the voucher.',
      errMintFailure: 'Failed to reach the Cashu mint. Check your network connection and retry.',
    },
    redeem: {
      pageTitle: 'Dakar merchant redemption counter',
      pageSubtitle:
        'Paste a Cashu token received via SMS or scan a paper voucher. The counter runs offline NUT-11 lock and NUT-12 DLEQ checks before claiming sats from the mint.',
      activeVendorBanner: 'Active cryptographic counter identity',
      switchVendorLabel: 'Switch active merchant',
      tokenInputLabel: 'Cashu NUT-11 token to inspect (cashuB…)',
      tokenInputPlaceholder: 'Paste a token string starting with cashuB…',
      tokenInputHelper: 'Steps 1 and 2 execute locally offline without spending the token.',
      loadLastMintedButton: 'Load last minted voucher',
      inspectButton: 'Inspect offline',
      clearButton: 'Clear',
      railTitle: '3-step cryptographic inspection rail',
      step1Title: '1. NUT-11 P2PK Lock & Expiry',
      step1Idle: 'Waiting for a Cashu token to parse the authorized merchant pubkey and locktime.',
      step1Pass: 'P2PK lock verified: token is locked to this merchant public key.',
      step1FailMismatch:
        'Rejected: this voucher is locked to a different merchant. Only the matching private key can claim it.',
      step1FailUnlocked: 'This token does not carry a valid NUT-11 P2PK lock.',
      step2Title: '2. NUT-12 DLEQ Proof (Mint blind signature)',
      step2Idle: 'Waiting for offline DLEQ discrete log verification across all proof denominations.',
      step2Pass: 'Every proof denomination carries a mathematically valid offline NUT-12 DLEQ mint signature.',
      step2Fail: 'Security alert: missing or invalid DLEQ signature on at least one proof.',
      step3Title: '3. Schnorr Settlement & Nostr Kind 30078 Receipt',
      step3Idle: 'Ready once offline checks 1 and 2 pass.',
      step3Ready: 'Offline inspection passed. Ready to sign P2PK swap with the mint.',
      step3Claiming: 'Signing P2PK Schnorr witness, swapping proofs at mint, and broadcasting Nostr receipt…',
      step3Pass: 'Sats claimed and zero-PII Nostr kind 30078 receipt signed.',
      step3Fail: 'Mint settlement failed.',
      claimButtonIdle: 'Claim at counter',
      claimButtonBusy: 'Claiming via Schnorr…',
      testAttackButton: 'Simulate unauthorized 3rd-party claim attempt',
      testAttackDesc:
        'Attempts to claim this voucher against the live mint using an unauthorized third-party private key to prove NUT-11 cryptographic rejection.',
      receiptSheetTitle: 'Nostr Kind 30078 Fulfillment Receipt (Zero-PII)',
      receiptEventIdLabel: 'Nostr Event ID',
      receiptRelaysLabel: 'Target Nostr relays',
      copyReceiptJsonButton: 'Copy signed receipt JSON',
    },
    ledger: {
      pageTitle: 'Sender vault & post-expiry refund recovery',
      pageSubtitle:
        'Track live NUT-07 spend states across all issued vouchers, inspect Nostr fulfillment receipts, and reclaim your satoshis once an unused locktime expires.',
      summaryTotalIssued: 'Total issued (sats)',
      summaryActiveLocked: 'Active locked',
      summaryRedeemed: 'Redeemed in Dakar',
      summaryRefunded: 'Reclaimed (Refunded)',
      checkAllNut7Button: 'Refresh NUT-07 state from mint',
      exportBackupButton: 'Export JSON backup',
      importBackupButton: 'Import JSON backup',
      resetDemoDataButton: 'Reset demo data',
      colVoucher: 'Voucher & Hash',
      colVendor: 'Merchant & Category',
      colAmount: 'Amount (FCFA / sats)',
      colLocktime: 'NUT-11 Expiry',
      colStatus: 'Cryptographic status',
      colActions: 'Operational actions',
      actionCheckNut7: 'Check NUT-07',
      actionReclaimSats: 'Reclaim sats',
      actionReclaiming: 'Reclaiming…',
      actionCopyToken: 'Copy token',
      actionOpenCounter: 'Open at counter',
      emptyTitle: 'No vouchers issued in this browser',
      emptyReason:
        'Your local vault is empty. Issue your first NUT-11 purpose-locked voucher or import an existing JSON backup.',
      emptyCta: 'Issue first voucher',
    },
    vendors: {
      pageTitle: 'Dakar merchant registry & independent Nostr verifier',
      pageSubtitle:
        'Browse verified Dakar neighborhood merchant public keys, register a local vendor keypair, or independently verify the BIP-340 Schnorr signature of any Nostr kind 30078 receipt.',
      filterAllCategories: 'All categories',
      searchLabel: 'Filter by name, Dakar district, or npub key',
      searchPlaceholder: 'Search Médina, Fass, pharmacy, npub1…',
      addVendorTitle: 'Register a new local merchant (secp256k1 generation)',
      vendorNameLabel: 'Merchant business name',
      vendorDistrictLabel: 'Dakar district',
      vendorAddressLabel: 'Landmark or street address',
      vendorCategoryLabel: 'Authorized category',
      generateVendorButton: 'Generate keypair & register',
      useAtCounterButton: 'Simulate this counter',
      issueForVendorButton: 'Issue voucher',
      verifierPanelTitle: 'Independent Nostr Receipt Verifier (Kind 30078)',
      verifierPanelSubtitle:
        'Paste any signed KeurBon receipt JSON event to verify its BIP-340 Schnorr signature, voucher SHA-256 d-tag, and zero-PII compliance.',
      verifierInputLabel: 'Nostr kind 30078 event JSON',
      verifierInputPlaceholder: 'Paste a JSON object {"id":"...","pubkey":"...","kind":30078,"sig":"..."}…',
      verifierButton: 'Verify BIP-340 signature',
      verifierLoadSampleButton: 'Load latest signed receipt',
      verifierValidBanner: 'Authentic BIP-340 Schnorr signature · keurbon.receipt.v1 schema verified',
      verifierInvalidBanner: 'Invalid Schnorr signature or tampered Nostr event payload',
      verifierZeroPiiNotice:
        'Privacy audit: this receipt contains only the voucher SHA-256 hash, amount, category, and merchant public key.',
    },
    notFound: {
      title: 'Page not found (404)',
      description: 'This URL does not match any of KeurBon’s 5 operational routes.',
      backHomeCta: 'Return to overview',
    },
  },
};
