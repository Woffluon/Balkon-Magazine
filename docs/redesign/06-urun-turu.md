# Balkon Dergisi Admin Paneli — Etkileşimli Kullanım Rehberi ve Ürün Turu (`06-urun-turu.md`)

**Tarih:** 21.11.2026  
**Kapsam:** `driver.js@^1.14.0` tabanlı etkileşimli adım turları, aranabilir Türkçe yardım çekmecesi (`HelpDrawer`), boş durum ipucu (`EmptyStateHint`) ve `AdminTourProvider` yaşam döngüsü.

---

## 1. Mimari Özet ve Dinamik Yükleme

- **Motor (`driver.js@1.14.0`):** `AdminTourProvider` yalnızca tur gerçekten başlatıldığında istemcide `await import('driver.js')` çağrısıyla yüklenir; ilk sayfa yükleme paketine `0 kB` JS maliyeti ekler. **Dayanak:** `01-arastirma.md` Bölüm 6 uyarınca `/admin/performance` LCP/INP bütçelerini korumak için tur motoru talep anına ertelenir.
- **Tema İzolasyonu (`driver-theme.css`):** `driver.js/dist/driver.css` üzerine `.admin-theme .driver-popover.balkon-tour-popover` seçicileriyle `--popover`, `--popover-foreground`, `--border`, `--input`, `--primary`, `--ring` değişkenleri bağlanır; bu sayede popover açık/koyu admin temasını devralır ve kamusal sayfalara taşmaz. **Dayanak:** Popover `document.body` altında mount olduğu için kök `html.admin-theme` token'larına bağlanmak tema tutarlılığı sağlar.
- **Sağlayıcı ve Hook Sınırı:** `AdminTourContext` ve `useAdminTour()` `src/hooks/useAdminTour.ts` içinde tutulur; `(admin)/layout.tsx` içinde `AdminTourProvider` `AdminShell`'i sarar ve `AdminShell` üst çubuğundaki `Kullanım Rehberi` düğmesi `openHelpDrawer` ile `HelpDrawer`'ı açar. **Dayanak:** Context tanımını hook dosyasında ayırmak `HelpDrawer`, `EmptyStateHint` ve `AdminShell` arasında döngüsel import oluşmasını engeller.
- **Merkezi Sözlük Entegrasyonu (`tr.json`):** Tüm ana tur adımları (`tour.steps.*`), sayfa mini turları (`analyticsKpis`, `analyticsCharts`, `performanceBudgets`, `dashboardTable`, `uploadWorkflow`), yardım konuları (`tour.topics.*`, `tour.securityCategory`) ve klavye kısayol ipuçları (`tour.keyboardHeading`, `tour.shortcuts.*`) `src/lib/i18n/tr.json` üzerinden `t(...)` ile okunur. **Dayanak:** Arayüz metinlerini tek sözlükte toplamak tutarsız Türkçe adlandırmayı ve sabit gömülü metin sapmalarını önler.

---

## 2. Ana Onboarding Turu (9 Adım)

Ana tur (`getMainTourStepDefinitions`) ilk kez `/admin` rotasına giren kullanıcı için otomatik başlar ve `HelpDrawer` içinden `"Etkileşimli Turu Başlat"` / `"Turu Yeniden Başlat"` ile her zaman tekrar açılabilir:

| Sıra | Adım ID | Hedef Seçici (`data-tour`) | Görünen İçerik / Görev | Eksik Hedef Davranışı |
| --- | --- | --- | --- | --- |
| 1 | `welcome` | *(Merkezi kart — seçici yok)* | `tour.steps.welcome` — Yönetici paneline giriş özeti | Her zaman gösterilir |
| 2 | `sidebar` | `[data-tour="admin-sidebar"]` | `tour.steps.sidebar` — Modüller arası yan menü | Mobilde (`< 1024px`) gizli olduğu için atlanır |
| 3 | `theme` | `[data-tour="theme-toggle"]` | `tour.steps.theme` — Açık / Koyu tema anahtarı | Görünür değilse atlanır |
| 4 | `guide` | `[data-tour="guide-trigger"]` | `tour.steps.guide` — Sabit Kullanım Rehberi düğmesi | Görünür değilse atlanır |
| 5 | `user-menu` | `[data-tour="user-menu"]` | `tour.steps.userMenu` — Hesap, şifre değiştirme ve çıkış | Oturum yoksa atlanır |
| 6 | `upload-btn` | `[data-tour="upload-trigger"]` | `tour.steps.uploadBtn` — Temel Görev 1: Yeni Sayı Yükle | `/admin` dışındaysa atlanır |
| 7 | `search` | `[data-tour="magazine-search"]` | `tour.steps.search` — Temel Görev 2: Türkçe arama, durum filtresi, yoğunluk | Dergi sayısı `0` ise atlanır |
| 8 | `table-actions` | `[data-tour="row-actions"]` (yedek: `[data-tour="magazine-table"]`) | `tour.steps.tableActions` — Temel Görev 3: Satır işlemleri ve tablo | Dergi sayısı `0` ise atlanır |
| 9 | `complete-cta` | *(Merkezi kart — seçici yok)* | `tour.steps.completeCta` — İlk göreve yönlendiren bitiş çağrısı | Tablo durumuna göre `descriptionWithItems` / `descriptionEmpty` seçilir |

- **Eksik Hedef Filtrelemesi (`resolveAvailableTourSteps`):** Tur başlatılmadan önce her adımın hedefi `document.querySelectorAll(selector)` ve görünürlük (`display`, `visibility`, `opacity`, `getBoundingClientRect`) üzerinden süzülür; bulunamayan adımlar sessizce atlanır. **Dayanak:** Veri olmadığında veya mobil yan menü gizliyken 0×0 boyutlu hedefe odaklanılmasını ve `{{total}}` adım sayacının şaşmasını önler.

---

## 3. Sayfa Bazlı Mini Turlar (`TourPageKey`)

| `TourPageKey` | Rota / Tetikleyici | Adımlar | Otomatik Başlama |
| --- | --- | --- | --- |
| `'dashboard'` | `/admin` (Yardım çekmecesi veya `EmptyStateHint`) | `upload-trigger`, `magazine-search`, `magazine-table`, `row-actions` | Hayır (ana tur otomatik çalışır) |
| `'analytics'` | `/admin/analytics` (ilk ziyaret veya yardım çekmecesi) | `analytics-filters`, `analytics-kpis`, `analytics-charts` | Evet, 1 kez (hedef DOM görünür olunca) |
| `'performance'` | `/admin/performance` (ilk ziyaret veya yardım çekmecesi) | `performance-ranges`, `performance-budgets` | Evet, 1 kez (hedef DOM görünür olunca) |
| `'upload'` | Yardım çekmecesi konusu veya `EmptyStateHint` | `upload-trigger`, PDF işleme akışı özeti | Hayır (isteğe bağlı tetiklenir) |

- **Dinamik Sayfa Bekleme:** `/admin/analytics` gibi dinamik yüklenen istemci bileşenleri için otomatik mini tur başlatıcısı 300ms aralıklarla en fazla 10 kez DOM hedefi arar; hedefler hazır olduğunda turu açar ve yalnızca kullanıcı turu tamamladığında veya kapattığında kayıt yazar. **Dayanak:** İskelet yükleme ekranı henüz bitmeden boş adım listesiyle turun harcanıp `completed` işaretlenmesini önler.

---

## 4. `data-tour` Seçici Haritası

| Seçici | Bileşen | Sorumlu |
| --- | --- | --- |
| `[data-tour="admin-sidebar"]` | `src/components/admin/AdminShell.tsx` | `shell-i18n` |
| `[data-tour="theme-toggle"]` | `src/components/admin/ThemeToggle.tsx` | `shell-i18n` |
| `[data-tour="guide-trigger"]` | `src/components/admin/AdminShell.tsx` | `shell-i18n` |
| `[data-tour="user-menu"]` | `src/app/(admin)/admin/UserMenu.tsx` | `pages-author` |
| `[data-tour="upload-trigger"]` | `src/app/(admin)/admin/UploadDialog.tsx` | `pages-author` |
| `[data-tour="magazine-search"]` | `src/app/(admin)/admin/MagazineTable.tsx` | `pages-author` |
| `[data-tour="magazine-table"]` | `src/app/(admin)/admin/MagazineTable.tsx` | `pages-author` |
| `[data-tour="row-actions"]` | `src/app/(admin)/admin/RowActions.tsx` | `pages-author` |
| `[data-tour="analytics-filters"]` | `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx` | `pages-author` |
| `[data-tour="analytics-kpis"]` | `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx` | `pages-author` |
| `[data-tour="analytics-charts"]` | `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx` | `pages-author` |
| `[data-tour="performance-ranges"]` | `src/app/(admin)/admin/performance/page.tsx` | `pages-author` |
| `[data-tour="performance-budgets"]` | `src/app/(admin)/admin/performance/page.tsx` | `pages-author` |

---

## 5. Kalıcılık (`localStorage`) ve Rota Kuralları

- **Ana Tur Anahtarı:** `` `balkon_admin_tour_v1:${userEmail || 'anon'}` `` — Değerler: `'completed' | 'dismissed'`.
- **Sayfa Mini Tur Anahtarı:** `` `balkon_admin_tour_page_v1:${userEmail || 'anon'}:${page}` `` — Değerler: `'completed' | 'dismissed'`.
- **`/admin/login` Koruması:** `isLoginPath(pathname)` doğruysa otomatik tur başlatılmaz, `HelpDrawer` mount edilmez ve manuel başlatma çağrıları erken döner. **Dayanak:** Giriş ekranında gereksiz oturum dışı tur açılmasını ve odağın giriş formundan çalınmasını engeller.
- **Rota Değişiminde Temizlik:** `usePathname()` değiştiğinde `driverObj.destroy()` çağrılır (`reason: 'api'`); programatik temizlik `localStorage` kaydını `'dismissed'` olarak işaretlemez. **Dayanak:** Kullanıcının menüden başka sayfaya geçerken görmediği bir turu tamamlanmış saymadan DOM artıklarını temizler.

---

## 6. Erişilebilirlik (`WCAG 2.2 AA`) ve Hareket Kuralları

- **ARIA ve Canlı Duyuru:** `onPopoverRender` içinde popover köküne `role="dialog"`, `aria-modal="false"`, `aria-labelledby`, `aria-describedby` atanır ve provider içindeki `aria-live="polite"` bölgeye aktif adım özeti yazılır. **Dayanak:** `aria-modal="false"` arka plan içeriğinin ekran okuyucudan gizlenme çakışmasını önlerken adım geçişlerinin sesli okunmasını sağlar.
- **Klavye ve Odak Geri Yükleme:** `Esc`, `←` / `→` ve `Tab` kontrolleri açıktır; `HelpDrawer` içinden tur başlatıldığında çekmece önce kapatılıp Radix odak tuzağının boşalması beklenir, tur kapandığında odak tetikleyici öğeye (`guide-trigger` veya önceki odak) geri döner. **Dayanak:** Radix `Dialog` ile `driver.js` odak tuzaklarının çakışıp odağı `document.body`'ye düşürmesini önler.
- **Dokunma Hedefleri ve Kontrast:** `driver-theme.css` kapatma (`×`) ve alt gezinme düğmelerini en az `36×36px` (`2.25rem`) boyutuna, `2px` `--ring` odak halkasına ve `<= 100vw - 1.5rem` mobil genişliğe sabitler. **Dayanak:** `driver.css` varsayılan `28px` buton ve sabit `300px` genişlik değerlerinin `WCAG 2.5.8` ve `320px` mobil ekranlarda kırılmasını engeller.
- **`prefers-reduced-motion`:** Medya sorgusu aktifse `animate: false`, `smoothScroll: false`, `duration: 0` uygulanır ve `driver-theme.css` içindeki tüm animasyon/basma ölçekleri devre dışı bırakılır. **Dayanak:** Hareket hassasiyeti olan kullanıcılarda kaydırma ve geçiş animasyonlarını durdurur.

---

## 7. Yardım Çekmecesi (`HelpDrawer`) ve Arama

- **Konu Arama (`helpContent.ts`):** `getHelpTopics()` verisi `tr.json` `tour.topics.*` ve `tour.securityCategory` metinlerinden okunur; `normalizeSearchTR` (`src/lib/formatters/tr.ts`) ile başlık, özet, kategori ve anahtar kelimeler üzerinde Türkçe büyük/küçük harf duyarsız (`İ/i`, `I/ı`) filtrelenir. **Dayanak:** Yöneticinin `"İSTATİSTİK"` veya `"silme"` yazdığında Türkçe harf uyuşmazlığı yaşamadan doğru rehbere ulaşmasını sağlar.
- **Tur Başlatma, Boş Arama ve Klavye İpuçları:** Çekmece üstünde tam erişilebilir `"Etkileşimli Turu Başlat"` (`tour.startMainTour`) / `"Turu Yeniden Başlat"` (`tour.restartLabel`) ve `"Bu Sayfanın Kısa Turu"` (`tour.startPageTour`) düğmeleri yer alır; eşleşme yoksa odak güvenli `"Aramayı Temizle"` düğmesi gösterilir; alt bölümde `tour.keyboardHeading` ve `tour.shortcuts.*` anahtarlarıyla `Esc`, `← / →`, `Tab / Shift+Tab` ve `Enter / Boşluk` ipuçları sunulur. **Dayanak:** Sık erişilen tur kontrollerini ve klavye kısayollarını çekmece açılışında görünür tutmak yeni editörlerin öğrenme maliyetini azaltır.

---

## 8. Yeni Tur Adımı veya Yardım Konusu Ekleme Rehberi

### Yeni Tur Adımı Ekleme
1. Hedef bileşene benzersiz `data-tour="yeni-hedef"` özniteliği ekleyin (yalnızca ilgili sayfa bileşeninde).
2. `src/lib/i18n/tr.json` içinde `tour.steps.yeniAdim` başlık ve açıklama anahtarlarını tanımlayın.
3. `src/lib/tour/steps.ts` içinde ilgili fonksiyonu (`getMainTourStepDefinitions` veya `getPageTourStepDefinitions`) güncelleyip `{ id, selector: '[data-tour="yeni-hedef"]', title, description, side, align }` nesnesini ekleyin.
4. Adım zorunlu olmayan veya koşullu render edilen bir öğeye bağlıysa `fallbackSelector` tanımlayın ya da koşullu atlama davranışını doğrulayın.

### Yeni Yardım Konusu Ekleme
1. `src/lib/i18n/tr.json` içinde `tour.topics.yeniKonu` (`title`, `summary`) anahtarlarını ekleyin.
2. `src/lib/tour/helpContent.ts` içindeki `getHelpTopics()` dizisine yeni `HelpTopic` kaydını (`id`, `title`, `summary`, `category`, aranabilir Türkçe `keywords`, varsa ilgili `tourPage`) ekleyin.
3. `pnpm type-check` ve `npx eslint` çalıştırıp sözleşme ve Türkçe arama uyuşmasını doğrulayın.
