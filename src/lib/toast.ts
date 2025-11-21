/**
 * Toast notification utilities
 * 
 * Re-exports Sonner's toast function for consistent usage across the application.
 * Configured with top-right positioning and 4-second duration in the Toaster component.
 * 
 * @example
 * ```tsx
 * import { toast } from '@/lib/toast'
 * 
 * // Success notification
 * toast.success('Dergi başarıyla eklendi')
 * 
 * // Error notification with action
 * toast.error('Yükleme başarısız', {
 *   description: 'Dosya boyutunu kontrol edin',
 *   action: { label: 'Tekrar Dene', onClick: () => retry() }
 * })
 * 
 * // Promise-based notification
 * toast.promise(uploadPromise, {
 *   loading: 'Yükleniyor...',
 *   success: 'Tamamlandı',
 *   error: 'Başarısız'
 * })
 * ```
 */
export { toast } from 'sonner'
