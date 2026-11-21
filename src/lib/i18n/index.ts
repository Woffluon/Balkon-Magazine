import tr from './tr.json'

export const SUPPORTED_LOCALES = ['tr-TR'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export type Dictionary = typeof tr

const dictionaries: Record<Locale, Dictionary> = {
  'tr-TR': tr,
}

export const defaultLocale: Locale = 'tr-TR'

type Primitive = string | number | boolean | null | undefined

type NestedKeyOf<ObjectType extends Record<string, unknown>> = {
  [Key in keyof ObjectType & string]: ObjectType[Key] extends Primitive
    ? Key
    : ObjectType[Key] extends Record<string, unknown>
      ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
      : Key
}[keyof ObjectType & string]

export type TranslationKey = NestedKeyOf<Dictionary>

/**
 * Returns the full translation dictionary for the given locale.
 */
export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale]
}

function resolveKey(dictionary: Dictionary, key: string): string | undefined {
  const segments = key.split('.')
  let current: unknown = dictionary

  for (const segment of segments) {
    if (current === null || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Resolves a dot-notated translation key and replaces `{param}` or `{{param}}`
 * placeholders when matching keys exist in `params`.
 */
export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
  locale: Locale = defaultLocale
): string {
  const template = resolveKey(getDictionary(locale), key) ?? key

  if (!params) {
    return template
  }

  return template.replace(/\{\{(\w+)\}\}|\{(\w+)\}/g, (match, doubleKey, singleKey) => {
    const paramKey = (doubleKey ?? singleKey) as string
    if (Object.prototype.hasOwnProperty.call(params, paramKey)) {
      return String(params[paramKey])
    }
    return match
  })
}
