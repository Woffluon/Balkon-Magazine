# Balkon Dergisi Admin Paneli — Faz 3 Tasarım Stratejisi ve Uygulama Sözleşmeleri

**Tarih:** 21.11.2026  
**Durum:** Dondurulmuş Uygulama Sözleşmesi (Frozen Contract — Faz 4–6 paralel geliştirme için tek doğruluk kaynağı)  
**Referanslar:** [00-kesif.md](./00-kesif.md), [01-arastirma.md](./01-arastirma.md), [02-audit.md](./02-audit.md)

---

## Bölüm 1 — Ölçülebilir Hedefler (Faz 7 Önce / Sonra Tablosu)

Faz 7 doğrulamasında aşağıdaki 8 gösterge doğrudan kaynak kod taraması, `tsc`, `eslint`, Playwright ekran denetimi ve WCAG kontrast ölçümüyle doğrulanacaktır:

| # | Ölçüt | Mevcut Durum (Faz 2 Bulgusu) | Faz 7 Hedefi | Doğrulama Yöntemi |
| --- | --- | --- | --- | --- |
| 1 | **WCAG 2.2 AA Kontrast İhlali Sayısı (`1.4.3`, `1.4.11`)** | 12+ nokta (`#ef4444` üzerinde beyaz metin **3,76:1**; `gray-400`/`slate-400`/`slate-300` **1,48–2,56:1**; `#e5e7eb` form kenarlığı **1,24:1**; `.dark` içinde `#000ce1` **1,96:1**) | **0 ihlal** (açık ve koyu temada normal metin `>= 4,5:1`, etkileşimli kenarlık ve odak halkası `>= 3,0:1`) | Token tablosu hesabı + Playwright/axe-core kontrolü. **Dayanak:** Okul tabletlerinde ve düşük ışıkta okunabilirlik yalnızca sayısal kontrast tabanıyla garanti edilir. |
| 2 | **Türkçe Olmayan / Jargon / Sabit Gömülü Metin Sayısı** | 19+ nokta (`dialog.tsx` `Close`, `breadcrumb.tsx` `More`/`breadcrumb`, `fileValidation.ts` İngilizce hatalar, `UploadDialog` `İdempotency`/`dialogu`, `performance` `Offline Mod`/`Cache-First`, tutarsız `Admin`/`Yönetici`/`Analiz Paneli`) | **0 İngilizce/jargon kullanıcı metni**; tüm admin kullanıcı arayüzü metinleri `src/lib/i18n/tr.json` üzerinden yönetilir | `rg` metin taraması + `tr.json` anahtar kapsam kontrolü. **Dayanak:** Merkezi sözlük sınırı tutarsız adlandırmayı ve teknik jargon sızıntısını önler. |
| 3 | **Klavye ve ARIA Erişim İhlali Sayısı (`2.1.1`, `2.4.7`, `2.4.13`, `4.1.2`)** | 7 kritik/yüksek ihlal (`PasswordChangeDialog` `tabIndex={-1}` ve `aria-label` yok; `RowActions` `DropdownMenuItem` içi `Dialog` + `htmlFor` eksikliği; `AdminDashboardClient` mobilde etiketsiz ikon düğme; `analytics` `focus:ring-0`; `select` `focus:ring-1`) | **0 ihlal** (tüm etkileşimli öğeler klavye erişimli, tek ortak `focus-visible:ring-2 ring-offset-2` halkalı ve `aria-label`/`htmlFor` eşleşmeli) | Klavye Tab/Shift+Tab/Escape testi + DOM/axe taraması. **Dayanak:** Radix diyaloglarının menü dışına alınması ve ortak odak halkası klavye tuzaklarını kaldırır. |
| 4 | **Mobil Yatay Taşma ve Hedef Boyutu İhlali (`2.5.8`)** | 3 görünüm (`MagazineTable` `< 640px` yatay kaydırma, `RowActions` `h-7` 28px tetikleyici, `performance/page.tsx` önbellek listesi sıkışması) + `10px` form etiketleri | **0 yatay taşma** (`375px` ve `320px` genişlikte `scrollWidth <= innerWidth`), tüm etkileşimli hedefler `>= 36×36px`, etiketler `>= 12px` | Playwright `375×812` ve `320×640` görünüm ölçümü. **Dayanak:** Kart/liste kırılımı ve `min-h-9` hedefler mobilde yatay kaydırma ile yanlış dokunmayı bitirir. |
| 5 | **`tr-TR` Tarih, Sayı, Arama ve Sıralama Hatası Sayısı** | 7 dosya/satır (`.toLowerCase()`, localesiz `.localeCompare()`, nokta ondalıklı `.toFixed(1)`/`.toFixed(2)`, localesiz `.toLocaleString()`, `UploadLogs` çift ve her render'da değişen saat, `YYYY-MM-DD` kayma riski) | **0 hata** (`GG.AA.YYYY`, `SS:DD` 24 saat, `1.234,56`, `toLocaleLowerCase('tr-TR')`, `Intl.Collator('tr-TR')` + Türkçe Unicode başlık regex'i) | Birim doğrulaması (`src/lib/formatters/tr.ts`) + `"İSTANBUL"`/`"ışık"`/Türkçe başlık yükleme testi. **Dayanak:** Merkezi `Intl` yardımcıları ve `u`-bayraklı Unicode regex tüm sayı/harf kenar durumlarını tek yerden çözer. |
| 6 | **Modüller Arası Gezinme & Hesap Erişimi Tutarsızlığı** | 3 sayfa kopuk düzende (`performance` `UserMenu` ve `/admin/analytics` bağı yok; `analytics` mobilde `UserMenu` gizli; tutarlı yardım/rehber girişi yok) | **%100 ortak kabuk** (`/admin`, `/admin/analytics`, `/admin/performance` tek tıkla 1 adımda geçiş, mobilde dahil her rotada `UserMenu`, `Tema Değiştir` ve `Kullanım Rehberi` erişilebilir) | Her rotadan masaüstü (`1280×800`) ve mobil (`375×812`) rota kontrolü. **Dayanak:** `WCAG 3.2.6` uyarınca gezinme ve yardım öğeleri her sayfada aynı sırada sabit kalmalıdır. |
| 7 | **Eksik / Kırık Bileşen Durumları** | 6 kırık durum (`RowActions` `formatErrorWithContext` düz nesne yutması, arama sonucu `0` boş durumu yok, `UploadDialog` `1500ms` erken kapanma, `UserMenu` gizlenen çıkış hatası, `useReducedMotion` yok, `performance` sürekli `animate-pulse` ve sabit metin) | **8/8 durum eksiksiz** (varsayılan, hover, odak, devre dışı, yükleniyor iskeleti, hata `role="alert"`, boş durum, başarı Sonner/kalıcı özet) | Senaryo testi (boş arama, yükleme hatası, sürüm çakışması simülasyonu, `prefers-reduced-motion: reduce`). **Dayanak:** Tüm etkileşim durumlarının tanımlı olması kullanıcının belirsizlik yaşamasını engeller. |
| 8 | **İzole Açık / Koyu Tema Kapsamı** | `(admin)` içinde koyu tema yok; `(admin)` sayfaları sabit `#f9f9f9`/`bg-white` kullanıyor ve `globals.css` `.dark` tokenları uyumsuz | **%100 admin rotası** açık/koyu tema destekli; `(public)` sayfalar (`/` ve `/dergi/[sayi]`) açık görünümünde **0 piksel değişim** | Tema anahtarı testi + `/` ve `/dergi/[sayi]` üzerinde `html.admin-theme`/`html.dark` yokluğu kontrolü. **Dayanak:** Kamusal dergi okuyucusu ile editör panelinin tema kapsamını ayırmak geriye dönük görsel regresyonu önler. |

---

## Bölüm 2 — Yeni Bilgi Mimarisi ve Menü Yapısı (Önce / Sonra)

### 2.1 Bilgi Mimarisi Dönüşümü

**Önce (Mevcut Dağınık Yapı):**
```
/admin/login      -> Tam ekran kart, "Ana Sayfa" dönüşü yok, marka işareti yok
/admin            -> Sayfa içi başlıkta [İstatistikler] [Performans] [UserMenu] [Yeni Dergi Ekle]
/admin/analytics  -> Sayfa içi geri oku [<-], "Analiz Paneli", filtre kutusu (mobilde UserMenu gizli!)
/admin/performance-> Tekil "Yönetici Paneli" geri linki, UserMenu YOK, Analytics bağlantısı YOK
(admin)/layout    -> Yalnızca ReactQueryProvider + Suspense (gezinme ve yardım kabuğu yok)
```

**Sonra (Ortak `AdminShell` Mimarisi):**
```
/admin/login      -> AdminShell DIŞINDA (tam ekran ortalı kart + BALKON markası + Ana Sayfa bağlantısı)

/admin/* (giriş hariç tüm rotalar):
┌─────────────────────────────────────────────────────────────────────────┐
│ Üst Çubuk (h-14, sticky top-0):                                         │
│ [☰ Mobil Menü / Daralt] [Sayfa Başlığı + Konum]   [Tema] [Rehber] [Hesap]│
├──────────────┬──────────────────────────────────────────────────────────┤
│ Yan Menü     │ Ana İçerik Alanı (AdminTheme kapsayıcı, bg-background)   │
│ (w-60 / 68px)│                                                          │
│ ──────────── │  • /admin            -> Dergi Sayıları (Tablo + Yükle)   │
│ [BALKON]     │  • /admin/analytics  -> Okunma İstatistikleri            │
│ • Dergi      │  • /admin/performance-> Performans İzleme                │
│   Sayıları   │                                                          │
│ • Okunma     │  [Sağ Çekmece (Sheet/Dialog)]: Türkçe Kullanım Rehberi   │
│   İstatistik │  [driver.js Katmanı]: Etkileşimli Adım Turu              │
│ • Performans │                                                          │
│ ──────────── │                                                          │
│ ↗ Siteyi Gör │                                                          │
│   (/)        │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

- **Karar:** `AdminShell` `src/app/(admin)/layout.tsx` içinde `usePathname()` ile `/admin/login` rotasını dışlayarak sarar; masaüstünde daraltılabilir yan menü (`240px` / `68px`), mobilde (`< 1024px`) erişilebilir çekmece (`Radix Dialog` tabanlı `Sheet`) ve tüm ekran genişliklerinde sabit üst çubuk sunar.
- **Dayanak:** Tek kabuk yapısı her alt sayfada aynı sırayla gezinme, `UserMenu`, tema anahtarı ve `WCAG 3.2.6` uyumlu yardım girişini garanti eder.

### 2.2 Sabit Terim Sözlüğü (Terim Tutarlılığı)

| Eski Karışık Kullanım | Sabitlenmiş Resmi Terim | Kullanıldığı Yerler |
| --- | --- | --- |
| `Admin Girişi` / `Yönetici Paneli` | **`Yönetici Girişi`** / **`Yönetici Paneli`** | Giriş sayfası, tarayıcı başlıkları, hata sınırı |
| `Dergi Yönetimi` | **`Dergi Sayıları`** | Yan menü, `/admin` başlık ve breadcrumb |
| `İstatistikler` / `Analiz Paneli` | **`Okunma İstatistikleri`** | Yan menü, `/admin/analytics` başlık, metadata |
| `Performans` / `Performans İzleme` | **`Performans İzleme`** (menü kısa: **`Performans`**) | Yan menü, `/admin/performance` başlık |
| `Yeni Dergi Ekle` / `dialog` / `idempotency` | **`Yeni Sayı Yükle`** / **`pencere`** / **`Tekrar Yükleme Koruması`** | Yükleme CTA, durum iletileri, rehber |
| *(yok)* | **`Kullanım Rehberi`** / **`Turu Yeniden Başlat`** | Sabit üst çubuk yardım düğmesi ve çekmece |

- **Dayanak:** Tüm menülerde ve sayfa başlıklarında aynı terimi kullanmak kullanıcıların "İstatistikler" ile "Analiz Paneli"ni iki farklı modül sanmasını önler.

---

## Bölüm 3 — Tasarım Sistemi ve Marka Kimliği

### 3.1 İzole Admin Tema Kapsamı (`globals.css` & `AdminThemeProvider`)

`codegraph_explore` ve `rg` taramasıyla kamusal `(public)/` sayfalarının (`Hero`, `HomePage`, `MagazineGrid`, `MagazineCard`, `Footer`, `ErrorDisplay`) `.dark`, `bg-background`, `bg-card`, `text-foreground` veya `--primary` değişkenlerini **kullanmadığı**, yalnızca `src/app/(public)/dergi/[sayi]/page.tsx` sayfasının `Breadcrumb` (`text-foreground`) kullandığı ve kök `src/app/layout.tsx:283` içinde tek `<Toaster />` bulunduğu doğrulandı.

Bu mimari gerçeğe göre izole tema stratejisi şöyle kilitlenmiştir:
1. **`globals.css` içinde `:root` ve `.dark` bloklarına dokunulmaz**; bunların altına yüksek özgüllüklü `.admin-theme` (açık tema token'ları) ve `.admin-theme.dark` (koyu tema token'ları) tanımlanır.
2. **Portal ve Toaster Mirası İçin Kök Sınıf Senkronizasyonu:** Radix `Dialog`/`DropdownMenu`/`Select` portalları, `driver.js` popover'ı ve kök `<Toaster />` doğrudan `document.body` altında mount olduğu için `AdminThemeProvider`:
   - `pathname?.startsWith('/admin')` iken `document.documentElement` üzerine `'admin-theme'` (ve koyu tema seçiliyse `'dark'`) sınıfını ekler;
   - kullanıcı `/admin` dışına (`/`, `/dergi/[sayi]`) çıktığında veya bileşen unmount olduğunda `document.documentElement` üzerinden hem `'admin-theme'` hem `'dark'` sınıfını kaldırır;
   - SSR ilk boyamada sıçrama (FOUC) olmaması için `(admin)/layout.tsx` kök sarmalayıcısına da doğrudan `className="admin-theme ..."` verilir;
   - tercih `localStorage` anahtarı `'balkon_admin_theme'` (`'light' | 'dark'`, varsayılan `'light'`) içinde saklanır.
3. **Tekil Sonner `<Toaster />` Uyumu (`src/components/ui/toaster.tsx`):** `Toaster` bileşeni `MutationObserver` ile `document.documentElement.classList` değişikliklerini izler; `html.admin-theme.dark` aktifken `<Sonner theme="dark" />`, diğer tüm durumlarda `<Sonner theme="light" />` geçirir.

- **Dayanak:** Admin dışı rotalarda `html.admin-theme` ve `html.dark` sınıflarını tamamen kaldırmak kamusal siteyi %100 korurken, admin portallarının (`Dialog`, `DropdownMenu`, `Select`, `driver.js`, `Toaster`) tema token'larını sorunsuz devralmasını sağlar.

### 3.2 WCAG 2.2 AA Açık ve Koyu Renk Paleti

Tüm renk çiftleri W3C bağıl parlaklık formülüyle doğrulanmıştır:

#### Açık Tema (`.admin-theme`) — Balkon Editöryel Açık Paleti

| CSS Değişkeni | Hex Değer | Kullanım | Hesaplanan Kontrast |
| --- | --- | --- | --- |
| `--background` | `#f9f9f9` | Sayfa ana zemini (kamusal Balkon zeminiyle uyumlu) | Referans zemin |
| `--card` / `--popover` | `#ffffff` | Kart, tablo, diyalog ve açılır menü yüzeyi | Referans yüzey |
| `--foreground` / `--card-foreground` | `#18181b` | Ana başlık ve gövde metinleri | `#f9f9f9` üstünde **16,83:1** / `#ffffff` üstünde **17,72:1** (`>= 4,5:1`) |
| `--muted` / `--secondary` | `#f4f4f5` | İkincil yüzeyler, tablo başlık zemini | Yüzey katmanı |
| `--muted-foreground` | `#52525b` | Açıklama, alt başlık, yer tutucu ve yardımcı metin | `#ffffff` üstünde **7,73:1** / `#f9f9f9` üstünde **7,34:1** / `#f4f4f5` üstünde **7,03:1** |
| `--primary` | `#dc2626` | Birincil eylem düğmeleri (Balkon Kırmızısı — AA uyumlu) | `#ffffff` metin ile **4,83:1** (`>= 4,5:1`); hover `#b91c1c` **6,47:1** |
| `--primary-foreground` | `#ffffff` | Birincil düğme metni | `#dc2626` üstünde **4,83:1** |
| `--accent` / `--accent-foreground` | `#f4f4f5` / `#18181b` | `outline`/`ghost`/menü öğesi hover yüzeyi (eski mavi `#3b82f6` hatası düzeltildi) | **16,06:1** |
| `--border` | `#d4d4d8` | Kart ve tablo ayırıcı çizgileri | Yapısal ayırıcı |
| `--input` | `#71717a` | Girdi, seçim kutusu ve `outline` düğme kenarlıkları (`WCAG 1.4.11`) | `#ffffff` üstünde **4,83:1** / `#f9f9f9` üstünde **4,59:1** (`>= 3,0:1`) |
| `--ring` | `#dc2626` | Klavye `:focus-visible` halkası (`2px` + `ring-offset-2`) | `#f9f9f9` üstünde **4,59:1** (`>= 3,0:1`) |
| `--destructive` | `#b91c1c` | Silme ve kritik yıkıcı eylem düğmeleri | `#ffffff` metin ile **6,47:1** |

#### Koyu Tema (`.admin-theme.dark`) — Balkon Kömür / Arduvaz Paleti

| CSS Değişkeni | Hex Değer | Kullanım | Hesaplanan Kontrast |
| --- | --- | --- | --- |
| `--background` | `#0f1115` | Sayfa ana zemini (mevcut okuyucu `.immersive-reader-container` ile aynı ton) | Referans zemin |
| `--card` / `--popover` | `#171a21` / `#1c2029` | Kart, tablo ve diyalog yüzeyleri | Referans yüzey |
| `--foreground` / `--card-foreground` | `#f4f4f5` | Ana başlık ve gövde metinleri | `#0f1115` üstünde **17,19:1** / `#171a21` üstünde **15,84:1** |
| `--muted` / `--secondary` | `#222631` | İkincil yüzeyler, tablo başlık zemini | Yüzey katmanı |
| `--muted-foreground` | `#a1a1aa` | Açıklama, alt başlık ve yer tutucu metin | `#0f1115` üstünde **7,37:1** / `#171a21` üstünde **6,79:1** / `#222631` üstünde **5,90:1** |
| `--primary` | `#dc2626` | Birincil eylem düğmeleri | `#ffffff` metin ile **4,83:1**; kart üstünde kenar kontrastı **3,61:1** (`>= 3,0:1`) |
| `--primary-text` (bağlantı/metin) | `#f87171` | Koyu zeminde kırmızı link ve simge vurgusu | `#171a21` üstünde **6,29:1** (`>= 4,5:1`) |
| `--accent` / `--accent-foreground` | `#272b36` / `#f4f4f5` | `outline`/`ghost`/menü öğesi hover yüzeyi | Yüksek kontrastlı yüzey |
| `--border` | `#2c313d` | Kart ve tablo ayırıcı çizgileri | Yapısal ayırıcı |
| `--input` | `#71717a` | Girdi, seçim ve `outline` düğme kenarlıkları (`WCAG 1.4.11`) | `#171a21` üstünde **3,60:1** / `#0f1115` üstünde **3,91:1** (`>= 3,0:1`) |
| `--ring` | `#f87171` | Klavye `:focus-visible` halkası (`2px` + `ring-offset-2`) | `#0f1115` üstünde **6,83:1** / `#171a21` üstünde **6,29:1** |

#### Semantik Durum Token'ları (Açık & Koyu)

| Durum | Açık Tema (`bg` / `fg` / `border`) | Açık Kontrast | Koyu Tema (`bg` / `fg` / `border`) | Koyu Kontrast |
| --- | --- | --- | --- | --- |
| **Başarı (Success)** | `#f0fdf4` / `#166534` / `#86efac` | **6,81:1** | `#12261c` / `#86efac` / `#166534` | **11,33:1** |
| **Uyarı (Warning)** | `#fffbeb` / `#92400e` / `#fcd34d` | **6,84:1** | `#261d10` / `#fcd34d` / `#92400e` | **11,51:1** |
| **Hata (Error)** | `#fef2f2` / `#991b1b` / `#fca5a5` | **7,60:1** | `#2b1417` / `#fca5a5` / `#991b1b` | **9,11:1** |
| **Bilgi (Info)** | `#eff6ff` / `#1e40af` / `#93c5fd` | **8,01:1** | `#132036` / `#93c5fd` / `#1e40af` | **9,04:1** |

- **Dayanak:** `--primary` rengini `#ef4444`'ten `#dc2626`'ya çekmek ve `.accent` değerini nötr hover yüzeyine dönüştürmek hem Balkon kırmızısı kimliğini korur hem de tüm metin/kenarlık kontrastlarını WCAG 2.2 AA sınırının üzerine taşır.

### 3.3 Tipografi, Boşluk, Yoğunluk ve Hareket Kuralları

- **Tipografi (`Geist` & `Geist Mono`):**
  - Türkçe karakterler (`ç, ğ, ı, İ, ö, ş, ü`) mevcut `Geist` (`latin` / `latin-ext` desteği — gerekirse `subsets: ['latin']` korunup fallback `system-ui` ile kontrol edilir) ve `Geist Mono` üzerinden çizilir; tüm sayı, tarih, saat ve tablo metriklerinde `tabular-nums` zorunludur.
  - Ölçek: Sayfa başlığı `24px–28px` (`text-2xl font-semibold tracking-tight`), bölüm başlığı `18px` (`text-lg font-semibold`), gövde/form girdisi `14px` (`text-sm`), en küçük yardımcı/etiket metni `12px` (`text-xs` — mevcut `text-[10px]` kullanımı kaldırılır).
- **Boşluk ve Yoğunluk (`4px` taban):**
  - Kart içi dolgu `20px–24px` (`p-5 sm:p-6`), form alan arası `16px` (`gap-4`), düğme yüksekliği en az `36px` (`h-9`, mobilde dokunma alanları `h-10` = `40px`).
  - `MagazineTable` kullanıcıya **Yoğunluk (`Rahat` `py-3.5` / `Kompakt` `py-2`)** seçimi sunar; iki modda da satır içi etkileşimli düğme yüksekliği `min-h-9` (`36px`) altına düşmez.
- **Hareket (`emil-design-eng`):**
  - `button.tsx` içinde `transition-all` kaldırılır; yerine `transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97]` kullanılır.
  - Diyalog ve açılır menü girişleri `scale(0.95)` + `opacity: 0` ile başlar, `180ms–200ms` custom `cubic-bezier(0.23, 1, 0.32, 1)` kullanır; `scale(0)` kullanılmaz.
  - `AnalyticsDashboardClient` içindeki `motion@12` (`< 14.2`) animasyonları `useReducedMotion()` kontrolüne bağlanır, `x`/`y` yerine `transform`/`opacity` ve `<= 220ms` süre kullanır; Recharts grafik animasyonu `300ms` (reduced-motion açıkken `0ms`) yapılır.
  - `performance/page.tsx` üzerindeki sürekli `animate-pulse` simgesi kaldırılır.
- **Dayanak:** `250ms` altı bileşen geçişleri ve `prefers-reduced-motion` uyumu algılanan hızı artırırken vestibüler yükü ve `motion@12` kare düşüşlerini engeller.

### 3.4 Bileşen Durumu Matrisi (8 Zorunlu Durum)

| Durum | Görsel ve Erişilebilirlik Sözleşmesi |
| --- | --- |
| **1. Varsayılan (Default)** | Semantik `--card` yüzeyi, `--input` (`>= 3:1`) etkileşimli kenarlık, etken Türkçe etiket. |
| **2. Üzerine Gelme (Hover)** | `@media (hover: hover) and (pointer: fine)` içinde hafif yüzey değişimi (`--accent` / `primary/90`, `150ms ease-out`). |
| **3. Odak (Focus)** | Tüm etkileşimli kontrollerde ortak `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` (`WCAG 2.4.7 & 2.4.13` uyumlu). |
| **4. Devre Dışı (Disabled)** | `disabled:opacity-50 disabled:pointer-events-none`; veri görüntülenen ancak düzenlenemeyen alanlarda (örn. yükleme günlükleri) `disabled` yerine `read-only` tam kontrast kullanılır (`IBM Carbon`). |
| **5. Yükleniyor (Loading)** | Paylaşılan `<AdminLoading />` iskeleti + filtre değişiminde kart/grafik iskeleti; düğme içi işlemde `Loader2` + `aria-busy="true"` + açıklayıcı fiil (`Kaydediliyor`, `Siliniyor`). |
| **6. Hata (Error)** | Form alan altında `role="alert"` (`text-xs`), çoklu/form geneli ve `CONFLICT` hatalarında form üstünde kalıcı `role="alert"` banner (`Sayfayı Yenile` / `Tekrar Dene` ile); kullanıcı girdisi asla silinmez. |
| **7. Boş Durum (Empty)** | İki ayrı bileşen: (a) **İlk Kurulum** (`Empty` bileşeni + `"Henüz dergi sayısı eklenmedi"` + tek birincil CTA `Yeni Sayı Yükle`), (b) **Arama/Filtre Sonucu Yok** (tablo başlığı gizlenir, `"Aramanızla eşleşen dergi bulunamadı"` + odağı arama kutusuna döndüren `Aramayı Temizle`). |
| **8. Başarı (Success)** | Kısa işlemlerde (yeniden adlandırma, silme, şifre değiştirme) tek kök Sonner üzerinden `toast.success(...)`; uzun PDF yükleme tamamlandığında **otomatik kapanmayan** kalıcı başarı özeti (`Sayıyı Görüntüle` + `Yeni Sayı Yükle` + `Kapat`). |

- **Dayanak:** Sekiz durumun tamamını önceden tanımlamak geliştirme sırasında ad-hoc renk ve eksik geri bildirim oluşmasını önler.

---

## Bölüm 4 — Kritik Ekranlar İçin Wireframe'ler

### 4.1 Yönetici Girişi (`/admin/login` — Tam Ekran, Kabuk Dışı)

```
+-------------------------------------------------------------------+
|  [B] BALKON | Dergisi  —  Sezai Karakoç Anadolu Lisesi  [Tema ☀/☾]|
|                                                                   |
|                  +-----------------------------+                  |
|                  |  [B] Yönetici Girişi        |                  |
|                  |  Balkon Dergisi yönetim     |                  |
|                  |  paneline giriş yapın.      |                  |
|                  |                             |                  |
|                  |  [ ! role="alert" Banner ]  |  (hata varsa)    |
|                  |                             |                  |
|                  |  E-posta                    |                  |
|                  |  [ yonetici@okul.edu.tr   ] |                  |
|                  |                             |                  |
|                  |  Şifre                      |                  |
|                  |  [ ••••••••••••••  [👁]   ] |  (klavye erişim) |
|                  |                             |                  |
|                  |  [      Giriş Yap        ]  |  (bg-primary)    |
|                  +-----------------------------+                  |
|                                                                   |
|                    ← Balkon Dergisi Ana Sayfası                   |
+-------------------------------------------------------------------+
```

### 4.2 Gösterge Paneli ve Dergi Tablosu (`/admin`)

**Masaüstü (`>= 1024px`):**
```
+------------------+------------------------------------------------+
| [B] BALKON       | Dergi Sayıları    [☀/☾ Tema] [? Rehber] [👤 ▼] |
|  Yönetici Paneli +------------------------------------------------+
| ---------------- |  Dergi Sayıları                                |
| [■] Dergi Sayıları| Toplam yayınlanan sayılar ve PDF yükleme.     |
| [📊] Okunma İst. |                                                |
| [⚡] Performans  |  [ 🔍 Sayı no veya başlıkla ara...  (X) ]      |
|                  |  [Durum: Tümü ▼] [Yoğunluk: Rahat/Kompakt]     |
|                  |  Toplam 12 sayı            [ + Yeni Sayı Yükle]|
|                  +------------------------------------------------+
|                  | Sayı ↕ | Başlık ↕       | Tarih ↕  | Durum| İşl|
|                  |--------+----------------+----------+------+----|
|                  |  12    | Bahar Özel     | 15.05.26 |Yayında| ⋯ |
|                  |  11    | Kış Edebiyat   | 12.01.26 |Yayında| ⋯ |
|                  |  10    | Cumhuriyet     | 29.10.25 |Taslak | ⋯ |
| ---------------- +------------------------------------------------+
| ↗ Siteyi Gör     |  (Sonuç 0 ise: Tablo gizli -> Empty + Temizle) |
+------------------+------------------------------------------------+
```

**Mobil (`< 640px` — Yatay Taşmasız Kart Görünümü):**
```
+-----------------------------------+
| [☰] BALKON        [☀][?][👤]      |
+-----------------------------------+
| Dergi Sayıları                    |
| [ + Yeni Sayı Yükle (tam en)    ] |
| [ 🔍 Sayı no veya başlık ara... ] |
| [Durum: Tümü ▼]   Toplam 12 sayı  |
|                                   |
| +-------------------------------+ |
| | Sayı 12             [Yayında] | |
| | Bahar Özel Sayısı             | |
| | Yayın: 15.05.2026  • 36 sayfa | |
| | [  İşlemler (min-h-10)     ⋯] | |
| +-------------------------------+ |
| +-------------------------------+ |
| | Sayı 11             [Yayında] | |
| | ...                           | |
+-----------------------------------+
```

### 4.3 Sayı Yükleme & Yeniden Adlandırma / Silme Diyalogları

```
UploadDialog (Otomatik kapanmaz, adım çubuklu):
+----------------------------------------------------+
| Yeni Sayı Yükle                                [X] |
| Adımlar: (1) Bilgiler → (2) PDF İşle → (3) Yükle   |
| -------------------------------------------------- |
| [ ! Özet/Kurtarma Bannerı (varsa) ]                |
| Başlık *        [ Örn: Bahar Özel Sayısı         ] |
| Sayı No *       [ 13 ]  ✓ Sayı numarası uygun      |
| Yayın Tarihi *  [ 21.11.2026 (date input)        ] |
| PDF Dosyası *   [ Dosya Seç ] (Yalnızca dönüştürme,|
|                 maks. 500 MB)                      |
| Kapak (İsteğe)  [ Görsel Seç ] (JPG/PNG/WebP, 10MB)|
| -------------------------------------------------- |
| [ İlerleme: Kapak %100 | Sayfalar 12/24 (%50) ]    |
| [ ▸ İşlem Günlüğü (24 saat SS:DD:sn, açılır/kap.) ]|
| -------------------------------------------------- |
| Tamamlanınca: [✓ Sayı 13 yayına hazır]             |
|   [ Sayıyı Görüntüle ] [ Yeni Yükleme ] [ Kapat ]  |
+----------------------------------------------------+

RowActions (Menüden bağımsız, kontrollü state ile açılan diyaloglar):
[ DropdownMenu: • Yeniden Adlandır  • Sil ]
       |-> Dialog(openRename): [Yeni Sayı No] [Yeni Başlık] [role="alert" Hata + Sayfayı Yenile] [İptal] [Kaydet]
       |-> Dialog(openDelete): "Sayı 12 — 'Bahar Özel' kalıcı olarak silinecek." [Hata + Detay] [İptal] [Kalıcı Sil]
```

### 4.4 Okunma İstatistikleri (`/admin/analytics`)

```
+-------------------------------------------------------------------+
| Üst Çubuk (Ortak AdminShell): Okunma İstatistikleri [☀][?][👤]    |
+-------------------------------------------------------------------+
| [Dergi: Tüm Sayılar ▼] [Aralık: Son 30 Gün ▼]  [Son güncelleme]  |
|                                                                   |
| +-------------+ +-------------+ +-------------+ +---------------+ |
| | Toplam      | | Tekil       | | Etkileşim   | | Genel Toplam  | |
| | İzlenme     | | Ziyaretçi   | | Oranı       | | (Tüm Zamanlar)| |
| | 1.284       | | 642         | | 2,0         | | 14.920        | |
| +-------------+ +-------------+ +-------------+ +---------------+ |
|                                                                   |
| +---------------------------------------+ +---------------------+ |
| | Günlük Okunma Trendi (AreaChart)      | | Cihaz Dağılımı      | |
| | (300ms animasyon, tr-TR eksen)        | | + En Popüler Sayılar| |
| +---------------------------------------+ +---------------------+ |
|                                                                   |
| (Belirli sayı seçiliyse:)                                         |
| +-------------------------------+ +-----------------------------+ |
| | Sayfa Okuma Süreleri (Bar)    | | Okuyucu Düşüş Hunisi (%)    | |
| +-------------------------------+ +-----------------------------+ |
| (Seçili değilse: EmptyStateHint + "Bir sayı seçerek sayfa bazlı   |
|  okuma süresini görün" ipucu)                                     |
+-------------------------------------------------------------------+
```

### 4.5 Performans İzleme (`/admin/performance`)

```
+-------------------------------------------------------------------+
| Üst Çubuk (Ortak AdminShell): Performans İzleme     [☀][?][👤]    |
+-------------------------------------------------------------------+
| Gerçek okuyucu oturumlarından hız ve kararlılık ölçümleri         |
| [Son 24 Saat] [Son 7 Gün (aktif)] [Son 30 Gün]                    |
|                                                                   |
| +-------------------+ +-------------------+ +-------------------+ |
| | Toplam Ölçüm      | | Bütçe Uyumu       | | Çevrimdışı Önbell.| |
| | 1.420 (tabular)   | | 5 / 6 Hedef İçinde| | Servis Etkin      | |
| +-------------------+ +-------------------+ +-------------------+ |
|                                                                   |
| +-------------------------------+ +-----------------------------+ |
| | Metrik Tablosu (Card + Table) | | Hedef Bütçe Kartları        | |
| | LCP | 1.420 kayıt | p75: 1,85s| | LCP (İlk Büyük Görsel) [İyi]| |
| | INP | 980 kayıt   | p75: 110ms| | [======------] 1,85 / 2,50s | |
| | CLS | 1.410 kayıt | p75: 0,04 | |                             | |
| +-------------------------------+ +-----------------------------+ |
|                                                                   |
| +---------------------------------------------------------------+ |
| | Önbellek ve Dosya İşleme Kuralları (mobilde flex-col list)    | |
| +---------------------------------------------------------------+ |
+-------------------------------------------------------------------+
```

### 4.6 Şifre Değiştirme, Hesap Menüsü ve Kullanım Rehberi Çekmecesi

```
UserMenu (Üst çubukta her boyutta görünür):
[ 👤 yonetici@okul.edu.tr ▼ ]
   ├── Giriş yapılan hesap
   ├── Şifre Değiştir  --> PasswordChangeDialog (her 3 alanda klavye erişimli 👁 düğmesi,
   └── Çıkış Yap           role="alert"/"status" mesajları, Sonner toast.success)

Yardım Çekmecesi (Sağdan açılan Sheet/Dialog, [? Rehber] ile açılır):
+------------------------------------+
| Balkon Yönetici Rehberi        [X] |
| [▶ Etkileşimli Turu Başlat]        |
| [Bu Sayfanın Kısa Turu]            |
| ---------------------------------- |
| [ 🔍 Konu ara (ör. PDF, silme) ]   |
| • Yeni sayı nasıl yüklenir?        |
| • Sayı numarası çakışırsa ne olur? |
| • İstatistikler nasıl okunur?      |
| • Performans bütçesi ne demektir?  |
+------------------------------------+
```

---

## Bölüm 5 — Dondurulmuş Paralel Uygulama Sözleşmeleri (Frozen Contracts)

Faz 4–6'da görev alacak üç ajan (`shell-i18n`, `pages-author`, `tour-author`) yalnızca kendi kapsamındaki dosyalara yazar ve aşağıdaki sözleşmeleri değiştirmez.

### 5.1 Dosya Sahipliği Matrisi (Çakışmasız Paralel Sınırlar)

| Ajan | Yazabileceği Dosyalar |
| --- | --- |
| **`shell-i18n`** | `src/app/globals.css`, `src/lib/i18n/tr.json`, `src/lib/i18n/index.ts`, `src/lib/formatters/tr.ts`, `src/components/admin/AdminThemeProvider.tsx`, `src/components/admin/ThemeToggle.tsx`, `src/components/admin/AdminShell.tsx`, `src/app/(admin)/layout.tsx`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/select.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/breadcrumb.tsx`, `src/components/ui/toaster.tsx`, `src/components/ui/empty.tsx` |
| **`pages-author`** | `src/app/(admin)/admin/AdminDashboardClient.tsx`, `src/app/(admin)/admin/MagazineTable.tsx`, `src/app/(admin)/admin/RowActions.tsx`, `src/app/(admin)/admin/UploadDialog.tsx`, `src/app/(admin)/admin/components/UploadForm.tsx`, `src/app/(admin)/admin/components/UploadLogs.tsx`, `src/app/(admin)/admin/UserMenu.tsx`, `src/app/(admin)/admin/PasswordChangeDialog.tsx`, `src/app/(admin)/admin/login/page.tsx`, `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx`, `src/app/(admin)/admin/analytics/page.tsx`, `src/app/(admin)/admin/performance/page.tsx`, `src/app/(admin)/admin/loading.tsx`, `src/app/(admin)/admin/error.tsx`, `src/app/(admin)/admin/page.tsx`, `src/hooks/useUploadProgress.ts`, `src/lib/validators/schemas.ts`, `src/lib/validators/formDataSchemas.ts`, `src/lib/validators/magazineSchemas.ts`, `src/lib/services/MagazineService.ts`, `src/lib/services/fileValidation.ts`, `src/lib/utils/errorMessages.ts`, `src/lib/constants/errorCatalog.ts`, `src/lib/constants/errorMessages.ts`, `src/app/actions/performance-actions.ts` |
| **`tour-author`** | `package.json` (`driver.js@1.14.0` eklenmesi; `pnpm install` orkestratör veya `tour-author` koordinasyonunda), `src/lib/tour/steps.ts`, `src/lib/tour/helpContent.ts`, `src/hooks/useAdminTour.ts`, `src/components/admin/tour/AdminTourProvider.tsx`, `src/components/admin/tour/HelpDrawer.tsx`, `src/components/admin/tour/EmptyStateHint.tsx` |

*(Not: Faz 4'te `shell-i18n` çekirdek i18n/formatlayıcı/tema dosyalarını ve `tour-author` arayüz iskeletini/sözleşmesini tamamladığında `pages-author` doğrudan `t()`, `format*TR()` ve `data-tour` özniteliklerini kullanır.)*

#### Ajanlar Arası Kabuk ve Tema Sözleşmesi (`shell-i18n` ↔ `pages-author` ↔ `tour-author`)
```ts
// src/components/admin/AdminThemeProvider.tsx (shell-i18n)
export type AdminTheme = 'light' | 'dark'
export interface AdminThemeContextValue {
  theme: AdminTheme
  setTheme: (theme: AdminTheme) => void
  toggleTheme: () => void
}
export function useAdminTheme(): AdminThemeContextValue

// src/components/admin/AdminShell.tsx (shell-i18n)
export interface AdminShellProps {
  userEmail?: string
  children: React.ReactNode
}
```
- `src/app/(admin)/layout.tsx` (`shell-i18n`): `getOptionalAuth().catch(() => null)` ile oturumu Redirect olmadan okuyup `userEmail = user?.email ?? ''` değerini `<AdminThemeProvider>` → `<AdminTourProvider userEmail={userEmail}>` → `<AdminShell userEmail={userEmail}>` zincirine aktarır; `/admin/login` rotasında `AdminShell` yan menü ve üst çubuğu gizleyip tam ekran girişi geçirir.
- `AdminShell` üst çubuğunda mevcut `UserMenu` (`export function UserMenu({ userEmail }: { userEmail: string })`) tek noktadan render edilir; `pages-author` `AdminDashboardClient` ve `AnalyticsDashboardClient` içindeki yinelenen `UserMenu` çağrılarını kaldırır ve `UserMenu` imza sözleşmesini korur.
- **Dayanak:** Oturum bilgisini `getOptionalAuth()` ile tek layout noktasında okuyup `UserMenu`'yü kabuğa almak `/admin/login` yönlendirme döngüsünü önler ve tüm alt sayfalarda tek tip hesap menüsü sunar.

### 5.2 i18n ve Formatlayıcı Sözleşmesi

#### Dosyalar
- `src/lib/i18n/tr.json` — Tüm Türkçe UI metinleri
- `src/lib/i18n/index.ts` — Tip-güvenli sözlük yükleyici ve `t()` yardımcısı
- `src/lib/formatters/tr.ts` — Merkezi `tr-TR` biçimlendirme ve arama/sıralama yardımcıları

#### `src/lib/i18n/index.ts` Dışa Aktarım İmzaları
```ts
import tr from './tr.json'

export const SUPPORTED_LOCALES = ['tr-TR'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export type Dictionary = typeof tr

const dictionaries: Record<Locale, Dictionary> = {
  'tr-TR': tr,
}

export const defaultLocale: Locale = 'tr-TR'

// Nokta notasyonlu tip-güvenli anahtar çıkarımı (NestedKeyOf<Dictionary>)
export type TranslationKey = /* ... */ string

export function getDictionary(locale: Locale = defaultLocale): Dictionary
export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
  locale?: Locale
): string
```

#### `src/lib/i18n/tr.json` Üst Düzey Namespace ve Zorunlu Anahtar Sözleşmesi

| Namespace | Zorunlu Alt Anahtarlar (Değiştirilemez) |
| --- | --- |
| `common` | `close`, `cancel`, `save`, `saving`, `delete`, `deleting`, `retry`, `reset`, `clear`, `search`, `loading`, `more`, `backToHome`, `viewSite`, `refreshPage`, `confirm`, `optional`, `required` |
| `nav` | `brandTitle`, `brandSubtitle`, `adminPanel`, `magazines`, `analytics`, `performance`, `guide`, `openMenu`, `closeMenu`, `collapseSidebar`, `expandSidebar`, `breadcrumbLabel` |
| `theme` | `toggleLabel`, `switchToDark`, `switchToLight`, `light`, `dark` |
| `auth` | `loginTitle`, `loginSubtitle`, `emailLabel`, `passwordLabel`, `submit`, `submitting`, `showPassword`, `hidePassword`, `signedInAs`, `logout`, `loggingOut`, `backToPublic` |
| `dashboard` | `title`, `subtitle`, `emptyTitle`, `emptyDescription`, `totalCount` (`"{count} dergi"`), `filteredCount` (`"{filtered} / {total} dergi"`) |
| `magazines` | `searchPlaceholder`, `searchAria`, `clearSearch`, `noResultsTitle`, `noResultsDescription`, `statusFilterLabel`, `statusAll`, `statusPublished`, `statusDraft`, `densityLabel`, `densityComfortable`, `densityCompact`, `colIssue`, `colTitle`, `colDate`, `colPages`, `colStatus`, `colActions`, `sortIssueAria`, `sortTitleAria`, `sortDateAria`, `actionsLabel`, `rename`, `delete`, `renameTitle`, `newIssueLabel`, `newTitleLabel`, `deleteTitle`, `deleteWarning`, `deleteIrreversible`, `confirmDelete`, `renameSuccess`, `deleteSuccess` |
| `upload` | `triggerLabel`, `dialogTitle`, `dialogDescription`, `stepInfo`, `stepProcess`, `stepUpload`, `titleLabel`, `issueLabel`, `issueValid`, `dateLabel`, `pdfLabel`, `pdfHint`, `coverLabel`, `coverHint`, `coverProgress`, `pagesProgress`, `logsTitle`, `wakeLockActive`, `wakeLockFailed`, `completedTitle`, `completedDescription`, `viewMagazine`, `newUpload`, `errorTitle`, `savedPagesProgress`, `savedCoverProgress`, `submitSave`, `submitRetry`, `submitUploading`, `submitCompleted`, `closeWhileBusy` |
| `analytics` | `title`, `liveStatus`, `filterLabel`, `allMagazines`, `selectMagazinePlaceholder`, `range7`, `range30`, `range90`, `range365`, `totalViews`, `uniqueVisitors`, `engagementRate`, `allTimeViews`, `dailyTrendTitle`, `deviceTitle`, `topMagazinesTitle`, `pageDurationTitle`, `funnelTitle`, `selectMagazinePromptTitle`, `selectMagazinePromptBody`, `noPageData`, `viewsUnit` |
| `performance` | `title`, `subtitle`, `range24h`, `range7d`, `range30d`, `totalLogs`, `budgetCompliance`, `offlineCache`, `offlineActive`, `tableTitle`, `p75Note`, `colMetric`, `colSamples`, `colAvg`, `colP75`, `colP95`, `statusGood`, `statusExceeded`, `budgetLabel`, `currentP75Label`, `emptyTitle`, `emptyDescription`, `errorTitle`, `errorDescription`, `policiesTitle`, `metrics` (`LCP`, `FID`, `CLS`, `FCP`, `TTFB`, `INP` Türkçe ad ve hedefleri) |
| `password` | `menuLabel`, `title`, `description`, `currentLabel`, `newLabel`, `confirmLabel`, `submit`, `submitting`, `successMessage` |
| `tour` | `triggerLabel`, `restartLabel`, `drawerTitle`, `drawerSearchPlaceholder`, `startMainTour`, `startPageTour`, `nextBtn`, `prevBtn`, `doneBtn`, `closeLabel`, `progressText` (`"{{current}} / {{total}}"`), `emptyHintCta`, `steps` (`welcome`, `sidebar`, `theme`, `guide`, `userMenu`, `uploadBtn`, `search`, `tableActions`, `analyticsFilters`, `performanceRanges`), `topics` |
| `errors` | `unknown`, `network`, `conflict`, `cleanupWarning`, `retryHint`, `unauthorized`, `logoutFailed`, `analyticsLoadFailed`, `pageAnalyticsLoadFailed`, `sessionStartFailed` |
| `validation` | `titleRequired`, `titleMax`, `titleCharset`, `issueRequired`, `issueRange`, `issueDuplicate`, `dateRequired`, `dateFormat`, `dateInvalid`, `pdfInvalidType`, `pdfInvalidFile`, `pdfSizeLimit`, `coverInvalidType`, `coverSizeLimit`, `emailInvalid`, `passwordRequired`, `passwordMin`, `passwordSame`, `passwordMismatch` |

#### `src/lib/formatters/tr.ts` Dışa Aktarım İmzaları
```ts
export function parseLocalDateTR(input: string | Date | null | undefined): Date | null
export function formatDateTR(input: string | Date | null | undefined): string       // "GG.AA.YYYY" veya "-"
export function formatTimeTR(input: string | Date | null | undefined, includeSeconds?: boolean): string // 24s "SS:DD" / "SS:DD:sn"
export function formatDateTimeTR(input: string | Date | null | undefined): string   // "GG.AA.YYYY SS:DD"
export function formatNumberTR(value: number, options?: Intl.NumberFormatOptions): string // "1.234,56"
export function formatFileSizeTR(bytes: number): string                            // "12,4 MB" / "512 bayt"
export function normalizeSearchTR(value: string): string                           // toLocaleLowerCase('tr-TR') + birleşik nokta temizliği
export function compareTR(a: string, b: string): number                            // Intl.Collator('tr-TR', { sensitivity: 'base', numeric: true })
```

- **Dayanak:** Ajanların birbirinin dosyasını okumadan aynı anahtar ve biçimlendirici imzalarını kullanabilmesi için üst düzey namespace ve fonksiyon sözleşmesi dondurulmuştur.

### 5.3 `data-tour` Seçici Sözleşmesi

| Seçici (`data-tour="..."`) | Yerleştirileceği Bileşen (Sorumlu Ajan) | Göründüğü Rota(lar) | Tur Adımı / Not |
| --- | --- | --- | --- |
| `admin-sidebar` | `AdminShell.tsx` (`shell-i18n`) | `/admin`, `/admin/analytics`, `/admin/performance` | Modüller arası yan menü tanıtımı |
| `theme-toggle` | `ThemeToggle.tsx` (`shell-i18n`) | Tüm `/admin*` sayfaları | Açık / Koyu tema anahtarı |
| `guide-trigger` | `AdminShell.tsx` (`shell-i18n`) | Tüm `/admin*` sayfaları | Kullanım Rehberi çekmecesi ve turu yeniden başlatma |
| `user-menu` | `UserMenu.tsx` (`pages-author`) | `/admin`, `/admin/analytics`, `/admin/performance` | Hesap, şifre değiştirme ve güvenli çıkış |
| `upload-trigger` | `UploadDialog.tsx` (`pages-author`) | `/admin` | Yeni sayı PDF yükleme sihirbazı tetikleyicisi |
| `magazine-search` | `MagazineTable.tsx` (`pages-author`) | `/admin` (sayı > 0 iken) | Türkçe duyarlı arama ve filtre alanı |
| `magazine-table` | `MagazineTable.tsx` (`pages-author`) | `/admin` (sayı > 0 iken) | Sıralama ve satır durum rozetleri |
| `row-actions` | `RowActions.tsx` (`pages-author`) | `/admin` (ilk satırda) | Yeniden adlandırma ve silme menüsü |
| `analytics-filters` | `AnalyticsDashboardClient.tsx` (`pages-author`) | `/admin/analytics` | Sayı ve tarih aralığı seçimi |
| `analytics-kpis` | `AnalyticsDashboardClient.tsx` (`pages-author`) | `/admin/analytics` | 4 temel okunma özeti kartı |
| `analytics-charts` | `AnalyticsDashboardClient.tsx` (`pages-author`) | `/admin/analytics` | Trend, cihaz ve sayfa bazlı huni grafikleri |
| `performance-ranges` | `performance/page.tsx` (`pages-author`) | `/admin/performance` | 24 saat / 7 gün / 30 gün zaman seçimi |
| `performance-budgets` | `performance/page.tsx` (`pages-author`) | `/admin/performance` | Core Web Vitals p75 bütçe kartları ve tablo |

**Eksik Hedef Öğe Kuralı:** `tour-author` tarafından yazılacak adım çözümleyicisi, tur başlamadan önce `document.querySelector('[data-tour="..."]')` kontrolü yapar; örneğin hiç dergi yokken `magazine-search` / `row-actions` DOM'da yoksa adımı hata fırlatmadan sessizce atlar (gerekirse `driver.js` `waitForElement` yerine mevcut DOM filtrelemesi uygulanır).

- **Dayanak:** Veri olmadığında veya farklı bir alt rotadayken eksik seçici yüzünden turun kırılmasını önlemek için her adım dinamik DOM filtrelemesine bağlanır.

### 5.4 Ürün Turu (`driver.js@1.14.0`) ve Rehber Sözleşmesi

- **Paket:** `driver.js` (`^1.14.0`, MIT, 0 bağımlılık) + `'use client'` içinde dinamik `import('driver.js')`.
- **Dosyalar ve Dondurulmuş İmzalar:**
  1. `src/components/admin/tour/AdminTourProvider.tsx`:
     ```ts
     export interface AdminTourProviderProps {
       userEmail?: string
       children: React.ReactNode
     }
     export function AdminTourProvider({ userEmail, children }: AdminTourProviderProps): React.JSX.Element
     ```
     *(Not: İlk oturum açılışında `localStorage` kaydı yoksa ve rota `/admin` ise otomatik turu yalnızca bir kez başlatır; `/admin/login` rotasında asla otomatik tur başlatmaz.)*
  2. `src/hooks/useAdminTour.ts`:
     ```ts
     export type TourPageKey = 'dashboard' | 'analytics' | 'performance' | 'upload'

     export interface UseAdminTourReturn {
       startMainTour: () => void
       restartTour: () => void
       startPageTour: (page: TourPageKey) => void
       openHelpDrawer: () => void
       closeHelpDrawer: () => void
       isHelpDrawerOpen: boolean
       isTourActive: boolean
       hasCompletedMainTour: boolean
     }
     export function useAdminTour(): UseAdminTourReturn
     ```
  3. `src/components/admin/tour/EmptyStateHint.tsx`:
     ```ts
     export interface EmptyStateHintProps {
       title: string
       description: string
       actionLabel?: string
       onAction?: () => void
       tourPage?: TourPageKey
       className?: string
     }
     export function EmptyStateHint(props: EmptyStateHintProps): React.JSX.Element
     ```
  4. **`localStorage` Anahtarları:**
     - Ana tur: `` `balkon_admin_tour_v1:${userEmail ?? 'anon'}` `` (`'completed' | 'dismissed'`)
     - Sayfa mini turları: `` `balkon_admin_tour_page_v1:${userEmail ?? 'anon'}:${page}` `` (`'completed' | 'dismissed'`)
  5. **Erişilebilirlik & Hareket Garantileri (`tour-author` zorunlu uygular):**
     - `window.matchMedia('(prefers-reduced-motion: reduce)').matches` okunarak `animate` ve `smoothScroll` devre dışı bırakılır.
     - `onPopoverRender` içinde popover köküne `role="dialog"`, `aria-labelledby` (başlık id), `aria-describedby` (açıklama id) eklenir; `closeBtnLabel: t('tour.closeLabel')`, `nextBtnText: t('tour.nextBtn')`, `prevBtnText: t('tour.prevBtn')`, `doneBtnText: t('tour.doneBtn')`, `progressText: t('tour.progressText')` kullanılır.
     - `usePathname()` değiştiğinde aktif `driverObj.destroy()` temizlenir; kapanışta odak tetikleyici öğeye geri döner.

- **Dayanak:** Dinamik `driver.js` yüklemesi açılış paketine 0 kB eklerken, dondurulmuş hook imzaları `shell-i18n` ve `pages-author` bileşenlerinin tur kodunu beklemeden paralel yazılmasını sağlar.

---

## Bölüm 6 — İstisnalar, Güvenlik Sınırı ve Sözleşme Koruma Kuralları

1. **Faz 4–6 Kapsam Dışı (Faz 7 "Sonraki Adımlar"a Ertelenenler):**
   - Kök `middleware.ts` dosyasının `src/middleware.ts` konumuna taşınması veya CSP/nonce başlık yapısının değiştirilmesi (auth yönlendirmesi ve mevcut test düzeneği riskine karşı ertelenir).
   - Veritabanı şeması (`magazines`, `user_profiles`, `magazine_views`, `page_engagement`, `performance_metrics`), Supabase RPC/RLS politikaları veya R2/Storage klasör yapısında herhangi bir değişiklik.
   - Server Action / API Route dönüş imzalarının (`Promise<Result<T>>`, `MetricAggregationResult`, `LoginState`, `LogoutState`) veya parametre adlarının değiştirilmesi.
   - Kamusal `(public)/` sayfaları, `FlipbookViewer`, `Header`, `Footer`, `Hero`, `MagazineCard` üzerinde görsel veya davranış değişikliği.
   - Veri silme veya mevcut kayıtları değiştiren herhangi bir script çalıştırma.
2. **Mevcut Sözleşmeleri Bozmadan Yapılacak Kritik Düzeltmeler (`pages-author`):**
   - **Türkçe Başlık Regex'i (`schemas.ts`, `formDataSchemas.ts`, `UploadForm.tsx`):** `TURKISH_TITLE_REGEX = /^[\p{L}\p{N}\s\-.,!?():'"/]+$/u` paylaşılan sabitiyle genişletilir; alan adları ve `MagazineFormData` / `RenameMagazineData` tipleri değişmez.
   - **`RowActions` + `MagazineService` + `errorMessages.ts` Hata Çözümü:** `actions.ts` aynı `Promise<Result<void>>` yapısını döndürmeyi sürdürür. `MagazineService.renameMagazine` ve `deleteMagazine` içinde düz `new Error(...)` fırlatmaları `AppError` alt sınıflarına (`DatabaseError` kodu `'DB_VERSION_CONFLICT'` / `409`, `ValidationError`, `StorageError`) geçirilir ve `src/lib/utils/errorMessages.ts` içindeki `formatErrorWithContext` fonksiyonuna düz serileştirilmiş `{ code, message, userMessage, details? }` nesnelerini çözen dal eklenir; böylece `RowActions` `CONFLICT` ("Sayfayı Yenile"), `VALIDATION` ve `NETWORK` kutuları mevcut `Result` sözleşmesini değiştirmeden yeniden çalışır.
   - **Atıl `ReactQueryProvider`:** Hiçbir admin bileşeni `useQuery`/`useMutation` çağırmadığı için `(admin)/layout.tsx` içinden kaldırılır (`src/providers/ReactQueryProvider.tsx` dosyası silinmez, yalnızca gereksiz istemci sarmalaması çıkarılır; `ponytail` sadeleştirme kuralı).

- **Dayanak:** Güvenlik, şema ve API sınırlarını dondurup yalnızca iç hata sınıflandırmasını ve Unicode doğrulamasını düzeltmek Faz 4–6 paralel uygulamasını regresyon riskinden korur.
