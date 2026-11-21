# Faz 4–5 — Türkçeleştirme, i18n Altyapısı ve `tr-TR` Biçimlendirme Kılavuzu (`05-turkcelestirme.md`)

**Tarih:** 21.11.2026  
**Durum:** Faz 4–5 Çekirdek ve Wave 5b Entegrasyonu Tamamlandı  
**Referans:** [03-strateji.md](./03-strateji.md) (Bölüm 2.2 ve Bölüm 5.2)

---

## 1. Dosya Konumları ve Sorumluluk Sınırları

| Dosya | Sorumluluk | Kullanım Alanı |
| --- | --- | --- |
| `src/lib/i18n/tr.json` | 13 namespace altında tüm admin arayüz metinleri, hata iletileri, doğrulama kuralları ve rehber içerikleri | Sunucu ve istemci admin bileşenleri |
| `src/lib/i18n/index.ts` | `SUPPORTED_LOCALES`, `Dictionary`, `TranslationKey` tip çıkarımı, `getDictionary()` ve `t()` yardımcısı | Tüm admin sayfaları, kabuk ve tur katmanı |
| `src/lib/formatters/tr.ts` | `tr-TR` tarih, 24 saat, sayı, dosya boyutu, Türkçe arama normalizasyonu ve sıralama fonksiyonları | Tablolar, yükleme günlükleri, analitik ve performans kartları |
| `src/components/ui/dialog.tsx` | Kapatma düğmesi ekran okuyucu etiketi (`Kapat`) | Tüm modal ve mobil çekmece pencereleri |
| `src/components/ui/breadcrumb.tsx` | Gezinme bölgesi (`İçerik haritası`) ve kısaltma (`Daha fazla`) ARIA etiketleri | `AdminShell` üst çubuğu ve kamusal dergi okuyucusu |

- **Karar:** Metinler, tarih/sayı biçimlendiricileri ve UI ARIA etiketleri bileşenlerden ayrıştırılarak `src/lib/i18n/` ve `src/lib/formatters/` altında toplandı.
- **Dayanak:** Tek sözlük ve tek biçimlendirici katmanı, alt sayfalarda dağınık terimlerin ve locale dışı `.toLowerCase()`/`.toFixed()` çağrılarının tekrar üretilmesini önler.

---

## 2. Sabit Terim Sözlüğü ve Dil Tonu Kuralları

### 2.1 Sabitlenmiş Resmi Terimler

| Eski Tutarsız İfade | Sabitlenen Resmi Terim | JSON Anahtarı |
| --- | --- | --- |
| `Admin Girişi` / `Admin Paneli` | `Yönetici Girişi` / `Yönetici Paneli` | `auth.loginTitle`, `nav.adminPanel` |
| `Dergi Yönetimi` | `Dergi Sayıları` | `nav.magazines`, `dashboard.title` |
| `İstatistikler` / `Analiz Paneli` | `Okunma İstatistikleri` | `nav.analytics`, `analytics.title` |
| `Performans` / `Performans İzleme` | `Performans İzleme` (yan menü kısa: `Performans`) | `performance.title`, `nav.performance` |
| `Yeni Dergi Ekle` / `dialog` / `idempotency` | `Yeni Sayı Yükle` / `pencere` / `Yükleme oturumu` | `upload.triggerLabel`, `errors.sessionStartFailed` |
| `Ekran kilidi aktif` | `Ekran uyanık tutuluyor` | `upload.wakeLockActive` |
| `Servis Çalışanı (Offline Mod)` | `Çevrimdışı Önbellek` / `Servis Etkin` | `performance.offlineCache`, `performance.offlineActive` |
| *(yok)* | `Kullanım Rehberi` / `Turu Yeniden Başlat` | `tour.triggerLabel`, `tour.restartLabel` |

- **Dayanak:** Tüm menülerde, sayfa başlıklarında ve rehber adımlarında tek terim kullanmak yöneticilerin aynı modülü iki ayrı ekran sanmasını engeller.

### 2.2 Metin Yazım İlkeleri

1. **Hitap biçimi:** Tüm metinlerde resmi ve net "siz" dili (`"Giriş yapın"`, `"PDF dosyasını seçin"`, `"Sayfayı yenileyin"`) kullanılır; "sen" ve "siz" karışımı yasaktır.
2. **Etken ve kısa fiiller:** Eylem düğmeleri doğrudan sonucu belirtir (`"Yeni Sayı Yükle"`, `"Şifreyi Güncelle"`, `"Kalıcı Sil"`, `"Aramayı Temizle"`).
3. **Suçlamayan hata iletileri:** Hata kutuları kullanıcının hatasını yargılamaz, nedenini ve çözüm adımını söyler (`errors.conflict`: `"Bu kayıt siz düzenlerken başka bir işlemle güncellenmiş. Güncel veriyi görmek için sayfayı yenileyin."`).
4. **Ünlemsiz ve dolgusuz boş durumlar:** Boş durumlar pazarlama sıfatları ve ünlem işareti içermez (`dashboard.emptyTitle`: `"Henüz dergi sayısı eklenmedi"`).
5. **Teknik jargon temizliği:** `idempotency`, `dialog`, `Canvas context`, `Cache-First`, `Stale-While-Revalidate` gibi geliştirici terimleri son kullanıcı metinlerinden çıkarıldı; gereken yerlerde sade Türkçe karşılıkları (`"Görsel önbelleği"`, `"Çevrimdışı Önbellek"`) yazıldı.

- **Dayanak:** Okul danışman öğretmenleri ve öğrenci editörler teknik terim bilmeden işlem adımlarını ve hata çözümlerini ilk okumada anlayabilmelidir.

---

## 3. `tr-TR` Tarih, Saat, Sayı, Arama ve Sıralama Kuralları

`src/lib/formatters/tr.ts` modülü aşağıdaki 8 fonksiyonu dışa aktarır:

| Fonksiyon | Çıktı / Davranış | Koruduğu Kenar Durum |
| --- | --- | --- |
| `parseLocalDateTR(input)` | `Date \| null` | `YYYY-MM-DD` (tarih-only) ve `GG.AA.YYYY` dizgelerini UTC gece yarısı kayması olmadan yerel tarih olarak ayrıştırır; geçersiz takvim tarihlerini (`2026-02-31`) reddeder. |
| `formatDateTR(input)` | `"GG.AA.YYYY"` veya `"-"` | `Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })` ile sabit iki haneli gün/ay üretir. |
| `formatTimeTR(input, includeSeconds?)` | `"SS:DD"` veya `"SS:DD:sn"` | `hour12: false` ve `hourCycle: 'h23'` kullanarak gece yarısını `"24:00"` yerine `"00:00"` olarak 24 saat biçiminde gösterir. |
| `formatDateTimeTR(input)` | `"GG.AA.YYYY SS:DD"` veya `"-"` | Tarih ve 24 saat bilgisini tek standart dizgede birleştirir. |
| `formatNumberTR(value, options?)` | `"1.234,56"` veya `"-"` | `Number.isFinite` kontrolü ile `NaN`/`Infinity` değerlerini `"-"` olarak yakalar; nokta binlik ve virgül ondalık kullanır. |
| `formatFileSizeTR(bytes)` | `"512 bayt"` / `"12,4 MB"` | İngilizce `"B"` yerine `"bayt"` ve Türkçe ondalık virgülü üretir; negatif/`NaN` girdide `"0 bayt"` döndürür. |
| `normalizeSearchTR(value)` | Küçük harfli arama dizgesi | `.normalize('NFC')` sonrası `.toLocaleLowerCase('tr-TR')` uygular ve birleşik nokta (`\u0307`) kalıntılarını temizler (`"İSTANBUL"` → `"istanbul"`, `"IŞIK"` → `"ışık"`, `"I\u0307stanbul"` → `"istanbul"`). |
| `compareTR(a, b)` | `-1 \| 0 \| 1` | `Intl.Collator('tr-TR', { sensitivity: 'base', numeric: true })` ile `ç, ğ, ı, i, ö, ş, ü` alfabetik sırasını ve sayısal sıralamayı (`"Sayı 2"` < `"Sayı 10"`) korur. |

- **Karar:** Tüm biçimlendiriciler `Intl.DateTimeFormat`, `Intl.NumberFormat` ve `Intl.Collator` örneklerini modül düzeyinde önbelleğe alır.
- **Dayanak:** Önbelleğe alınmış `Intl` örnekleri tablo sıralama ve filtreleme döngülerinde her satır için yeniden locale nesnesi oluşturulmasını engeller.

---

## 4. Genişletilebilir i18n Mimarisi

### 4.1 Sözlük Yapısı (`src/lib/i18n/tr.json`)

Üst düzey 13 namespace dondurulmuş sözleşme olarak tanımlanmıştır:
`common`, `nav`, `theme`, `auth`, `dashboard`, `magazines`, `upload`, `analytics`, `performance`, `password`, `tour`, `errors`, `validation`.

#### Wave 5b Eklenen Anahtarlar (Sayfa ve Tur Entegrasyonu)

| Namespace | Eklenen Anahtarlar | Kullanım |
| --- | --- | --- |
| `common` | `selected` | Seçim durumu etiketi |
| `auth` | `emailPlaceholder`, `passwordPlaceholder` | Giriş formu yer tutucuları |
| `magazines` | `pageCount`, `sortDirectionAsc`, `sortDirectionDesc` | Sayfa sayısı ve sıralama yönü |
| `upload` | `titlePlaceholder`, `overallProgress`, `logsEmpty`, `stepsLabel` | Yükleme adımları, genel ilerleme ve boş günlük metni |
| `analytics` | `periodSub`, `visitorsSub`, `engagementSub`, `allTimeSub`, `dailyTrendDescription`, `deviceDescription`, `pageDurationDescription`, `funnelDescription`, `legendTotal`, `legendUnique`, `noTrendData`, `noDeviceData`, `noTopMagazines`, `desktop`, `mobile`, `tablet`, `rangeAriaLabel`, `avgDurationLabel`, `readerRatioLabel` | Analitik KPI alt açıklamaları, grafik açıklamaları, boş durumlar ve cihaz etiketleri |
| `performance` | `budgetsHeading`, `rangeAriaLabel`, `budgetInsufficientSamples` | Bütçe kart başlığı, aralık ARIA etiketi ve yetersiz örneklem uyarısı |
| `errors` | `adminBoundaryTitle`, `adminBoundaryReturn` | Admin hata sınırı başlığı ve dönüş düğmesi |
| `tour` | `steps.completeCta` (`title`, `descriptionWithItems`, `descriptionEmpty`), `steps.analyticsKpis`, `steps.analyticsCharts`, `steps.performanceBudgets`, `steps.dashboardTable`, `steps.uploadWorkflow`, `keyboardHeading`, `shortcuts` (`escape`, `arrows`, `tab`, `enter`), `securityCategory` | Ürün turu alt sayfa adımları, klavye kısayolları ve yardım konusu kategorisi |

- **Dayanak:** Wave 5b eklemeleri sayfa, bileşen ve tur katmanlarında hiçbir anahtarın sabit metne düşmesini önler ve `NestedKeyOf<Dictionary>` birliğiyle derleme zamanında doğrulanır.

### 4.2 Tip Güvenliği ve Yer Tutucu Desteği (`src/lib/i18n/index.ts`)

- `SUPPORTED_LOCALES = ['tr-TR'] as const` ve `defaultLocale = 'tr-TR'`.
- `Dictionary = typeof tr` ve özyinelemeli `NestedKeyOf<Dictionary>` tipi ile `TranslationKey` birliği derleme zamanında otomatik üretilir.
- `t(key, params?, locale?)` hem tek süslü `{param}` (örn. `"{count} dergi"`) hem çift süslü `{{param}}` (örn. `driver.js` `progressText`: `"{{current}} / {{total}}"`) yer tutucularını destekler.
- `params` verilmediğinde veya ilgili anahtar `params` içinde yer almadığında yer tutucu metin değiştirilmeden bırakılır; böylece `driver.js` kendi çalışma zamanında `{{current}}` ve `{{total}}` alanlarını doldurabilir.
- **Dayanak:** Bu ayrım hem uygulama içi dinamik sayıları hem de üçüncü parti tur kütüphanesinin yer tutucu sözleşmesini tek `t()` arayüzünde birleştirir.

### 4.3 Yeni Dil Ekleme Adımları

1. `src/lib/i18n/<locale>.json` dosyasını `tr.json` ile aynı anahtar şemasında oluşturun (TypeScript `Dictionary` tipi eksik anahtarları derleme hatasıyla yakalar).
2. `src/lib/i18n/index.ts` içinde `SUPPORTED_LOCALES` dizisine yeni locale kodunu ekleyin ve `dictionaries` haritasına kaydedin.
3. Gerekirse `src/lib/formatters/` altına ilgili locale için tarih/sayı biçimlendirici eşlemesi ekleyin.

---

## 5. Faz 4–5 Kaynak Tarama ve Doğrulama Sonucu

### Faz 4 Çekirdek Doğrulaması

- `src/components/ui/dialog.tsx`: `"Close"` → `"Kapat"`.
- `src/components/ui/breadcrumb.tsx`: `aria-label="breadcrumb"` → `"İçerik haritası"`, `"More"` → `"Daha fazla"`.
- `src/components/admin/AdminShell.tsx`, `ThemeToggle.tsx`: Tüm etiketler `t()` üzerinden `tr.json` sözlüğüne bağlandı; `AdminShell` üst çubuğundaki `data-tour="guide-trigger"` düğmesi `useAdminTour().openHelpDrawer()` ile bağlandı.

### Wave 5 Sonrası `rg` Taraması

`src/app/(admin)/`, `src/components/admin/`, `src/lib/tour/`, `src/lib/validators/`, `src/lib/services/fileValidation.ts` ve `src/lib/utils/errorMessages.ts` üzerinde yapılan taramada:

1. **Tarih/Sayı/Sıralama/Arama:** Admin sayfaları, bileşenleri, tur ve doğrulayıcılar içinde locale dışı `.toLowerCase()`, `.localeCompare()`, `.toFixed()`, `.toLocaleString()`, `.toLocaleDateString()` ve `.toLocaleTimeString()` çağrısı **0** adet bulundu (`src/lib/utils/errorMessages.ts` içindeki 3 satır yalnızca iç İngilizce hata nesnesi eşlemesi için `error.message.toLowerCase()` kullanır, kullanıcı arayüzüne metin üretmez).
2. **Türkçe Olmayan Kullanıcı Metni / Jargon:** `dialogu`, `İdempotency`, `Offline Mod`, `Cache-First`, `Stale-While-Revalidate`, `Adaptive Quality` ve `Canvas context` kalıntıları **0** adet bulundu (`UploadDialog.tsx` içindeki eşleşmeler yalnızca TypeScript değişken/sınıf adları olan `idempotencyKey`/`idempotencyManager`, `actions.ts` içindekiler ise sunucu tarafı dahili `ValidationError` mesajlarıdır).
