import { t } from '@/lib/i18n'
import { normalizeSearchTR } from '@/lib/formatters/tr'
import type { TourPageKey } from '@/lib/tour/steps'

export interface HelpTopic {
  id: string
  title: string
  summary: string
  category: string
  keywords: string[]
  tourPage?: TourPageKey
}

export interface KeyboardShortcutHint {
  keys: string
  description: string
}

/**
 * Builds the localized help topics list backed by `tr.json` (`tour.topics.*`).
 */
export function getHelpTopics(): HelpTopic[] {
  return [
    {
      id: 'upload',
      title: t('tour.topics.upload.title'),
      summary: t('tour.topics.upload.summary'),
      category: t('nav.magazines'),
      keywords: ['pdf', 'yükle', 'yeni sayı', 'kapak', 'webp', 'dönüştürme', 'boyut'],
      tourPage: 'upload',
    },
    {
      id: 'conflict',
      title: t('tour.topics.conflict.title'),
      summary: t('tour.topics.conflict.summary'),
      category: t('nav.magazines'),
      keywords: ['çakışma', 'sürüm', 'yeniden adlandır', 'sayı numarası', 'sayfayı yenile', 'hata'],
      tourPage: 'dashboard',
    },
    {
      id: 'delete',
      title: t('tour.topics.delete.title'),
      summary: t('tour.topics.delete.summary'),
      category: t('nav.magazines'),
      keywords: ['sil', 'silme', 'kalıcı', 'satır işlemleri', 'geri alınamaz'],
      tourPage: 'dashboard',
    },
    {
      id: 'analytics',
      title: t('tour.topics.analytics.title'),
      summary: t('tour.topics.analytics.summary'),
      category: t('nav.analytics'),
      keywords: ['istatistik', 'okunma', 'izlenme', 'ziyaretçi', 'cihaz', 'huni', 'sayfa süresi'],
      tourPage: 'analytics',
    },
    {
      id: 'performance',
      title: t('tour.topics.performance.title'),
      summary: t('tour.topics.performance.summary'),
      category: t('nav.performance'),
      keywords: ['performans', 'bütçe', 'p75', 'lcp', 'inp', 'cls', 'önbellek', 'hız'],
      tourPage: 'performance',
    },
    {
      id: 'security',
      title: t('tour.topics.security.title'),
      summary: t('tour.topics.security.summary'),
      category: t('tour.securityCategory'),
      keywords: ['şifre', 'parola', 'hesap', 'oturum', 'çıkış', 'tema', 'koyu', 'açık'],
    },
  ]
}

/**
 * Filters help topics using Turkish case-folding (`İ/i`, `I/ı`) across title, summary, category, and keywords.
 */
export function filterHelpTopics(topics: HelpTopic[], query: string): HelpTopic[] {
  const normalizedQuery = normalizeSearchTR(query)
  if (!normalizedQuery) {
    return topics
  }

  return topics.filter((topic) => {
    const searchableText = normalizeSearchTR(
      [topic.title, topic.summary, topic.category, ...topic.keywords].join(' ')
    )
    return searchableText.includes(normalizedQuery)
  })
}

/**
 * Keyboard navigation and accessibility hints displayed inside the Help Drawer.
 */
export const HELP_KEYBOARD_SHORTCUTS: KeyboardShortcutHint[] = [
  {
    keys: 'Esc',
    description: t('tour.shortcuts.escape'),
  },
  {
    keys: '← / →',
    description: t('tour.shortcuts.arrows'),
  },
  {
    keys: 'Tab / Shift+Tab',
    description: t('tour.shortcuts.tab'),
  },
  {
    keys: 'Enter / Boşluk',
    description: t('tour.shortcuts.enter'),
  },
]
