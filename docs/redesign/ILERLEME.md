# Balkon Dergisi Admin Paneli Yeniden Tasarım ve Türkçeleştirme İlerlemesi

**Dal:** `redesign/admin-ui-tr`
**Başlangıç Tarihi:** 21.11.2026
**Son Güncelleme:** 21.11.2026

## Faz Durumu

| Faz | Açıklama | Sorumlu | Durum | Çıktı Dosyası |
|---|---|---|---|---|
| Faz 0 | Proje Keşfi | `explorer` | Tamamlandı | `docs/redesign/00-kesif.md` |
| Faz 1 | Araştırma | `researcher` | Tamamlandı | `docs/redesign/01-arastirma.md` |
| Faz 2 | Audit (Denetim) | `explorer` | Devam ediyor | `docs/redesign/02-audit.md` |
| Faz 3 | Tasarım Stratejisi ve Sözleşmeler | `researcher` | Bekliyor | `docs/redesign/03-strateji.md` |
| Faz 4 | Uygulama (Tasarım Sistemi ve Bileşenler) | `shell-i18n`, `pages-author` | Bekliyor | `docs/redesign/04-uygulama.md` |
| Faz 5 | Türkçeleştirme (`tr-TR` ve i18n) | `shell-i18n`, `pages-author` | Bekliyor | `docs/redesign/05-turkcelestirme.md` |
| Faz 6 | Etkileşimli Kullanım Rehberi | `tour-author` | Bekliyor | `docs/redesign/06-urun-turu.md` |
| Faz 7 | Doğrulama ve Teslim | `verifier` | Bekliyor | `docs/redesign/07-dogrulama.md` |

## Sıradaki Adım
- `explorer` Faz 2 (Audit) denetimini yürütüyor (`docs/redesign/02-audit.md`).

## Açık Sorunlar ve Kararlar
- Kök dizindeki `middleware.ts` (`src/` yapısı nedeniyle Next.js tarafından yüklenmiyor) yerel denemede çalışmadı; Faz 2 audit maddesi olarak ele alınıp API/şema dokunmadan değerlendirilecek.
- `formDataSchemas.ts` içindeki `title`/`new_title` regex kuralı Türkçe karakterleri (`ç, ğ, ı, İ, ö, ş, ü`) engelliyor; Faz 2/5'te düzeltilecek.
- `driver.js` (`v1.14.0`, MIT) dinamik import + `role="dialog"` + `prefers-reduced-motion` sarmalayıcısıyla ürün turu kütüphanesi olarak seçildi.
- Harici i18n paketi olmadan `src/i18n/tr.json` (ve `src/lib/i18n/` + `tr-TR` formatlayıcılar) tabanlı genişletilebilir tip-güvenli sözlük mimarisi seçildi.
- Koyu tema (`.dark`) token'larının admin panel için WCAG 2.2 AA uyumlu hale getirilmesi ve Açık/Koyu tema anahtarı eklenmesi kullanıcı tarafından onaylandı.
- Veri silme, veritabanı şeması değişikliği, API sözleşmesi değişikliği ve production dağıtımı yapılmayacaktır; gerekenler "Sonraki Adımlar" bölümüne yazılacaktır.
