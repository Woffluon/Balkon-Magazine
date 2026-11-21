# Balkon Dergisi Admin Paneli Yeniden Tasarım ve Türkçeleştirme İlerlemesi

**Dal:** `redesign/admin-ui-tr`
**Başlangıç Tarihi:** 21.11.2026
**Son Güncelleme:** 21.11.2026

## Faz Durumu

| Faz | Açıklama | Sorumlu | Durum | Çıktı Dosyası |
|---|---|---|---|---|
| Faz 0 | Proje Keşfi | `explorer` | Tamamlandı | `docs/redesign/00-kesif.md` |
| Faz 1 | Araştırma | `researcher` | Tamamlandı | `docs/redesign/01-arastirma.md` |
| Faz 2 | Audit (Denetim) | `explorer` | Tamamlandı | `docs/redesign/02-audit.md` |
| Faz 3 | Tasarım Stratejisi ve Sözleşmeler | `researcher` | Tamamlandı | `docs/redesign/03-strateji.md` |
| Faz 4 | Uygulama (Tasarım Sistemi ve Bileşenler) | `shell-i18n`, `pages-author` | Çekirdek tamamlandı, sayfalar sırada | `docs/redesign/04-uygulama.md` |
| Faz 5 | Türkçeleştirme (`tr-TR` ve i18n) | `shell-i18n`, `pages-author` | Çekirdek tamamlandı, sayfalar sırada | `docs/redesign/05-turkcelestirme.md` |
| Faz 6 | Etkileşimli Kullanım Rehberi | `tour-author` | Başlatılıyor | `docs/redesign/06-urun-turu.md` |
| Faz 7 | Doğrulama ve Teslim | `verifier` | Bekliyor | `docs/redesign/07-dogrulama.md` |

## Sıradaki Adım
- Wave 4 çekirdek katmanı (`shell-i18n`) doğrulanıp commitlendikten sonra Wave 5 kapsamında `pages-author` (Faz 4/5 sayfalar) ve `tour-author` (Faz 6 ürün turu) paralel başlatılacak.

## Açık Sorunlar ve Kararlar
- Kamusal `(public)/` sayfaları `.dark`, `bg-background`, `bg-card`, `text-foreground` veya `--primary` tüketmediği için `globals.css` içindeki mevcut `:root`/`.dark` korunacak; admin tema token'ları `.admin-theme` ve `.admin-theme.dark` altında izole edilecek.
- Portalların (`Dialog`, `DropdownMenu`, `Select`, `driver.js`, `Toaster`) tema devralması için `AdminThemeProvider` yalnızca `/admin` rotalarında `document.documentElement` üzerine `admin-theme` (`dark`) sınıfını uygulayıp çıkışta temizleyecek.
- Kök dizindeki `middleware.ts` taşıması, veritabanı şeması, API/Server Action dönüş imzaları ve veri silme işlemleri kapsam dışı bırakıldı ("Sonraki Adımlar"a yazılacak).
- Veri silme, veritabanı şeması değişikliği, API sözleşmesi değişikliği ve production dağıtımı yapılmayacaktır.
