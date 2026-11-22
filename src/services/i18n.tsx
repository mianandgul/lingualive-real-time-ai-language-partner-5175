import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppLangCode =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'ar'
  | 'hi'
  | 'ur'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'tr'
  | 'ru'
  | 'bn';

export interface AppLanguageMeta {
  code: AppLangCode;
  name: string; // English identifier passed to AI backend for nativeLanguage
  nativeName: string;
  flag: string;
  locale: string;
  rtl?: boolean;
}

export const APP_LANGUAGES: AppLanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', locale: 'en-US' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', locale: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', locale: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', locale: 'de-DE' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', locale: 'it-IT' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', locale: 'pt-PT' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', locale: 'ar-SA', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', locale: 'hi-IN' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', locale: 'ur-PK', rtl: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', locale: 'zh-CN' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', locale: 'ja-JP' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', locale: 'ko-KR' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', locale: 'tr-TR' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', locale: 'ru-RU' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', locale: 'bn-BD' },
];

const APP_LANG_STORAGE_KEY = 'lingualive_app_lang';

const TIMEZONE_TO_INFO: Record<string, { lang: AppLangCode; currency: string; country: string }> = {
  'Asia/Karachi': { lang: 'ur', currency: 'PKR', country: 'PK' },
  'Asia/Kolkata': { lang: 'hi', currency: 'INR', country: 'IN' },
  'Asia/Calcutta': { lang: 'hi', currency: 'INR', country: 'IN' },
  'Asia/Dhaka': { lang: 'bn', currency: 'BDT', country: 'BD' },
  'Asia/Riyadh': { lang: 'ar', currency: 'SAR', country: 'SA' },
  'Asia/Dubai': { lang: 'ar', currency: 'AED', country: 'AE' },
  'Africa/Cairo': { lang: 'ar', currency: 'USD', country: 'EG' },
  'Europe/Madrid': { lang: 'es', currency: 'EUR', country: 'ES' },
  'America/Mexico_City': { lang: 'es', currency: 'USD', country: 'MX' },
  'Europe/Paris': { lang: 'fr', currency: 'EUR', country: 'FR' },
  'Europe/Berlin': { lang: 'de', currency: 'EUR', country: 'DE' },
  'Europe/Rome': { lang: 'it', currency: 'EUR', country: 'IT' },
  'Europe/Lisbon': { lang: 'pt', currency: 'EUR', country: 'PT' },
  'America/Sao_Paulo': { lang: 'pt', currency: 'BRL', country: 'BR' },
  'Asia/Tokyo': { lang: 'ja', currency: 'JPY', country: 'JP' },
  'Asia/Seoul': { lang: 'ko', currency: 'KRW', country: 'KR' },
  'Asia/Shanghai': { lang: 'zh', currency: 'CNY', country: 'CN' },
  'Europe/Istanbul': { lang: 'tr', currency: 'TRY', country: 'TR' },
  'Europe/Moscow': { lang: 'ru', currency: 'RUB', country: 'RU' },
  'Europe/London': { lang: 'en', currency: 'GBP', country: 'GB' },
};

const CURRENCY_MULTIPLIER_FROM_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  PKR: 278,
  INR: 84,
  BDT: 119,
  SAR: 3.75,
  AED: 3.67,
  JPY: 152,
  KRW: 1380,
  CNY: 7.2,
  BRL: 5.7,
  TRY: 34,
  RUB: 95,
};

const ZERO_DECIMAL_CURRENCIES = new Set(['PKR', 'INR', 'BDT', 'JPY', 'KRW', 'RUB']);

const EN_DICT = {
  navRoles: 'Roleplays',
  navRolesShort: 'Roles',
  navVoice: 'Live Voice',
  navVoiceShort: 'Voice',
  navChat: 'Chat',
  navVocab: 'Vocabulary',
  navVocabShort: 'Vocab',
  navProgress: 'Progress',
  allLanguages: 'All Languages',
  appLanguageLabel: 'App Language',
  installAndroid: 'Install App',
  upgradeBtn: 'Upgrade',
  freePlanPill: 'Free · {remaining}/{limit} calls',
  shareBtn: 'Share & +100 XP',
  legalPrivacyBtn: 'Privacy & Settings',
  heroBadge: 'Real-Time Interactive Voice Practice · 15 Languages',
  heroTitleA: 'Conversational Fluency,',
  heroTitleB: 'One Natural Voice Dialogue at a Time.',
  heroSubtitle:
    'Practice realistic conversations with an encouraging AI native speaker. Interrupt anytime, get instant phonetic tips, explore word breakdowns, and achieve scenario missions.',
  createCustomScenario: 'Create Custom Scenario',
  dailyMissionsCount: 'Daily Missions ({done}/5)',
  searchPlaceholder: 'Search scenarios or roles...',
  filterAll: 'All',
  filterCustom: 'Custom',
  levelBeginner: 'Beginner',
  levelIntermediate: 'Intermediate',
  levelAdvanced: 'Advanced',
  startCall: 'Start Call',
  realtimeVoice: 'Real-Time Voice',
  aiPartnerLabel: 'AI Partner:',
  yourRoleLabel: 'Your Role:',
  missionsLabel: '{count} interactive practice missions',
  voiceConnected: 'Live Voice Connected',
  voiceConnecting: 'Connecting...',
  voiceDisconnectedReconnect: 'Disconnected · Reconnect',
  endAndReport: 'End & Report',
  enableMic: 'Enable Microphone',
  muteMic: 'Mute Microphone',
  unmuteMic: 'Unmute Microphone',
  replayGreeting: 'Replay Greeting',
  voicePrivacyNotice: 'We do not store your voice without permission',
  useTextChat: 'Use Text Chat',
  chatPractice: 'Chat Practice',
  retryBtn: 'Retry',
  resetPermission: 'Reset Permission',
  openDirectTab: 'Open Direct Tab',
  speakOrTapMic: 'Speak naturally in {lang} — or tap mic to start',
  typePlaceholder: 'Or type in {lang}...',
  liveTranscriptHeader: 'Live Dialogue Transcript',
  tapToInspect: 'Tap any phrase to inspect, listen, or view corrections',
  translationsBtn: 'Translations',
  phoneticsBtn: 'Phonetics',
  listenBtn: 'Listen',
  inspectBtn: 'Inspect',
  saveBtn: 'Save',
  savedBtn: 'Saved',
  suggestionBtn: 'Suggestion',
  finishAndReport: 'Finish & Report',
  switchToLiveVoice: 'Switch to Live Voice Call',
  suggestionsLabel: 'Suggestions:',
  myVocabulary: 'My Vocabulary',
  savedPhrases: 'Saved Phrases',
  flashcardsTab: 'Flashcards',
  revisionQuizTab: 'Revision Quiz',
  addWordPhrase: 'Add Word / Phrase',
  revisionExercise: 'Revision Exercise',
  markLearned: 'Mark Learned',
  learnedStatus: 'Learned',
  practiceAgain: 'Practice Again',
  upgradeBannerTitle: 'Upgrade to Premium for Unlimited Calls',
  freePlanTitle: 'Free Plan · 3 Free Voice Calls Per Day',
  freeCallsStatus: '{remaining} of {limit} free daily voice calls remaining today',
  limitReachedTitle: 'Daily Free Voice Limit Reached (3/3 Used)',
  limitReachedBody:
    'Your 3 free daily voice calls reset tomorrow. Text Chat practice remains free & unlimited today, or preview our upcoming Premium unlimited plan.',
  premiumLockedBadge: 'Premium Preview (Locked — Payment Coming Soon)',
  continueFreeChat: 'Continue Free Text Chat',
  closeBtn: 'Close',
  cancelBtn: 'Cancel',
  shareTitle: 'Share LinguaLive with Friend',
  inviteRewardTitle: 'Invite Friend, Get 100 XP',
  inviteRewardDesc:
    'Share your personal link on WhatsApp, Instagram, or X to earn +100 bonus XP and help friends master 15 languages.',
  copyLink: 'Copy Link',
  linkCopied: 'Link Copied!',
  claimInviteXp: '+100 XP Credited!',
  downloadAppTitle: 'Download Our App Worldwide',
  downloadAppSubtitle:
    'Practice speaking 15 languages on iPhone, Android, and Desktop — optimized for fast 4G & low-latency global voice.',
  appStoreBtn: 'App Store (iOS PWA)',
  playStoreBtn: 'Google Play / Android APK',
  privacyPolicyTitle: 'Privacy Policy',
  termsTitle: 'Terms of Service',
  contactTitle: 'Contact Us',
  settingsPrivacyTitle: 'Settings & GDPR Privacy',
  deleteMyDataBtn: 'Delete My Data',
  confirmDeleteDataBtn: 'Confirm Permanent Deletion',
  dataDeletedBanner: 'All local progress, vocabulary, and preferences were deleted.',
};

export type TranslationKey = keyof typeof EN_DICT;

type PartialDict = Partial<Record<TranslationKey, string>>;

const TRANSLATIONS: Record<AppLangCode, PartialDict> = {
  en: EN_DICT,
  es: {
    navRoles: 'Escenarios',
    navRolesShort: 'Roles',
    navVoice: 'Voz en Vivo',
    navVoiceShort: 'Voz',
    navChat: 'Chat',
    navVocab: 'Vocabulario',
    navVocabShort: 'Vocab',
    navProgress: 'Progreso',
    allLanguages: 'Todos los idiomas',
    appLanguageLabel: 'Idioma de la app',
    installAndroid: 'Instalar App',
    upgradeBtn: 'Mejorar',
    freePlanPill: 'Gratis · {remaining}/{limit} llamadas',
    shareBtn: 'Compartir y +100 XP',
    legalPrivacyBtn: 'Privacidad y Ajustes',
    heroBadge: 'Práctica de voz con IA en tiempo real · 15 idiomas',
    heroTitleA: 'Fluidez Conversacional,',
    heroTitleB: 'Un Diálogo de Voz Natural a la Vez.',
    heroSubtitle:
      'Practica conversaciones reales con un hablante nativo de IA. Obtén correcciones al instante, fonética, análisis por palabra y misiones interactivas.',
    createCustomScenario: 'Crear Escenario Personalizado',
    dailyMissionsCount: 'Misiones Diarias ({done}/5)',
    searchPlaceholder: 'Buscar escenarios o roles...',
    filterAll: 'Todos',
    filterCustom: 'Propios',
    levelBeginner: 'Principiante',
    levelIntermediate: 'Intermedio',
    levelAdvanced: 'Avanzado',
    startCall: 'Iniciar Llamada',
    realtimeVoice: 'Voz en Tiempo Real',
    aiPartnerLabel: 'Compañero IA:',
    yourRoleLabel: 'Tu Rol:',
    missionsLabel: '{count} misiones interactivas',
    voiceConnected: 'Voz Conectada',
    voiceConnecting: 'Conectando...',
    voiceDisconnectedReconnect: 'Desconectado · Reconectar',
    endAndReport: 'Terminar e Informe',
    enableMic: 'Activar Micrófono',
    replayGreeting: 'Repetir Saludo',
    voicePrivacyNotice: 'No guardamos tu voz sin tu permiso',
    useTextChat: 'Usar Chat de Texto',
    chatPractice: 'Práctica en Chat',
    retryBtn: 'Reintentar',
    resetPermission: 'Restablecer Permiso',
    openDirectTab: 'Abrir en Pestaña',
    translationsBtn: 'Traducciones',
    phoneticsBtn: 'Fonética',
    listenBtn: 'Escuchar',
    inspectBtn: 'Analizar',
    saveBtn: 'Guardar',
    savedBtn: 'Guardado',
    suggestionBtn: 'Sugerencia',
    finishAndReport: 'Finalizar e Informe',
    switchToLiveVoice: 'Cambiar a Llamada de Voz',
    myVocabulary: 'Mi Vocabulario',
    savedPhrases: 'Frases Guardadas',
    flashcardsTab: 'Tarjetas',
    revisionQuizTab: 'Cuestionario',
    addWordPhrase: 'Añadir Palabra',
    revisionExercise: 'Repaso',
    markLearned: 'Marcar Aprendida',
    learnedStatus: 'Aprendida',
    practiceAgain: 'Practicar Otra Vez',
    upgradeBannerTitle: 'Mejora a Premium para Llamadas Ilimitadas',
    freePlanTitle: 'Plan Gratis · 3 Llamadas de Voz al Día',
    freeCallsStatus: 'Te quedan {remaining} de {limit} llamadas gratuitas hoy',
    continueFreeChat: 'Seguir en Chat Gratis',
    closeBtn: 'Cerrar',
    cancelBtn: 'Cancelar',
    shareTitle: 'Compartir LinguaLive con un Amigo',
    inviteRewardTitle: 'Invita a un Amigo, Gana 100 XP',
    copyLink: 'Copiar Enlace',
    linkCopied: '¡Enlace Copiado!',
    downloadAppTitle: 'Descarga Nuestra App',
    privacyPolicyTitle: 'Política de Privacidad',
    termsTitle: 'Términos de Servicio',
    contactTitle: 'Contacto',
    settingsPrivacyTitle: 'Ajustes y Privacidad RGPD',
    deleteMyDataBtn: 'Eliminar Mis Datos',
    confirmDeleteDataBtn: 'Confirmar Eliminación Permanente',
  },
  fr: {
    navRoles: 'Scénarios',
    navRolesShort: 'Rôles',
    navVoice: 'Voix Live',
    navVoiceShort: 'Voix',
    navChat: 'Chat',
    navVocab: 'Vocabulaire',
    navVocabShort: 'Vocab',
    navProgress: 'Progrès',
    allLanguages: 'Toutes les langues',
    appLanguageLabel: "Langue de l'app",
    installAndroid: 'Installer',
    upgradeBtn: 'Passer Pro',
    freePlanPill: 'Gratuit · {remaining}/{limit} appels',
    shareBtn: 'Partager & +100 XP',
    legalPrivacyBtn: 'Confidentialité',
    heroBadge: 'Pratique vocale IA en temps réel · 15 langues',
    heroTitleA: 'Aisance Orale,',
    heroTitleB: 'Un Dialogue Naturel à la Fois.',
    createCustomScenario: 'Créer un Scénario',
    dailyMissionsCount: 'Missions ({done}/5)',
    searchPlaceholder: 'Rechercher des scénarios...',
    filterAll: 'Tous',
    filterCustom: 'Perso',
    levelBeginner: 'Débutant',
    levelIntermediate: 'Intermédiaire',
    levelAdvanced: 'Avancé',
    startCall: "Lancer l'appel",
    voiceConnected: 'Voix Connectée',
    voiceConnecting: 'Connexion...',
    voiceDisconnectedReconnect: 'Déconnecté · Reconnecter',
    endAndReport: 'Terminer & Bilan',
    enableMic: 'Activer le Micro',
    replayGreeting: 'Réécouter',
    voicePrivacyNotice: 'Nous ne conservons pas votre voix sans permission',
    useTextChat: 'Utiliser le Chat',
    chatPractice: 'Pratique Écrite',
    retryBtn: 'Réessayer',
    resetPermission: 'Réinitialiser',
    translationsBtn: 'Traductions',
    phoneticsBtn: 'Phonétique',
    listenBtn: 'Écouter',
    inspectBtn: 'Analyser',
    saveBtn: 'Enregistrer',
    savedBtn: 'Enregistré',
    finishAndReport: 'Terminer & Bilan',
    switchToLiveVoice: 'Passer en Appel Vocal',
    myVocabulary: 'Mon Vocabulaire',
    markLearned: 'Marquer Appris',
    learnedStatus: 'Appris',
    upgradeBannerTitle: 'Passez à Premium pour Appels Illimités',
    freePlanTitle: 'Offre Gratuite · 3 Appels Vocaux / Jour',
    shareTitle: 'Partager LinguaLive avec un Ami',
    inviteRewardTitle: 'Invitez un Ami, Gagnez 100 XP',
    copyLink: 'Copier le Lien',
    downloadAppTitle: 'Télécharger Notre Application',
    privacyPolicyTitle: 'Politique de Confidentialité',
    termsTitle: "Conditions d'Utilisation",
    contactTitle: 'Contact',
    deleteMyDataBtn: 'Supprimer Mes Données',
    closeBtn: 'Fermer',
    cancelBtn: 'Annuler',
  },
  de: {
    navRoles: 'Szenarien',
    navRolesShort: 'Rollen',
    navVoice: 'Live-Stimme',
    navVoiceShort: 'Stimme',
    navChat: 'Chat',
    navVocab: 'Vokabeln',
    navVocabShort: 'Vokab',
    navProgress: 'Fortschritt',
    allLanguages: 'Alle Sprachen',
    appLanguageLabel: 'App-Sprache',
    installAndroid: 'App laden',
    upgradeBtn: 'Upgrade',
    freePlanPill: 'Gratis · {remaining}/{limit}',
    shareBtn: 'Teilen +100 XP',
    createCustomScenario: 'Eigenes Szenario',
    startCall: 'Anruf starten',
    endAndReport: 'Beenden & Bericht',
    voicePrivacyNotice: 'Wir speichern Ihre Stimme nicht ohne Erlaubnis',
    upgradeBannerTitle: 'Auf Premium für unbegrenzte Anrufe upgraden',
    shareTitle: 'LinguaLive mit Freunden teilen',
    inviteRewardTitle: 'Freund einladen, 100 XP erhalten',
    downloadAppTitle: 'Unsere App herunterladen',
    privacyPolicyTitle: 'Datenschutz',
    termsTitle: 'Nutzungsbedingungen',
    contactTitle: 'Kontakt',
    deleteMyDataBtn: 'Meine Daten löschen',
    closeBtn: 'Schließen',
    cancelBtn: 'Abbrechen',
  },
  it: {
    navRoles: 'Scenari',
    navVoice: 'Voce Live',
    navVocab: 'Vocabolario',
    navProgress: 'Progressi',
    allLanguages: 'Tutte le lingue',
    startCall: 'Avvia Chiamata',
    endAndReport: 'Termina e Report',
    voicePrivacyNotice: 'Non salviamo la tua voce senza permesso',
    upgradeBannerTitle: 'Passa a Premium per Chiamate Illimitate',
    shareTitle: 'Condividi LinguaLive con un Amico',
    inviteRewardTitle: 'Invita un Amico, Ottieni 100 XP',
    downloadAppTitle: 'Scarica la Nostra App',
    privacyPolicyTitle: 'Privacy Policy',
    termsTitle: 'Termini di Servizio',
    contactTitle: 'Contatti',
    deleteMyDataBtn: 'Elimina i Miei Dati',
    closeBtn: 'Chiudi',
    cancelBtn: 'Annulla',
  },
  pt: {
    navRoles: 'Cenários',
    navVoice: 'Voz ao Vivo',
    navVocab: 'Vocabulário',
    navProgress: 'Progresso',
    allLanguages: 'Todos os idiomas',
    startCall: 'Iniciar Chamada',
    endAndReport: 'Terminar e Relatório',
    voicePrivacyNotice: 'Não guardamos a sua voz sem permissão',
    upgradeBannerTitle: 'Atualize para Premium para Chamadas Ilimitadas',
    shareTitle: 'Partilhar LinguaLive com Amigo',
    inviteRewardTitle: 'Convide um Amigo, Ganhe 100 XP',
    downloadAppTitle: 'Descarregar a Nossa App',
    privacyPolicyTitle: 'Política de Privacidade',
    termsTitle: 'Termos de Serviço',
    contactTitle: 'Contacto',
    deleteMyDataBtn: 'Eliminar Os Meus Dados',
    closeBtn: 'Fechar',
    cancelBtn: 'Cancelar',
  },
  ar: {
    navRoles: 'السيناريوهات',
    navRolesShort: 'أدوار',
    navVoice: 'مكالمة صوتية',
    navVoiceShort: 'صوت',
    navChat: 'محادثة',
    navVocab: 'المفردات',
    navVocabShort: 'مفردات',
    navProgress: 'التقدم',
    allLanguages: 'جميع اللغات',
    appLanguageLabel: 'لغة التطبيق',
    installAndroid: 'تثبيت التطبيق',
    upgradeBtn: 'ترقية',
    freePlanPill: 'مجاني · {remaining}/{limit}',
    shareBtn: 'مشاركة +100 XP',
    legalPrivacyBtn: 'الخصوصية والإعدادات',
    heroBadge: 'تدريب صوتي فوري بالذكاء الاصطناعي · ١٥ لغة',
    heroTitleA: 'طلاقة المحادثة،',
    heroTitleB: 'حوار صوتي طبيعي خطوة بخطوة.',
    heroSubtitle:
      'تدرّب على محادثات واقعية مع متحدث أصلي بالذكاء الاصطناعي، مع تصحيح الأخطاء والنطق الفوري باللغة العربية.',
    createCustomScenario: 'إنشاء سيناريو مخصص',
    dailyMissionsCount: 'المهام اليومية ({done}/5)',
    searchPlaceholder: 'ابحث عن سيناريو أو دور...',
    filterAll: 'الكل',
    filterCustom: 'مخصص',
    levelBeginner: 'مبتدئ',
    levelIntermediate: 'متوسط',
    levelAdvanced: 'متقدم',
    startCall: 'بدء المكالمة',
    realtimeVoice: 'صوت فوري',
    aiPartnerLabel: 'شريك الذكاء الاصطناعي:',
    yourRoleLabel: 'دورك:',
    voiceConnected: 'المكالمة الصوتية متصلة',
    voiceConnecting: 'جاري الاتصال...',
    voiceDisconnectedReconnect: 'غير متصل · إعادة الاتصال',
    endAndReport: 'إنهاء والتقرير',
    enableMic: 'تفعيل الميكروفون',
    replayGreeting: 'إعادة التحية',
    voicePrivacyNotice: 'نحن لا نقوم بتخزين صوتك دون إذنك',
    useTextChat: 'استخدم الدردشة النصية',
    chatPractice: 'تدريب كتابي',
    retryBtn: 'إعادة المحاولة',
    resetPermission: 'إعادة ضبط الإذن',
    translationsBtn: 'الترجمة',
    phoneticsBtn: 'النطق',
    listenBtn: 'استماع',
    inspectBtn: 'تحليل',
    saveBtn: 'حفظ',
    savedBtn: 'تم الحفظ',
    finishAndReport: 'إنهاء وعرض التقرير',
    switchToLiveVoice: 'الانتقال للمكالمة الصوتية',
    myVocabulary: 'مفرداتي',
    savedPhrases: 'العبارات المحفوظة',
    flashcardsTab: 'بطاقات المراجعة',
    revisionQuizTab: 'اختبار سريع',
    addWordPhrase: 'إضافة كلمة أو عبارة',
    markLearned: 'تحديد كمُتقَن',
    learnedStatus: 'مُتقَن',
    practiceAgain: 'تدرب مجدداً',
    upgradeBannerTitle: 'قم بالترقية إلى بريميوم لمكالمات غير محدودة',
    freePlanTitle: 'الخطة المجانية · 3 مكالمات صوتية يومياً',
    continueFreeChat: 'متابعة المحادثة النصية مجاناً',
    shareTitle: 'شارك LinguaLive مع صديق',
    inviteRewardTitle: 'ادعُ صديقاً واحصل على 100 XP',
    copyLink: 'نسخ الرابط',
    linkCopied: 'تم نسخ الرابط!',
    downloadAppTitle: 'حمّل تطبيقنا الآن',
    privacyPolicyTitle: 'سياسة الخصوصية',
    termsTitle: 'شروط الخدمة',
    contactTitle: 'اتصل بنا',
    settingsPrivacyTitle: 'الإعدادات والخصوصية (GDPR)',
    deleteMyDataBtn: 'حذف بياناتي',
    confirmDeleteDataBtn: 'تأكيد الحذف النهائي',
    closeBtn: 'إغلاق',
    cancelBtn: 'إلغاء',
  },
  hi: {
    navRoles: 'परिदृश्य',
    navRolesShort: 'रोल',
    navVoice: 'लाइव आवाज़',
    navVoiceShort: 'वॉइस',
    navChat: 'चैट',
    navVocab: 'शब्दावली',
    navVocabShort: 'शब्द',
    navProgress: 'प्रगति',
    allLanguages: 'सभी भाषाएँ',
    appLanguageLabel: 'ऐप भाषा',
    installAndroid: 'ऐप इंस्टॉल',
    upgradeBtn: 'अपग्रेड',
    freePlanPill: 'फ्री · {remaining}/{limit} कॉल',
    shareBtn: 'शेयर +100 XP',
    createCustomScenario: 'कस्टम सीन बनाएँ',
    dailyMissionsCount: 'दैनिक मिशन ({done}/5)',
    startCall: 'कॉल शुरू करें',
    endAndReport: 'समाप्त और रिपोर्ट',
    voiceConnected: 'लाइव वॉइस कनेक्टेड',
    voiceConnecting: 'कनेक्ट हो रहा है...',
    voicePrivacyNotice: 'हम आपकी अनुमति के बिना आपकी आवाज़ सुरक्षित नहीं रखते',
    upgradeBannerTitle: 'अनलिमिटेड कॉल्स के लिए प्रीमियम अपग्रेड करें',
    freePlanTitle: 'मुफ़्त प्लान · प्रतिदिन 3 फ्री वॉइस कॉल',
    shareTitle: 'दोस्त के साथ LinguaLive शेयर करें',
    inviteRewardTitle: 'दोस्त को आमंत्रित करें, 100 XP पाएँ',
    downloadAppTitle: 'हमारा ऐप डाउनलोड करें',
    privacyPolicyTitle: 'गोपनीयता नीति',
    termsTitle: 'सेवा की शर्तें',
    contactTitle: 'संपर्क करें',
    deleteMyDataBtn: 'मेरा डेटा हटाएँ',
    closeBtn: 'बंद करें',
    cancelBtn: 'रद्द करें',
  },
  ur: {
    navRoles: 'مکالمے',
    navRolesShort: 'مکالمے',
    navVoice: 'لائیو آواز',
    navVoiceShort: 'آواز',
    navChat: 'چیٹ',
    navVocab: 'الفاظ',
    navVocabShort: 'الفاظ',
    navProgress: 'کارکردگی',
    allLanguages: 'تمام زبانیں',
    appLanguageLabel: 'ایپ کی زبان',
    installAndroid: 'ایپ انسٹال کریں',
    upgradeBtn: 'اپ گریڈ',
    freePlanPill: 'مفت · {remaining}/{limit} کالز',
    shareBtn: 'شیئر اور +100 XP',
    legalPrivacyBtn: 'پرائیویسی اور سیٹنگز',
    heroBadge: 'ریئل ٹائم AI وائس پریکٹس · 15 زبانیں',
    heroTitleA: 'روان بول چال،',
    heroTitleB: 'ہر قدرتی صوتی مکالمے کے ساتھ۔',
    heroSubtitle:
      'حقیقی زندگی کے حالات میں AI مقامی اسپیکر کے ساتھ بولنے کی مشق کریں۔ فوری تلفظ، ترجمہ اور غلطیوں کی درستگی پائیں۔',
    createCustomScenario: 'اپنا سیناریو بنائیں',
    dailyMissionsCount: 'روزانہ مشنز ({done}/5)',
    searchPlaceholder: 'سیناریو یا کردار تلاش کریں...',
    filterAll: 'سب',
    filterCustom: 'ذاتی',
    levelBeginner: 'ابتدائی',
    levelIntermediate: 'درمیانی',
    levelAdvanced: 'ماہر',
    startCall: 'کال شروع کریں',
    realtimeVoice: 'لائیو آواز',
    aiPartnerLabel: 'AI ساتھی:',
    yourRoleLabel: 'آپ کا کردار:',
    voiceConnected: 'لائیو آواز منسلک ہے',
    voiceConnecting: 'رابطہ ہو رہا ہے...',
    voiceDisconnectedReconnect: 'منقطع · دوبارہ جوڑیں',
    endAndReport: 'ختم کریں اور رپورٹ',
    enableMic: 'مائیک آن کریں',
    replayGreeting: 'سلام دوبارہ سنیں',
    voicePrivacyNotice: 'ہم آپ کی اجازت کے بغیر آپ کی آواز محفوظ نہیں کرتے',
    useTextChat: 'ٹیکسٹ چیٹ استعمال کریں',
    chatPractice: 'تحریری مشق',
    retryBtn: 'دوبارہ کوشش',
    resetPermission: 'اجازت ری سیٹ کریں',
    openDirectTab: 'نئے ٹیب میں کھولیں',
    translationsBtn: 'ترجمہ',
    phoneticsBtn: 'تلفظ',
    listenBtn: 'سنیں',
    inspectBtn: 'تفصیل',
    saveBtn: 'محفوظ کریں',
    savedBtn: 'محفوظ شدہ',
    suggestionBtn: 'تجویز',
    finishAndReport: 'مکمل اور رپورٹ',
    switchToLiveVoice: 'لائیو وائس کال پر جائیں',
    myVocabulary: 'میرے الفاظ',
    savedPhrases: 'محفوظ جملے',
    flashcardsTab: 'فلیش کارڈز',
    revisionQuizTab: 'دہرائی کوئز',
    addWordPhrase: 'لفظ / جملہ شامل کریں',
    markLearned: 'سیکھ لیا',
    learnedStatus: 'سیکھا ہوا',
    practiceAgain: 'دوبارہ مشق کریں',
    upgradeBannerTitle: 'لامحدود کالز کے لیے پریمیم میں اپ گریڈ کریں',
    freePlanTitle: 'مفت پلان · روزانہ 3 مفت وائس کالز',
    freeCallsStatus: 'آج {limit} میں سے {remaining} مفت وائس کالز باقی ہیں',
    continueFreeChat: 'مفت ٹیکسٹ چیٹ جاری رکھیں',
    shareTitle: 'دوست کے ساتھ LinguaLive شیئر کریں',
    inviteRewardTitle: 'دوست کو دعوت دیں، 100 XP پائیں',
    copyLink: 'لنک کاپی کریں',
    linkCopied: 'لنک کاپی ہو گیا!',
    downloadAppTitle: 'ہماری ایپ ڈاؤن لوڈ کریں',
    privacyPolicyTitle: 'پرائیویسی پالیسی',
    termsTitle: 'سروس کی شرائط',
    contactTitle: 'رابطہ کریں',
    settingsPrivacyTitle: 'سیٹنگز اور GDPR پرائیویسی',
    deleteMyDataBtn: 'میرا ڈیٹا حذف کریں',
    confirmDeleteDataBtn: 'مستقل حذف کرنے کی تصدیق کریں',
    closeBtn: 'بند کریں',
    cancelBtn: 'منسوخ کریں',
  },
  zh: {
    navRoles: '情景对话',
    navVoice: '实时语音',
    navVocab: '词汇本',
    navProgress: '学习进度',
    allLanguages: '全部语言',
    startCall: '开始通话',
    endAndReport: '结束并查看报告',
    voicePrivacyNotice: '未经您的许可，我们不会存储您的语音',
    upgradeBannerTitle: '升级到高级版享受无限次通话',
    shareTitle: '分享 LinguaLive 给朋友',
    inviteRewardTitle: '邀请好友，赢取 100 XP',
    downloadAppTitle: '下载我们的应用',
    privacyPolicyTitle: '隐私政策',
    termsTitle: '服务条款',
    contactTitle: '联系我们',
    deleteMyDataBtn: '删除我的数据',
    closeBtn: '关闭',
    cancelBtn: '取消',
  },
  ja: {
    navRoles: 'シナリオ',
    navVoice: 'ライブ音声',
    navVocab: '単語帳',
    navProgress: '進捗',
    allLanguages: 'すべての言語',
    startCall: '通話を開始',
    endAndReport: '終了してレポート',
    voicePrivacyNotice: '許可なく音声を保存することはありません',
    upgradeBannerTitle: 'プレミアムにアップグレードして無制限通話',
    shareTitle: '友達に LinguaLive をシェア',
    inviteRewardTitle: '友達を招待して 100 XP 獲得',
    downloadAppTitle: 'アプリをダウンロード',
    privacyPolicyTitle: 'プライバシーポリシー',
    termsTitle: '利用規約',
    contactTitle: 'お問い合わせ',
    deleteMyDataBtn: 'データを削除',
    closeBtn: '閉じる',
    cancelBtn: 'キャンセル',
  },
  ko: {
    navRoles: '시나리오',
    navVoice: '실시간 음성',
    navVocab: '단어장',
    navProgress: '학습 현황',
    allLanguages: '모든 언어',
    startCall: '통화 시작',
    endAndReport: '종료 및 리포트',
    voicePrivacyNotice: '동의 없이 음성을 저장하지 않습니다',
    upgradeBannerTitle: '무제한 통화를 위해 프리미엄으로 업그레이드하세요',
    shareTitle: '친구에게 LinguaLive 공유하기',
    inviteRewardTitle: '친구 초대하고 100 XP 받기',
    downloadAppTitle: '앱 다운로드',
    privacyPolicyTitle: '개인정보처리방침',
    termsTitle: '이용약관',
    contactTitle: '문의하기',
    deleteMyDataBtn: '내 데이터 삭제',
    closeBtn: '닫기',
    cancelBtn: '취소',
  },
  tr: {
    navRoles: 'Senaryolar',
    navVoice: 'Canlı Ses',
    navVocab: 'Kelimeler',
    navProgress: 'İlerleme',
    allLanguages: 'Tüm Diller',
    startCall: 'Aramayı Başlat',
    endAndReport: 'Bitir ve Rapor',
    voicePrivacyNotice: 'İzniniz olmadan sesinizi saklamıyoruz',
    upgradeBannerTitle: 'Sınırsız Arama için Premium’a Yükseltin',
    shareTitle: 'LinguaLive’ı Arkadaşınla Paylaş',
    inviteRewardTitle: 'Arkadaş Davet Et, 100 XP Kazan',
    downloadAppTitle: 'Uygulamamızı İndirin',
    privacyPolicyTitle: 'Gizlilik Politikası',
    termsTitle: 'Kullanım Şartları',
    contactTitle: 'İletişim',
    deleteMyDataBtn: 'Verilerimi Sil',
    closeBtn: 'Kapat',
    cancelBtn: 'İptal',
  },
  ru: {
    navRoles: 'Сценарии',
    navVoice: 'Живой голос',
    navVocab: 'Словарь',
    navProgress: 'Прогресс',
    allLanguages: 'Все языки',
    startCall: 'Начать звонок',
    endAndReport: 'Завершить и отчёт',
    voicePrivacyNotice: 'Мы не сохраняем ваш голос без разрешения',
    upgradeBannerTitle: 'Перейдите на Premium для безлимитных звонков',
    shareTitle: 'Поделиться LinguaLive с другом',
    inviteRewardTitle: 'Пригласите друга — получите 100 XP',
    downloadAppTitle: 'Скачать приложение',
    privacyPolicyTitle: 'Политика конфиденциальности',
    termsTitle: 'Условия использования',
    contactTitle: 'Контакты',
    deleteMyDataBtn: 'Удалить мои данные',
    closeBtn: 'Закрыть',
    cancelBtn: 'Отмена',
  },
  bn: {
    navRoles: 'দৃশ্যপট',
    navVoice: 'লাইভ ভয়েস',
    navVocab: 'শব্দভাণ্ডার',
    navProgress: 'অগ্রগতি',
    allLanguages: 'সব ভাষা',
    startCall: 'কল শুরু করুন',
    endAndReport: 'শেষ ও রিপোর্ট',
    voicePrivacyNotice: 'আপনার অনুমতি ছাড়া আমরা আপনার কণ্ঠস্বর সংরক্ষণ করি না',
    upgradeBannerTitle: 'আনলিমিটেড কলের জন্য প্রিমিয়ামে আপগ্রেড করুন',
    shareTitle: 'বন্ধুর সাথে LinguaLive শেয়ার করুন',
    inviteRewardTitle: 'বন্ধুকে আমন্ত্রণ জানান, ১০০ XP পান',
    downloadAppTitle: 'আমাদের অ্যাপ ডাউনলোড করুন',
    privacyPolicyTitle: 'গোপনীয়তা নীতি',
    termsTitle: 'সেবার শর্তাবলী',
    contactTitle: 'যোগাযোগ',
    deleteMyDataBtn: 'আমার ডেটা মুছুন',
    closeBtn: 'বন্ধ করুন',
    cancelBtn: 'বাতিল',
  },
};

function detectInitialLocale(): { lang: AppLangCode; currency: string; countryCode: string } {
  try {
    const saved = localStorage.getItem(APP_LANG_STORAGE_KEY) as AppLangCode | null;
    if (saved && APP_LANGUAGES.some((l) => l.code === saved)) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const tzInfo = TIMEZONE_TO_INFO[tz];
      return {
        lang: saved,
        currency: tzInfo?.currency || 'USD',
        countryCode: tzInfo?.country || 'US',
      };
    }
  } catch {
    // Ignore storage read errors
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzInfo = TIMEZONE_TO_INFO[tz];
    if (tzInfo) {
      return {
        lang: tzInfo.lang,
        currency: tzInfo.currency,
        countryCode: tzInfo.country,
      };
    }

    const navLang = (navigator.language || 'en').split('-')[0].toLowerCase() as AppLangCode;
    const matched = APP_LANGUAGES.find((l) => l.code === navLang);
    if (matched) {
      return { lang: matched.code, currency: 'USD', countryCode: 'US' };
    }
  } catch {
    // Fallback
  }

  return { lang: 'en', currency: 'USD', countryCode: 'US' };
}

interface I18nContextValue {
  appLang: AppLangCode;
  appLanguageMeta: AppLanguageMeta;
  nativeLanguageName: string;
  setAppLang: (code: AppLangCode) => void;
  isRTL: boolean;
  countryCode: string;
  countryName: string | null;
  currency: string;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  formatPrice: (usdAmount: number) => string;
  formatDate: (dateOrTs: number | Date) => string;
  formatTime: (dateOrTs: number | Date) => string;
  formatDateTime: (dateOrTs: number | Date) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = useMemo(() => detectInitialLocale(), []);
  const [appLang, setAppLangState] = useState<AppLangCode>(initial.lang);
  const [currency, setCurrency] = useState<string>(initial.currency);
  const [countryCode, setCountryCode] = useState<string>(initial.countryCode);
  const [countryName, setCountryName] = useState<string | null>(null);

  const setAppLang = (code: AppLangCode) => {
    setAppLangState(code);
    try {
      localStorage.setItem(APP_LANG_STORAGE_KEY, code);
    } catch {
      // Ignore
    }
  };

  // Hydrate edge/geo headers once in background (without overriding manual user selection)
  useEffect(() => {
    let active = true;
    fetch('/api/geo')
      .then((res) => (res.ok ? res.json() : null))
      .then((geo) => {
        if (!active || !geo) return;
        if (geo.countryCode) setCountryCode(geo.countryCode);
        if (geo.countryName) setCountryName(geo.countryName);
        if (geo.currency) setCurrency(geo.currency);

        const hasExplicitChoice = Boolean(localStorage.getItem(APP_LANG_STORAGE_KEY));
        if (!hasExplicitChoice && geo.defaultAppLang) {
          const valid = APP_LANGUAGES.find((l) => l.code === geo.defaultAppLang);
          if (valid) {
            setAppLangState(valid.code);
          }
        }
      })
      .catch(() => {
        // Non-blocking fallback
      });
    return () => {
      active = false;
    };
  }, []);

  const appLanguageMeta = useMemo(
    () => APP_LANGUAGES.find((l) => l.code === appLang) || APP_LANGUAGES[0],
    [appLang]
  );

  const isRTL = Boolean(appLanguageMeta.rtl);

  useEffect(() => {
    document.documentElement.lang = appLanguageMeta.code;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [appLanguageMeta.code, isRTL]);

  const t = (key: TranslationKey, vars?: Record<string, string | number>): string => {
    const template = TRANSLATIONS[appLang]?.[key] || EN_DICT[key] || key;
    if (!vars) return template;
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      template
    );
  };

  const formatPrice = (usdAmount: number): string => {
    const rate = CURRENCY_MULTIPLIER_FROM_USD[currency] || 1;
    const rawValue = usdAmount * rate;
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency);
    const amount = isZeroDecimal ? Math.round(rawValue / 10) * 10 : Number(rawValue.toFixed(2));
    try {
      return new Intl.NumberFormat(appLanguageMeta.locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: isZeroDecimal ? 0 : 2,
      }).format(amount);
    } catch {
      return `$${usdAmount.toFixed(2)}`;
    }
  };

  const formatDate = (dateOrTs: number | Date): string => {
    try {
      return new Intl.DateTimeFormat(appLanguageMeta.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(dateOrTs instanceof Date ? dateOrTs : new Date(dateOrTs));
    } catch {
      return new Date(dateOrTs).toLocaleDateString();
    }
  };

  const formatTime = (dateOrTs: number | Date): string => {
    try {
      return new Intl.DateTimeFormat(appLanguageMeta.locale, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateOrTs instanceof Date ? dateOrTs : new Date(dateOrTs));
    } catch {
      return new Date(dateOrTs).toLocaleTimeString();
    }
  };

  const formatDateTime = (dateOrTs: number | Date): string => {
    try {
      return new Intl.DateTimeFormat(appLanguageMeta.locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(dateOrTs instanceof Date ? dateOrTs : new Date(dateOrTs));
    } catch {
      return new Date(dateOrTs).toLocaleString();
    }
  };

  return (
    <I18nContext.Provider
      value={{
        appLang,
        appLanguageMeta,
        nativeLanguageName: appLanguageMeta.name,
        setAppLang,
        isRTL,
        countryCode,
        countryName,
        currency,
        t,
        formatPrice,
        formatDate,
        formatTime,
        formatDateTime,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
