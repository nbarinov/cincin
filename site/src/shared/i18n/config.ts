import en from './messages/en.json';

const LOCALES = ['en', 'ru'] as const;
const DEFAULT_LOCALE: Locale = 'en';

type Locale = (typeof LOCALES)[number];
type Messages = typeof en;

type Tree = { [key: string]: Tree | string };
type PartialTree = { [key: string]: PartialTree | string | undefined };

function isLocale(value: string): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

async function loadMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case 'en':
      return en;

    case 'ru':
      return withFallback((await import('./messages/ru.json')).default);

    default: {
      const exhaustive: never = locale;
      return exhaustive;
    }
  }
}

export { LOCALES, DEFAULT_LOCALE, isLocale, loadMessages };
export type { Locale, Messages };

// utils

function withFallback(translation: PartialTree): Messages {
  const messages = structuredClone(en);

  apply(messages, translation);

  return messages;
}

function apply(target: Tree, patch: PartialTree) {
  for (const [key, value] of Object.entries(patch)) {
    const current = target[key];

    if (typeof value === 'string') {
      target[key] = value;
    } else if (value !== undefined && typeof current === 'object') {
      apply(current, value);
    }
  }
}
