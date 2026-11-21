# Faz 4 — Admin Paneli Sayfa ve İş Akışı Uygulama Raporu (`04-uygulama.md`)

**Tarih:** 21.11.2026  
**Ajan Kapsamı:** `pages-author`  
**Referans Sözleşme:** [02-audit.md](./02-audit.md), [03-strateji.md](./03-strateji.md)

---

## 1. Uygulanan Tasarım Kararları ve Dayanakları

### 1.1 Tema Token'ları, WCAG 2.2 AA ve Kabuk Entegrasyonu
- **Sabit renklerin kaldırılması:** Kapsamdaki tüm admin sayfalarından (`AdminDashboardClient`, `MagazineTable`, `RowActions`, `UploadDialog`, `UploadForm`, `UploadLogs`, `ProgressBar`, `UserMenu`, `PasswordChangeDialog`, `login/page.tsx`, `AnalyticsDashboardClient`, `analytics/page.tsx`, `performance/page.tsx`, `loading.tsx`, `error.tsx`) `bg-white`, `bg-[#f9f9f9]`, `bg-[#f8fafc]`, `bg-neutral-900`, `text-gray-*`, `text-slate-*` ve `focus:ring-0` sınıfları çıkarılıp `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `border-input`, `--status-*` ve `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` token'larına geçildi. **Dayanak:** Semantik token'lar açık ve koyu `.admin-theme` kapsamlarında WCAG 2.2 AA kontrast ve odak görünürlüğünü tek kaynaktan sağlar.
- **Mükerrer kabuk öğelerinin temizlenmesi:** `AdminDashboardClient` ve `AnalyticsDashboardClient` içindeki yinelenen `UserMenu`, geri ok bağlantısı ve sayfa dışı navigasyon düğmeleri kaldırıldı; `performance/page.tsx` sayfasındaki tekil başlık çubuğu `AdminShell` akışına hizalandı. **Dayanak:** `AdminShell` üst çubuğunda `UserMenu`, tema anahtarı ve kullanım rehberini her alt sayfada tek yerden sunarak WCAG 3.2.6 tutarlılık gereksinimini karşılar.

### 1.2 Dergi Tablosu, Satır İşlemleri ve Türkçe Veri İşleme
- **`MagazineTable.tsx`:** `normalizeSearchTR`, `compareTR`, `formatDateTR`, `formatNumberTR` ve `parseLocalDateTR` yardımcıları bağlandı; sıralanabilir başlıklara `aria-sort` ve yön ikonları, sayısal sütunlara `tabular-nums`, araç çubuğuna yayın durumu filtresi (`Tümü` / `Yayında` / `Taslak`), **Yoğunluk (`Rahat` / `Kompakt`)** seçimi ve arama temizleme (`X`) düğmesi eklendi. **Dayanak:** `tr-TR` yerel ayar kuralları ve yoğunluk/filtre kontrolleri büyük harf `İ/ı` eşleşme hataları ile tablo okuma sorunlarını ortadan kaldırır.
- **Sıfır sonuç ve `< 640px` mobil kart görünümü:** Arama sonucu `0` olduğunda tablo başlıkları gizlenip `Empty` bileşeni ile odağı arama kutusuna döndüren `Aramayı Temizle` düğmesi gösterilir; `< 640px` ekranlarda yatay kaydırmasız kart listesi sunulur ve `data-tour="row-actions"` ile `data-tour="magazine-table"` yalnızca aktif görünümde atanır. **Dayanak:** Kart düzeni 320px/375px ekranlarda yatay taşmayı engellerken tek aktif seçici kuralı ürün turunun gizli DOM öğesine odaklanmasını önler.
- **`RowActions.tsx`:** `Rename` ve `Delete` `<Dialog>` bileşenleri `<DropdownMenu>` dışına kontrollü `openRename`/`openDelete` state'iyle çıkarıldı; açılışta `newIssue`/`newTitle` sıfırlandı, `useId()` ile `<Label htmlFor>`/`<Input id>` bağlantıları kuruldu, tüm tetikleyicilere `min-h-9 min-w-9` verildi ve başarıda `toast.success` eklendi. **Dayanak:** Diyalogları menü portallarından ayırmak Radix ARIA odak tuzağını çözer ve kirli form durumunun taşınmasını engeller.

### 1.3 Hata Katmanı ve Türkçe Başlık Doğrulaması
- **`TURKISH_TITLE_REGEX` (`schemas.ts`, `formDataSchemas.ts`, `magazineSchemas.ts`, `UploadForm.tsx`, `RowActions.tsx`):** Başlık doğrulama deseni `/^[\p{L}\p{N}\s\-.,!?():'"/]+$/u` ile genişletildi ve `UploadForm` gönderim öncesi istemci doğrulamasına bağlandı. **Dayanak:** Türkçe karakterlerin engellenmesini ve uzun PDF yüklemesinin ardından sunucudan dönen geç hata bildirimlerini önler.
- **`MagazineService.ts` ve `errorMessages.ts`:** `renameMagazine` ve `deleteMagazine` içindeki düz `Error` fırlatmaları `DatabaseError` (`DB_VERSION_CONFLICT` 409, `DATABASE_DUPLICATE_ENTRY` 409, `OPERATION_DELETE_PARTIAL_FAILURE`), `StorageError` ve `ValidationError` alt sınıflarına dönüştürüldü; `TransactionManager` içindeki `stepError` yakalanarak rollback sonrası özgün `AppError` korundu; `formatErrorWithContext` plain serileştirilmiş `{ code, message, userMessage, details? }` nesnelerini çözecek biçimde genişletildi. **Dayanak:** `Result<T>` sözleşmesini değiştirmeden sürüm çakışması, doğrulama ve temizlik uyarılarının `RowActions` içinde görünür olmasını sağlar.
- **Doğal Türkçe hata metinleri (`fileValidation.ts`, `useFileUpload.ts`, `usePDFProcessor.ts`, `errorCatalog.ts`, `errorMessages.ts`, `performance-actions.ts`):** Ham Supabase/İngilizce hata sızıntıları, `example.com` örnekleri ve teknik terimler ("siz" hitaplı doğal Türkçe metinlerle) değiştirildi. **Dayanak:** Son kullanıcının ham sistem/ağ hataları yerine uygulanabilir Türkçe yönergeler görmesini sağlar.

### 1.4 PDF Yükleme Sihirbazı (`UploadDialog`, `UploadForm`, `UploadLogs`, `ProgressBar`, `useUploadProgress`)
- **3 adımlı sihirbaz ve kalıcı tamamlanma ekranı:** `Bilgiler → PDF İşle → Yükle` adım göstergesi eklendi; `1500ms` otomatik kapanma kaldırılıp `Sayıyı Görüntüle`, `Yeni Yükleme` ve `Kapat` eylemleri sunan kalıcı başarı kartına geçildi. **Dayanak:** Yönetici yükleme sonucunu ve günlükleri kendi kontrolüyle inceleyip tek tıkla yayınlanan sayıya gidebilir.
- **Form ergonomisi ve log zaman damgası:** `Number("") -> 0` hatası boş değer `''` korunarak düzeltildi; `text-[10px]` sınıfları `text-xs sm:text-sm` ölçeğine çıkarıldı; PDF (`500 MB`) ve kapak (`JPEG, PNG, WebP · maks. 10 MB`) ipuçları alan altına eklendi; `useUploadProgress` logları `{ id, type, message, timestamp }` yapısına geçirilip `UploadLogs` içinde `formatTimeTR(log.timestamp, true)` ile tek seferlik 24 saat damgasıyla gösterildi. **Dayanak:** Boş sayı kutusu hatası ve her render'da geçmiş log saatlerinin değişmesi/çift yazılması hatasını giderir.

### 1.5 Giriş, Şifre Değiştirme, İstatistikler, Performans ve İskelet/Hata
- **`login/page.tsx` ve `login/layout.tsx`:** Metadata başlığı `Yönetici Girişi - Balkon Dergisi` olarak güncellendi; `BALKON | Dergisi` marka başlığı, `ThemeToggle`, `mode: 'onBlur'` / `reValidateMode: 'onChange'`, `role="alert"` hata kutusu, klavye erişimli şifre göster/gizle düğmesi ve alt kısımda `Balkon Dergisi ana sayfasına dön` bağlantısı eklendi. **Dayanak:** Giriş sırasında erken hata gösterimini engeller ve marka/erişilebilirlik bütünlüğü sağlar.
- **`PasswordChangeDialog.tsx` ve `UserMenu.tsx`:** 3 şifre görünürlük düğmesinden `tabIndex={-1}` kaldırılıp `aria-label` + `aria-pressed` + `size-9` hedef eklendi; zamanlayıcı cleanup'ı ve `toast.success` bağlandı; `UserMenu` çıkış hatasını açılır menü etiketi yerine `toast.error` ile gösterip `isLoggingOut` durumu sundu. **Dayanak:** Klavye erişimini açar, bellek sızıntısını önler ve kapanan menü içinde kaybolan çıkış hatasını görünür kılar.
- **`AnalyticsDashboardClient.tsx` ve `analytics/page.tsx`:** Başlık `Okunma İstatistikleri` olarak standartlaştırıldı; `useReducedMotion()` ile `<= 220ms` yalnızca `transform`/`opacity` geçişleri ve `animationDuration={shouldReduceMotion ? 0 : 300}` uygulandı; tüm sayılar `formatNumberTR` + `tabular-nums`, tarihler `parseLocalDateTR` üzerinden biçimlendirildi; `En Popüler Sayılar` rozetlerine `shrink-0 min-w-8` verildi; sayı seçili değilken `Empty` yönlendirmesi eklendi. **Dayanak:** Hareket hassasiyeti olan kullanıcıları korur ve koyu/açık temada okunaklı grafik etiketleri sunar.
- **`performance/page.tsx`, `loading.tsx`, `error.tsx`:** Performans sayfası `Card`, `Table`, `Badge`, `Button` ve `Empty` ile kuruldu; sürekli `animate-pulse` kaldırıldı; toplam örneklem, gerçek `p75 <= budget` uyum oranı ve mobilde `flex-col sm:flex-row` önbellek kuralları eklendi. `loading.tsx` 6 sütunlu tablo yapısıyla hizalandı; `error.tsx` terimi `Yönetici Paneli` olarak birleştirildi. **Dayanak:** Sahte statik durum metinleri yerine gerçek bütçe hesaplaması sunar ve iskelet-tablo sıçramasını engeller.

---

## 2. 8 Zorunlu Bileşen Durumu Karşılama Matrisi

| Bileşen / Sayfa | Varsayılan | Üzerine Gelme | Odak | Devre Dışı | Yükleniyor | Hata (`role="alert"`) | Boş Durum | Başarı |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AdminDashboardClient` & `MagazineTable` | Semantik kart + `tabular-nums` | Satır ve düğme hover | `focus-visible:ring-2` | Yükleniyor düğmesi | `loading.tsx` 6 sütun iskelet | `page.tsx` hata kartı | İlk kurulum & 0 sonuç `Empty` | `RowActions` `toast.success` |
| `RowActions` | `min-h-9` tetikleyici | `hover:bg-accent` | Ortak odak halkası | `isPending` kilidi | `Loader2` + `Kaydediliyor`/`Siliniyor` | `CONFLICT`/`VALIDATION`/`NETWORK`/temizlik | — | `toast.success` + `router.refresh()` |
| `UploadDialog` & `UploadForm` | 3 adımlı form + ipuçları | Birincil/ikincil düğme hover | Alan + düğme odak halkası | `busy` alan kilidi | Adım çubuğu + `ProgressBar` | Alan `role="alert"` + kurtarma kartı | `UploadLogs` boş durumu | `toast.success` + kalıcı özet kartı |
| `UserMenu` & `PasswordChangeDialog` | Üst çubuk menüsü | Menü öğesi vurgusu | Klavye erişimli 👁 (`size-9`) | `isLoggingOut` / `isLoading` | `Çıkış yapılıyor...` / `Güncelleniyor...` | `toast.error` / `role="alert"` | — | `toast.success` + `role="status"` |
| `login/page.tsx` | Marka + form + `ThemeToggle` | Düğme hover | Ortak odak halkası | `busy` alan kilidi | `Giriş yapılıyor...` | Sunucu & alan `role="alert"` | — | `/admin` yönlendirmesi |
| `AnalyticsDashboardClient` | KPI kartları + grafikler | Kart ve seçici vurgusu | Standart `SelectTrigger` odağı | Filtre `loading` kilidi | `ChartLoadingOverlay` & iskelet | `toast.error` + SSR hata kartı | `Empty` (sayı seç / veri yok) | Güncel grafik/KPI |
| `performance/page.tsx` | Özet + tablo + bütçe kartları | Bağlantı/düğme vurgusu | `Button` odak halkası | — | Suspense `AdminLoading` | `role="alert"` hata kartı | `Empty` | Bütçe `İyi` rozetleri |

---

## 3. Değiştirilen Dosya Envanteri (`pages-author` Kapsamı)

| Alan | Dosyalar |
| --- | --- |
| Sayfalar & Düzenler | `src/app/(admin)/admin/page.tsx`, `src/app/(admin)/admin/AdminDashboardClient.tsx`, `src/app/(admin)/admin/MagazineTable.tsx`, `src/app/(admin)/admin/RowActions.tsx`, `src/app/(admin)/admin/UserMenu.tsx`, `src/app/(admin)/admin/PasswordChangeDialog.tsx`, `src/app/(admin)/admin/loading.tsx`, `src/app/(admin)/admin/error.tsx` |
| Yükleme Sihirbazı | `src/app/(admin)/admin/UploadDialog.tsx`, `src/app/(admin)/admin/components/UploadForm.tsx`, `src/app/(admin)/admin/components/UploadLogs.tsx`, `src/app/(admin)/admin/components/ProgressBar.tsx` |
| Giriş | `src/app/(admin)/admin/login/layout.tsx`, `src/app/(admin)/admin/login/page.tsx` |
| İstatistik & Performans | `src/app/(admin)/admin/analytics/page.tsx`, `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx`, `src/app/(admin)/admin/performance/page.tsx`, `src/app/actions/performance-actions.ts` |
| Hook, Doğrulama & Hata | `src/hooks/useUploadProgress.ts`, `src/hooks/useFileUpload.ts`, `src/hooks/usePDFProcessor.ts`, `src/lib/validators/schemas.ts`, `src/lib/validators/formDataSchemas.ts`, `src/lib/validators/magazineSchemas.ts`, `src/lib/services/MagazineService.ts`, `src/lib/services/fileValidation.ts`, `src/lib/utils/errorMessages.ts`, `src/lib/constants/errorCatalog.ts`, `src/lib/constants/errorMessages.ts` |
| Dokümantasyon | `docs/redesign/04-uygulama.md` |

---

## 4. `data-tour` Yerleşimleri

- `user-menu` → `src/app/(admin)/admin/UserMenu.tsx`
- `upload-trigger` → `src/app/(admin)/admin/UploadDialog.tsx` (+ dinamik yükleme yer tutucusu `AdminDashboardClient.tsx`)
- `magazine-search` → `src/app/(admin)/admin/MagazineTable.tsx`
- `magazine-table` → `src/app/(admin)/admin/MagazineTable.tsx` (yalnızca aktif viewport düzeninde)
- `row-actions` → `src/app/(admin)/admin/RowActions.tsx` (yalnızca ilk görünür satırda)
- `analytics-filters`, `analytics-kpis`, `analytics-charts` → `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx`
- `performance-ranges`, `performance-budgets` → `src/app/(admin)/admin/performance/page.tsx`

---

## 5. Wave 5b Merkezi Sözlük (`tr.json`) ve `EmptyStateHint` Entegrasyonu

- **Yerel Sabitlerin Kaldırılması:** İlk fazda yerel sabit olarak tutulan `upload.*` (`titlePlaceholder`, `overallProgress`, `logsEmpty`, `stepsLabel`), `analytics.*` (`periodSub`, `visitorsSub`, `engagementSub`, `allTimeSub`, `dailyTrendDescription`, `deviceDescription`, `pageDurationDescription`, `funnelDescription`, `legendTotal`, `legendUnique`, `noTrendData`, `noDeviceData`, `noTopMagazines`, `desktop`, `mobile`, `tablet`, `rangeAriaLabel`, `avgDurationLabel`, `readerRatioLabel`), `performance.*` (`budgetsHeading`, `rangeAriaLabel`, `budgetInsufficientSamples`), `errors.*` (`adminBoundaryTitle`, `adminBoundaryReturn`, `retryHint`), `magazines.*` (`pageCount`, `sortDirectionAsc`, `sortDirectionDesc`) ve `auth.*` (`emailPlaceholder`, `passwordPlaceholder`) anahtarları `t('...')` çağrılarına bağlandı. **Dayanak:** Tüm görünür arayüz metinlerinin tek sözlükten (`src/lib/i18n/tr.json`) okunması tutarlı terminoloji ve tek merkezden bakım sağlar.
- **`EmptyStateHint` Entegrasyonu:** `AdminDashboardClient` ilk kurulum boş durumunda (`tourPage="upload"`) ve `AnalyticsDashboardClient` sayı seçilmemiş sayfa analitiği alanında (`tourPage="analytics"`) `@/components/admin/tour/EmptyStateHint` kullanıldı. **Dayanak:** Boş durum kartlarında kullanıcıyı hem ilgili sayfa eylemine hem de tek tıkla bağlamsal mini tura yönlendirir.
