# Faz 0 — Proje Keşif Raporu (`Balkon Dergisi` Admin Paneli)

Bu belge, **Balkon Dergisi** (Sezai Karakoç Anadolu Lisesi dijital dergi platformu) yönetici panelinin yeniden tasarım, tam Türkçeleştirme ve Türkçe etkileşimli kullanım rehberi ekleme süreci öncesinde çıkarılan statik kod ve yerel çalışma keşfini içerir.

---

## Keşif Özeti

### 1. Admin Panelinin Yeri ve Dosya Mimarisi

- **Route Grubu ve Kabuk İzolasyonu:** Admin rotaları `src/app/(admin)/` altında toplanır. Kök layout (`src/app/layout.tsx`) içindeki `AppShell` (`src/components/AppShell.tsx`), `pathname?.startsWith("/admin")` koşuluyla kamusal `Header` ve `Footer` bileşenlerini gizleyerek yalnızca `{children}` çıktısını verir.
- **Sayfa Rotaları (`src/app/(admin)/admin/`):**
  - `/admin` (`page.tsx`): Sunucu bileşeni; `requireAdmin()` çağrısı sonrası `SupabaseMagazineRepository.findAll()` ile dergileri çeker ve `AdminDashboardClient` bileşenine aktarır.
  - `/admin/login` (`login/page.tsx`, `login/layout.tsx`): `react-hook-form` + `zodResolver(loginSchema)` + `useActionState(login)` kullanan istemci giriş ekranı. `robots: { index: false, follow: false }` tanımlar.
  - `/admin/analytics` (`analytics/page.tsx`): Sunucu bileşeni; son 30 günlük veriyi `getAnalyticsDashboardData(30)` ile çekip `DynamicAnalyticsDashboard` (`next/dynamic`) üzerinden `AnalyticsDashboardClient` render eder.
  - `/admin/performance` (`performance/page.tsx`): Sunucu bileşeni; `?days=1|7|30` parametresiyle `getPerformanceDashboardData(activeDays)` verilerini çeker, istemci wrapper'ı olmadan doğrudan sunucuda HTML tablosu ve bütçe çubukları render eder.
- **Admin Layout ve Hata/Yüklenme Sınırları:**
  - `src/app/(admin)/layout.tsx`: Çocuk rotaları `ReactQueryProvider` ve `<Suspense fallback={<AdminLoading />}>` içine alır.
  - `src/app/(admin)/admin/loading.tsx`: Tablo ve başlık iskeleti render eder.
  - `src/app/(admin)/admin/error.tsx`: İstemci hata sınırı; `env.NODE_ENV === 'development'` durumunda hata mesajı ve yığın izini (`error.stack`) gösterir.
- **Admin İstemci Bileşen Ağacı (`src/app/(admin)/admin/`):**
  - `AdminDashboardClient.tsx`
    - `UserMenu.tsx` → `PasswordChangeDialog.tsx`
    - `UploadDialog.tsx` (`next/dynamic({ ssr: false })` ile `pdfjs-dist` paketini tembel yükler) → `components/UploadForm.tsx` (`components/ProgressBar.tsx` kullanır) + `components/UploadLogs.tsx`
    - `MagazineTable.tsx` → `RowActions.tsx` (Dropdown içinde `Yeniden Adlandır` ve `Sil` diyalogları)
  - `analytics/AnalyticsDashboardClient.tsx` → `UserMenu.tsx`, Recharts grafikleri (`AreaChart`, `PieChart`, `BarChart`), `Select` ve `Card`
  - Kullanılmayan/ayrık bileşen notu: `src/app/(admin)/admin/components/UploadProgress.tsx` mevcuttur ancak `UploadDialog` doğrudan `UploadForm` içindeki `ProgressBar` bileşenini kullanır.
- **Paylaşılan UI Primitifleri (`src/components/ui/` — 14 dosya):**
  - Radix/shadcn tabanlılar: `badge.tsx`, `breadcrumb.tsx`, `button.tsx`, `card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `table.tsx`
  - Yardımcılar: `toaster.tsx` (Sonner sarmalayıcısı; `src/app/layout.tsx` içinde `position="top-right"`, `duration={4000}`, `closeButton`, `richColors` ile bir kez mount edilir), `ErrorDisplay.tsx`, `timeline-animation.tsx`, `vertical-cut-reveal.tsx`
- **Server Action'lar:**
  - `src/app/(admin)/admin/actions.ts`: `addMagazineRecord`, `deleteMagazine`, `renameMagazine`, `saveUploadLog`, `revalidateMagazinePage`, `revalidateMagazines`, `uploadFileToStorage`
  - `src/app/(admin)/admin/login/actions.ts`: `login`, `logout`
  - `src/app/(admin)/admin/password-actions.ts`: `changePassword`
  - `src/app/actions/analytics-actions.ts`: `trackMagazineView`, `getAnalyticsDashboardData`, `trackPageEngagement`, `getPageAnalytics`
  - `src/app/actions/performance-actions.ts`: `getPerformanceDashboardData`

### 2. Teknoloji Yığını ve Altyapı

| Alan | Kullanılan Teknoloji / Sürüm | Dosya / Dayanak |
|---|---|---|
| Çatı ve Dil | Next.js `15.5.18` (App Router, Turbopack), React `19.1.2`, TypeScript `^5` (`strict: true`) | `package.json`, `tsconfig.json` |
| UI Primitifleri ve İkonlar | Radix UI (`dialog`, `dropdown-menu`, `label`, `select`, `slot`), `components.json` (`style: "new-york"`, `baseColor: "neutral"`), `lucide-react` `^0.542.0`, `sonner` `^2.0.7` | `package.json`, `components.json`, `src/components/ui/` |
| Grafik ve Hareket | `recharts` `^3.6.0`, `motion` `^12.23.12` | `package.json`, `AnalyticsDashboardClient.tsx` |
| CSS Yaklaşımı | Tailwind CSS v4 (`@tailwindcss/postcss` `^4`), `tw-animate-css` `^1.3.8`, `@theme inline` + `:root`/`.dark` değişkenleri | `src/app/globals.css`, `postcss.config.mjs` |
| Durum ve Form Yönetimi | `ReactQueryProvider` (`@tanstack/react-query` `^5.90.16`) layout'ta sarılı olsa da admin ekranları fiilen React yerel state (`useState`, `useTransition`, `useActionState`), `react-hook-form` `^7.62.0` + `zod` `^4.1.5` (yalnızca girişte) ve özel hook'lar (`useUploadForm`, `useUploadProgress`, `useUploadPersistence`) kullanır | `src/app/(admin)/layout.tsx`, `login/page.tsx`, `UploadDialog.tsx` |
| İstemci PDF / Depolama | `pdfjs-dist` `^5.4.394` (`public/pdf.worker.min.mjs`), Supabase (`@supabase/ssr` `^0.7.0`, `@supabase/supabase-js` `^2.97.0`), Cloudflare R2 (`@aws-sdk/client-s3` `^3.1029.0`) | `package.json`, `next.config.ts` |
| Mevcut i18n Çözümü | Harici i18n paketi yok; `src/app/layout.tsx` `lang="tr"` tanımlar, metinler bileşen içinde sabit string olarak yer alır | `package.json`, `src/app/layout.tsx` |
| Build, Lint ve Test | `pnpm` (`packageManager: 10.5.2`, yerel sistem `11.10.0`), Node `v24.14.0` (`engines.node`: `>=18 <=22.x`), `eslint` `^9` (`next/core-web-vitals`, `next/typescript`), `tsc --noEmit`, `tsx --test` (yalnızca `lib/utils` ve `lib/audio` altında 2 birim testi; admin UI testi yok) | `package.json`, `eslint.config.mjs` |

- **Türkçeleştirme ve Dil Tutarlılığı Bulguları:**
  - Admin ekranlarındaki kullanıcı metinlerinin büyük bölümü Türkçe olmakla birlikte İngilizce/teknik kalıntılar mevcuttur: `src/components/ui/dialog.tsx:113` (`Close`), `src/components/ui/breadcrumb.tsx:113` (`More`), `src/app/(admin)/admin/UploadDialog.tsx:199` (`İdempotency anahtarı oluşturulamadı`), `src/components/Footer.tsx:205` (`Made by`), `src/app/(admin)/admin/performance/page.tsx:229-234` (İngilizce Web Vitals tam adları) ve `src/app/(admin)/admin/page.tsx:73` / `RowActions.tsx` üzerinden gelebilecek hata mesajları.
  - **Kritik doğrulama bulgusu:** `src/lib/validators/formDataSchemas.ts:25-28` ve `134-137` satırlarındaki `title` ve `new_title` regex kuralı `/^[a-zA-Z0-9\s\-.,!?]+$/` biçimindedir; bu kural Türkçe karakterlerin (`ç, ğ, ı, İ, ö, ş, ü`) girilmesini engeller.

### 3. Panelin Amacı ve Sektörü

- **Sektör:** Lise eğitimi ve öğrenci kültür/edebiyat yayıncılığı (**Sezai Karakoç Anadolu Lisesi**).
- **Panelin Amacı:** Dönemlik **Balkon Dergisi** sayılarının tarayıcı tarafında PDF'ten WebP görsellerine (`TARGET_HEIGHT = 3600`, `quality = 0.95`) dönüştürülüp Supabase Storage veya Cloudflare R2'ye yüklenmesi, yayınlanan sayıların aranması/sıralanması, iyimser kilitleme (`version`) ile yeniden adlandırılması veya silinmesi, okuyucu ziyaret/sayfa okuma hunisi istatistiklerinin (`/admin/analytics`) ve gerçek kullanıcı Core Web Vitals bütçelerinin (`/admin/performance`) yönetici tarafından izlenmesi.

### 4. Roller, Kimlik Doğrulama ve Yetkilendirme

- **Veritabanı Rol Modeli (`src/migration/database_setup.sql`):** `public.user_profiles` tablosu `role` sütununu `CHECK (role IN ('admin', 'user'))` ile sınırlar. Yeni Auth kayıtları `handle_new_user()` tetikleyicisiyle `'user'` rolü alır; yönetici yetkisi SQL güncellemesi ile atanır.
- **Yetkilendirme Katmanları:**
  - `src/lib/services/authorization.ts`: `requireAdmin()` Supabase Auth `getUser()` ile oturumu alır, `user_profiles.role === 'admin'` doğrulaması yapar; aksi halde `AuthorizationError` fırlatır. `verifyCSRFOrigin()` istek `origin` veya `referer` başlığını `NEXT_PUBLIC_SITE_URL` (+ geliştirme ortamında `localhost:3000` / `127.0.0.1:3000`) izin listesiyle karşılaştırır.
  - `src/lib/middleware/authMiddleware.ts`: `requireAuth()` ve `getOptionalAuth()` yalnızca giriş yapmış kullanıcıyı kontrol eder, `admin` rolü kontrolü yapmaz. Admin sayfaları ve aksiyonları `requireAdmin()` kullanır.
  - **Önemli çalışma bulgusu (Kök `middleware.ts`):** Proje kökünde `middleware.ts` yer alır ve `/admin/*` koruması ile `x-nonce` / `Content-Security-Policy` başlıkları üretmek üzere yazılmıştır. Ancak uygulama `src/app/` dizininde olduğu için Next.js yerel geliştirme sunucusunda kök `middleware.ts` çalışmadı (`x-nonce` ve `Content-Security-Policy` yanıt başlıkları üretilmedi; `/admin` ve `/admin/analytics` istekleri doğrudan sayfa bileşenlerindeki `requireAdmin()` kontrolüne düştü).
- **Hız Sınırlaması (`src/lib/services/rateLimiting.ts`):** Bellek içi (`in-memory`) sınırlar uygulanır: giriş denemesi IP başına 15 dakikada 5, dergi yükleme `userId` başına saatte 10, şifre değiştirme `userId` başına 15 dakikada 5.

### 5. Marka Kimliği ve Görsel Sistem

- **Renk Paleti (`src/app/globals.css`):**
  - Açık tema (`:root`): Zemin `--background: #f9f9f9`, metin `--foreground: #374151`, kart `--card: #ffffff`, birincil marka rengi `--primary: #ef4444` (Balkon kırmızısı), ikincil vurgu `--accent: #3b82f6`, kenarlık `--border: #e5e7eb`, ikincil metin `--muted-foreground: #6b7280`, yuvarlaklık `--radius: 0.5rem`.
  - Koyu tema (`.dark`): `@custom-variant dark (&:is(.dark *));` tanımı ile `--background: #17100e`, `--card: #080e1c`, `--primary: #ff5600`, `--accent: #000ce1`, `--border: #ffffff33` tanımlıdır; ancak uygulamada `.dark` sınıfını ekleyen bir tema anahtarı veya sağlayıcı bulunmaz.
- **Admin Sayfalarındaki Renk/Stil Tutarsızlıkları:**
  - `/admin` ve `/admin/login`: `bg-[#f9f9f9]` zemin, `bg-neutral-900` birincil gönderme/ekleme butonları (`--primary` olan `#ef4444` yerine siyah buton).
  - `/admin/analytics`: `bg-[#f8fafc]` zemin, `slate-*` renk skalası ve `#dc2626` grafik vurgusu.
  - `/admin/performance`: `bg-[#f9f9f9]` zemin, başlık ikonunda sürekli `animate-pulse` ve diğer alt sayfalardan farklı tekil gezinme şeridi (`UserMenu` yok).
- **Logo ve İkon:** Kamusal üst/alt bilgi (`HeaderAnimationWrapper.tsx`, `Footer.tsx`) tipografik işaret olarak kırmızı `BALKON` + dikey ayraç + `Dergisi` kullanır; ayrıca `public/favicon.png` ve `src/app/icon.tsx` (`#ef4444` zemin üzerinde beyaz `B`) bulunur. Admin paneli ve giriş ekranı şu anda logo veya marka işareti taşımaz.
- **Tipografi:** `src/app/layout.tsx` `Geist` (`--font-geist-sans`) ve `Geist_Mono` (`--font-geist-mono`) fontlarını yükler ve `<body>` üzerinde `font-sans antialiased` uygular.

### 6. Yerel Çalıştırma ve Canlı Erişim Denemesi

- **Ortam Dosyaları (içerikler okunmadan yalnızca varlık kontrolü):** `.env.local` (`True`) ve `.env.example` (`True`) mevcuttur; Node `v24.14.0` ve `pnpm 11.10.0` kuruludur.
- **Sunucu Başlatma ve HTTP Sonuçları (`pnpm dev`):**
  - Sunucu `http://localhost:3000` adresinde ayağa kalktı.
  - `GET /` → HTTP `200` (77.548 bayt)
  - `GET /admin/login` → HTTP `200` (118.019 bayt, `x-nonce` boş, `Content-Security-Policy` yok)
  - `GET /admin` → HTTP `200` (127.803 bayt; `AdminLayout` `<Suspense>` sarmalayıcısı nedeniyle sunucuda `requireAdmin()` başarısız olunca `NEXT_REDIRECT` flight verisi döndü, tarayıcı `/admin/login` adresine yönlendi)
  - `GET /admin/analytics` → HTTP `200` (130.294 bayt; sunucu logunda `Authentication required for admin access`, `NEXT_REDIRECT` ile `/admin/login` yönlendirmesi)
  - `GET /admin/performance` → HTTP `200` (130.654 bayt; sunucu logunda `Authentication required for admin access`, `NEXT_REDIRECT` ile `/admin/login` yönlendirmesi)
- **Tarayıcı ve Ekran Görüntüsü Doğrulaması:**
  - Playwright Chromium ile `http://localhost:3000/admin/login` masaüstü (`1280x800`) ve mobil (`375x812`) görüntüleri doğrulandı: `#f9f9f9` arka plan üzerinde ortalanmış beyaz kart, Türkçe başlık ve `E-posta` / `Şifre` alanları ile siyah `Giriş Yap` butonu sorunsuz çizildi; `http://localhost:3000/admin` ise tarayıcıda `http://localhost:3000/admin/login` sayfasına yönlendi.
  - Oturumlu admin alt sayfaları (`/admin`, `/admin/analytics`, `/admin/performance`) aktif yönetici oturumu bulunmadığından canlı DOM yerine statik kaynak kod üzerinden incelendi.
  - Deneme sonunda geçici `pnpm dev` süreci sonlandırıldı ve port 3000 dinleme durumunun `False` olduğu doğrulandı.

---

## Varsayımlar

1. **Tek yönetici rolü kapsamı korunur:** Yeni tasarım ve rehber mevcut `'admin'` rolü için hazırlanacak; `'user'` rolü için ayrı panel ekranı veya rol yönetim arayüzü eklenmeyecektir. *Dayanak:* Görev kuralları veritabanı şeması ve API sözleşmesi değişikliğini kapsam dışı bırakır.
2. **Kök `middleware.ts` dosyası Faz 0'da taşınmaz:** Kök dizindeki `middleware.ts`'nin `src/` yapısı nedeniyle çalışmadığı bulgu olarak raporlanır; taşıma veya CSP düzenlemesi orkestratörün sonraki faz planına bırakılır. *Dayanak:* Faz 0 kapsamı yalnızca salt-okunur keşif ve `00-kesif.md` yazımıdır.
3. **Birincil tema açık (light) editöryel sistemdir:** Admin arayüzü `.dark` için tanımlı CSS değişkenlerini koruyacak biçimde semantik token'lara bağlanacak, ancak ilk teslimde tema anahtarı eklenmeden `#f9f9f9` zemin ve `#ef4444` Balkon kırmızısı etrafında birleştirilecektir. *Dayanak:* `next-themes` kurulu değildir ve mevcut kamusal site ile giriş ekranı açık temadadır.
4. **Harici i18n kütüphanesi eklenmez:** Tüm metinler doğrudan Türkçe bileşen metinleri ve gerekirse sade bir yerel sabit sözlüğü üzerinden yönetilecektir. *Dayanak:* Platform yalnızca Türkçe yayın yapmaktadır ve `ponytail` ilkesi tek dil için ek bağımlılık eklemeyi gerektirmez.
5. **Etkileşimli Türkçe kullanım rehberi istemci tarafında çalışır:** Rehber veritabanı tablosu gerektirmez; adım durumu veya kapatma tercihi gerekiyorsa tarayıcı `localStorage` üzerinden saklanır. *Dayanak:* Veritabanı şeması değişikliği yapılmayacaktır.
6. **Oturumsuz admin sayfaları statik analizle kapsanmıştır:** Supabase yönetici hesabı oturumu olmadan `/admin`, `/admin/analytics` ve `/admin/performance` canlı ekran görüntüsü alınamadığından, bu sayfaların düzen ve metin incelemesi doğrudan kaynak kod üzerinden yapılmıştır. *Dayanak:* `.env.local` gizli anahtarları okunmamış ve üretim/geliştirme veritabanında kullanıcı oluşturulmamıştır.
