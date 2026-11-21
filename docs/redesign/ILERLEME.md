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
| Faz 3 | Tasarım Stratejisi ve Sözleşmeler | `researcher` | Devam ediyor | `docs/redesign/03-strateji.md` |
| Faz 4 | Uygulama (Tasarım Sistemi ve Bileşenler) | `shell-i18n`, `pages-author` | Bekliyor | `docs/redesign/04-uygulama.md` |
| Faz 5 | Türkçeleştirme (`tr-TR` ve i18n) | `shell-i18n`, `pages-author` | Bekliyor | `docs/redesign/05-turkcelestirme.md` |
| Faz 6 | Etkileşimli Kullanım Rehberi | `tour-author` | Bekliyor | `docs/redesign/06-urun-turu.md` |
| Faz 7 | Doğrulama ve Teslim | `verifier` | Bekliyor | `docs/redesign/07-dogrulama.md` |

## Sıradaki Adım
- `researcher` Faz 3 (Tasarım Stratejisi, WCAG 2.2 AA Palet, Wireframe'ler ve Dondurulmuş Paralel Sözleşmeler) belgesini yazıyor (`docs/redesign/03-strateji.md`).

## Açık Sorunlar ve Kararlar
- Kök dizindeki `middleware.ts` (`src/` yapısı nedeniyle Next.js tarafından yüklenmiyor) kamusal rotalardaki CSP/nonce davranışını etkileyebileceğinden doğrudan taşınmayacak, "Sonraki Adımlar" güvenlik önerisi olarak raporlanacak.
- `RowActions` içindeki düz `Error` / `handleServerActionResult` uyumsuzluğu, `DropdownMenu` + `Dialog` yuvalama hatası ve Türkçe başlık regex engeli Faz 4/5'te çözülecek.
- `formDataSchemas.ts` ve `schemas.ts` içindeki `title`/`new_title` regex kuralı Türkçe Unicode harflerini kabul edecek biçimde güncellenecek.
- `driver.js` (`v1.14.0`, MIT) dinamik import + `role="dialog"` + `prefers-reduced-motion` sarmalayıcısıyla ürün turu kütüphanesi olarak seçildi.
- Harici i18n paketi olmadan `tr.json` + `tr-TR` formatlayıcılar tabanlı genişletilebilir tip-güvenli sözlük mimarisi seçildi.
- Koyu tema (`.dark`) token'larının admin panel için WCAG 2.2 AA uyumlu hale getirilmesi ve Açık/Koyu tema anahtarı eklenmesi kullanıcı tarafından onaylandı.
- Veri silme, veritabanı şeması değişikliği, API sözleşmesi değişikliği ve production dağıtımı yapılmayacaktır; gerekenler "Sonraki Adımlar" bölümüne yazılacaktır.
