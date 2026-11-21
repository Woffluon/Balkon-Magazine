# Faz 2 — Admin Paneli Kapsamlı UX, Erişilebilirlik, Güvenlik ve Dil Denetimi (`02-audit.md`)

**Tarih:** 21.11.2026  
**Kapsam:** `src/app/(admin)/`, admin tarafından kullanılan `src/components/ui/*` bileşenleri, `src/lib/toast.ts`, hata katalogları/doğrulayıcılar, upload hook'ları, `middleware.ts` ve `src/lib/services/authorization.ts`.  
**Referans İlkeler:** [Faz 1 Araştırma Raporu](./01-arastirma.md) (NN/g 10 Sezgisel Kural, WCAG 2.2 AA, IBM Carbon, Shopify Polaris, Atlassian Design, Material 3, `emil-design-eng`, `break-ui`, `ask-sonner`, Türkçe UX ve `tr-TR` biçimlendirme kuralları).

---

## 1. Sayfa, Bileşen, Akış ve Rol Envanteri

### 1.1 Rotalar, İş Akışları ve Roller

| Rota / Akış | Dosya | Görev ve Akış | Yetki / Rol | Durum Notu |
| --- | --- | --- | --- | --- |
| `/admin/login` | `src/app/(admin)/admin/login/page.tsx`, `actions.ts`, `layout.tsx` | E-posta + şifre ile giriş, IP hız sınırı (5/15 dk), başarılı girişte `/admin` yönlendirmesi | Herkese açık (`noindex`) | Giriş sonrası `requireAdmin()` değil, yalnızca Auth kontrolüyle `/admin` açılır |
| `/admin` | `src/app/(admin)/admin/page.tsx`, `AdminDashboardClient.tsx` | Tüm dergileri listeleme, arama, sıralama, yeni sayı yükleme, yeniden adlandırma, silme | `requireAdmin()` (`user_profiles.role === 'admin'`) | İstatistik/Performans geçişleri ve `UserMenu` burada |
| `/admin/analytics` | `src/app/(admin)/admin/analytics/page.tsx`, `AnalyticsDashboardClient.tsx` | Tarih aralığı (7/30/90/365 gün) ve sayıya göre izlenme trendi, cihaz dağılımı, sayfa okuma süresi ve düşüş hunisi | `requireAdmin()` | `DynamicAnalyticsDashboard` (`ssr: false`) ile yüklenir |
| `/admin/performance` | `src/app/(admin)/admin/performance/page.tsx` | Core Web Vitals (`LCP`, `FID`, `CLS`, `FCP`, `TTFB`, `INP`) p50/p75/p95 ve bütçe karşılaştırması (`?days=1\|7\|30`) | `requireAdmin()` | Doğrudan SSR tablosu; `UserMenu` ve grafik yok |
| Şifre Değiştirme | `PasswordChangeDialog.tsx`, `password-actions.ts` | Mevcut şifreyle doğrulama + yeni şifre güncelleme, `userId` hız sınırı (5/15 dk) | Oturumlu kullanıcı (`getAuthenticatedClient` + `verifyCSRFOrigin`) | `requireAdmin()` yerine `getAuthenticatedClient()` kullanır |
| Sayı Yükleme (PDF → WebP) | `UploadDialog.tsx`, `UploadForm.tsx`, `UploadLogs.tsx`, `usePDFProcessor.ts`, `useFileUpload.ts`, `actions.ts` | Tarayıcıda PDF sayfalarını `3600px` WebP'ye dönüştürme, kapak işleme, sıralı Server Action yüklemesi, DB upsert | `requireAdmin()` + `verifyCSRFOrigin()` + saatlik 10 yükleme limiti | `UploadDialog` `next/dynamic` ile yüklenir; tamamlamada 1,5 sn sonra otomatik kapanır |

### 1.2 Ölü, Kullanılmayan, Çakışan ve Güvenlik Etkili Dosyalar

| Dosya / Yapı | Durum | Etki ve Bulgu |
| --- | --- | --- |
| `middleware.ts` (proje kökü) | Çalışmıyor (`src/app/` kullanıldığı için Next.js tarafından yok sayılıyor) | `/admin/*` middleware yönlendirmesi, `x-nonce` ve `Content-Security-Policy` başlıkları uygulanmıyor; korumasız istek doğrudan page bileşenine düşüp `<Suspense>` içinde HTTP `200` + `NEXT_REDIRECT` döndürüyor. |
| `src/lib/services/authorization.ts:190-200` | Atıl/eksik (`refreshSessionIfNeeded`) | `getUser()` çağırıp her koşulda `false` döndürüyor; oturum yenileme yapmıyor. |
| `src/app/(admin)/admin/components/UploadProgress.tsx` | Kullanılmayan bileşen (ölü kod) | Projede hiçbir dosyadan import edilmiyor; `UploadForm.tsx:387-398` doğrudan `ProgressBar.tsx` kullanıyor. |
| `src/hooks/useUploadLogs.ts` | Kullanılmayan kanca (ölü kod) | `UploadDialog.tsx` logları `useUploadProgress.ts` içinden alıyor; `useUploadLogs.ts` hiçbir yerde çağrılmıyor. |
| `src/providers/ReactQueryProvider.tsx` (`(admin)/layout.tsx:155`) | Atıl sağlayıcı | Tüm `(admin)` rotalarını sarmalıyor ancak admin bileşenlerinin hiçbiri `useQuery`/`useMutation` çağırmıyor; istemci paketine ek yük ekliyor. |
| `src/lib/constants/errorMessages.ts` vs `errorCatalog.ts` | Çift/çakışan kaynak | İki ayrı sabit hata sözlüğü tutuluyor; ayrıca `src/lib/utils/errorMessages.ts` içindeki `formatErrorWithContext` düz nesne (`Result.error`) aldığında `UNKNOWN` döndürerek `RowActions.tsx` hata dallarını işlevsiz bırakıyor. |
| `src/lib/services/rateLimiting.ts` | Bellek içi (ephemeral) sayaç | Sunucusuz/çoklu örnek ortamlarda soğuk başlatmada sıfırlanır; yalnızca tekil Node sürecinde tutarlıdır. |

---

## 2. Bilgi Mimarisi ve Navigasyon Denetimi

| Sayfa/Bileşen | Sorun | Etkilenen kullanıcı | İhlal edilen ilke | Önem | Çözüm önerisi |
| --- | --- | --- | --- | --- | --- |
| `src/app/(admin)/layout.tsx` | Ortak gezinme kabuğu (yan menü / sabit üst çubuk / içerik haritası) yok; her alt sayfa kendi üst başlık düzenini kuruyor | Tüm yöneticiler | NN/g #4 Tutarlılık, WCAG 3.2.6 Tutarlı Yardım | Yüksek | `(admin)/layout.tsx` içine daraltılabilir yan menü + mobil çekmece (`Sayılar`, `İstatistikler`, `Performans`, `Kullanım Rehberi`), ortak üst çubuk (tema anahtarı, rehber düğmesi, `UserMenu`) ekleyin. |
| `src/app/(admin)/admin/performance/page.tsx:58-70` | `UserMenu` ve `/admin/analytics` bağlantısı yok; kullanıcı oturumunu kapatmak veya şifre değiştirmek için `/admin` sayfasına geri dönmek zorunda | Yöneticiler | NN/g #3 Kontrol ve Özgürlük, Bilgi Mimarisi tutarlılığı | Yüksek | Performans sayfasını ortak admin kabuğu altına alın; her alt sayfada aynı `UserMenu` ve modül menüsünü sunun. |
| `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx:221-223` | `UserMenu` `hidden sm:block` ile `< 640px` ekranlarda tamamen gizleniyor; mobil kullanıcı çıkış yapamıyor veya şifre değiştiremiyor | Mobil/tablet yöneticiler | NN/g #3 Kontrol, Duyarlılık | Yüksek | `UserMenu` bileşenini ortak üst çubukta tüm ekran genişliklerinde erişilebilir tutun. |
| `src/app/(admin)/admin/AdminDashboardClient.tsx:36-47` & `AnalyticsDashboardClient.tsx:173` | Aynı sayfa dashboard'da `İstatistikler`, sekme başlığında `İstatistikler`, sayfa içinde `Analiz Paneli` olarak adlandırılıyor | Danışman öğretmen ve öğrenci editörler | NN/g #4 Tutarlılık ve Standartlar | Orta | Tek bir merkezi terim (`Okunma İstatistikleri`) belirleyip `tr.json` üzerinden tüm menü, başlık ve `metadata.title` alanlarına yayın. |
| `src/app/(admin)/admin/login/page.tsx:36-45` | Giriş ekranında dergi/okul sayfasına (`/` veya yardım bilgisine) dönüş bağlantısı ve marka işareti yok | Yanlışlıkla `/admin` açan kullanıcılar | NN/g #3 Kullanıcı Kontrolü ve Özgürlük | Düşük | Giriş kartı altına `"Balkon Dergisi ana sayfasına dön"` bağlantısı ve marka logosu ekleyin. |
| Kök `middleware.ts` & `src/app/(admin)/layout.tsx:156` | Kök `middleware.ts` çalışmadığı için oturumsuz `/admin/*` isteği `<Suspense>` fallback (`AdminLoading`) gösterdikten sonra istemcide `/admin/login`'e yönleniyor; `AdminLoading` iki farklı yerde (`(admin)/layout.tsx:6` ve `admin/loading.tsx:1`) kopyalanmış | Oturumsuz ziyaretçiler, ekran okuyucu kullanıcıları | Güvenlik mimarisi, Polaris Loading | Yüksek | `middleware.ts` dosyasının `src/middleware.ts` konumuna taşınmasını sonraki faz kapsamına alın ve tek bir paylaşılan iskelet bileşeni kullanın. |

---

## 3. Görsel Tasarım ve Tema Sistemi Denetimi

| Sayfa/Bileşen | Sorun | Etkilenen kullanıcı | İhlal edilen ilke | Önem | Çözüm önerisi |
| --- | --- | --- | --- | --- | --- |
| `src/app/globals.css:57-77` & tüm `(admin)` sayfaları | `.dark` CSS değişkenleri tanımlı ancak admin bileşenleri sabit açık renk sınıfları (`bg-[#f9f9f9]`, `bg-[#f8fafc]`, `bg-white`, `text-gray-900`, `text-slate-900`) kullandığı için koyu tema çalışmıyor; ayrıca panelde tema anahtarı yok | Düşük ışıkta çalışanlar, tema tercihi olanlar | Kapsam gereksinimi (Açık/Koyu tema), Tasarım sistemi token bütünlüğü | Kritik | Admin kökünü `.admin-theme` / `.dark .admin-theme` token kapsamına alıp tüm sabit `bg-white`/`bg-[#f9f9f9]`/`text-gray-*` sınıflarını `bg-background`, `bg-card`, `text-foreground`, `border-border` token'larına taşıyın; üst çubuğa tema anahtarı ekleyin. |
| `src/app/globals.css:39` (`#ef4444`) & `AdminDashboardClient.tsx:49`, `PasswordChangeDialog.tsx:232` | Açık temada beyaz metin (`#ffffff`) üzerinde `--primary: #ef4444` kontrastı **3.76:1** ölçülüyor; `4.5:1` AA sınırının altında kalıyor | Az gören kullanıcılar, tüm yöneticiler | WCAG 2.2 1.4.3 (Minimum Kontrast) | Kritik | `.admin-theme` içinde birincil düğme rengini en az `4.5:1` veren kırmızı tona (ör. `#dc2626` → **4.83:1** veya `#b91c1c` → **6.47:1**) çekin; `#ef4444` rengini yalnızca dekoratif işaret/vurgu ikonlarında kullanın. |
| `src/app/globals.css:57-77` (`.dark` tokenları) | Mevcut `.dark` paleti uyumsuz ve düşük kontrastlı: zemin sıcak kahve (`#17100e`), kart lacivert (`#080e1c`), birincil turuncu (`#ff5600`), vurgu/odak (`#000ce1`, kart üstünde **1.96:1**), kenarlık `#ffffff33` | Koyu tema kullananlar | WCAG 2.2 1.4.11, 2.4.13, Marka Tutarlılığı | Kritik | `.dark .admin-theme` altında nötr koyu arduvaz/kömür zeminler (`#0f1115` / `#171a21`), Balkon kırmızısı vurgu (koyu zeminde AA uyumlu açık kırmızı veya yüksek kontrastlı beyaz metinli `#dc2626`) ve `>= 3:1` kenarlık/odak token'ları tanımlayın. |
| `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx:157,174,279,301,423` & `performance/page.tsx:66,86,137,180` | `text-slate-400` (`#94a3b8` → **2.45–2.56:1**), `text-gray-400` (`#9ca3af` → **2.41–2.54:1**) ve `text-slate-300` (`#cbd5e1` → **1.48:1**) metinleri beyaz ve `#f9f9f9`/`#f8fafc` zeminlerde AA sınırının çok altında | Tüm kullanıcılar, düşük parlaklıklı ekranlar | WCAG 2.2 1.4.3 (Minimum Kontrast) | Kritik | Tüm ikincil metinleri `--muted-foreground` (`>= 4.5:1`, ör. açık temada `#52525b` / `#4b5563`) token'ına bağlayın; `gray-400`/`slate-400`/`slate-300` sınıflarını kaldırın. |
| `src/app/(admin)/admin/login/page.tsx:114` & `UploadDialog.tsx:728` vs `globals.css:39` | Giriş, Kaydet ve Yeniden Adlandır düğmeleri `bg-neutral-900` (siyah), Performans sekmeleri `bg-red-600`, `Yeni Dergi Ekle` ise `--primary` (`#ef4444`) kullanıyor; marka hiyerarşisi dağınık | Tüm yöneticiler | NN/g #4 Tutarlılık, Shopify Polaris CTA hiyerarşisi | Orta | Tüm sayfa ve formlarda birincil eylemi tek `--primary` token'ına (`Button variant="default"`), ikincil eylemleri `outline`/`secondary` varyantlarına bağlayın. |
| `src/app/(admin)/admin/login/page.tsx:37` & `HeaderAnimationWrapper.tsx:42` | Giriş sayfası ve admin panelleri Balkon Dergisi marka işaretini (`BALKON | Dergisi` / `B` amblemi) hiç göstermiyor; giriş kartı `pt-20` nedeniyle dikey merkezden aşağı kayıyor | Yeni editörler | Marka Kimliği, Görsel Hiyerarşi | Düşük | Giriş ve yan menü başlığına Balkon tipografik logosunu ekleyin; `pt-20` yerine gerçek dikey ortalama (`py-12`) uygulayın. |
| `src/app/(admin)/admin/performance/page.tsx:54-298` | Sayfa `Card`, `Table`, `Badge` UI primitiflerini kullanmıyor; kart yarıçapı, tablo dolgu ve başlık tipografisi diğer iki sayfadan kopuk | Tüm yöneticiler | NN/g #4 Tutarlılık, `shadcn/ui` Sistem Birliği | Orta | Performans sayfasını paylaşılan `Card`, `Table`, `Badge` ve `Button` bileşenleriyle yeniden kurun. |

---

## 4. Etkileşim, Form Doğrulama ve Hareket Denetimi

| Sayfa/Bileşen | Sorun | Etkilenen kullanıcı | İhlal edilen ilke | Önem | Çözüm önerisi |
| --- | --- | --- | --- | --- | --- |
| `src/app/(admin)/admin/RowActions.tsx:47-63,193-209` & `src/lib/utils/errorMessages.ts:163-214` | `handleServerActionResult` hata callback'ine düz JSON nesne `{ code, message, userMessage }` iletiyor; `RowActions` bunu `instanceof` bekleyen `formatErrorWithContext` içine gönderdiği için tüm `CONFLICT`, `VALIDATION`, `NETWORK` ve `cleanup` dalları ölü kalıyor ve her hatada sabit `"Beklenmeyen bir hata oluştu."` gösteriliyor | Sayı yeniden adlandıran/silen yöneticiler | NN/g #9 Hata Teşhisi ve Kurtarma, Veri Doğruluğu | Kritik | `RowActions` içinde `error.userMessage` ve `error.code` alanlarını doğrudan işleyin; `MagazineService.renameMagazine` içindeki düz `Error` fırlatmalarını `AppError` alt sınıflarına (`ValidationError` / `DatabaseError`) çevirin. |
| `src/app/(admin)/admin/RowActions.tsx:34-38,179-183` | `<Dialog>` bileşenleri `<DropdownMenuItem asChild>` içine gömülmüş; menü kapandığında diyalog odağı/portal yaşam döngüsü kırılabiliyor ve `menuitem` rolü `<Dialog>` üzerine sızıyor | Klavye, ekran okuyucu ve tüm yöneticiler | Radix UI bileşen sözleşmesi, ARIA | Kritik | Diyalogları `DropdownMenu` dışına taşıyın; menü öğeleri yalnızca `onSelect={() => setOpenRename(true)}` ile kontrollü state tetiklesin. |
| `src/lib/validators/schemas.ts:18` & `formDataSchemas.ts:26,135` | `MagazineSchema` ve `MagazineFormSchema` başlık alanını `/^[a-zA-Z0-9\s\-.,!?]+$/` ile kısıtlıyor; Türkçe harfler (`ç, ğ, ı, İ, ö, ş, ü`) engelleniyor ve `UploadForm` bunu istemcide denetlemediği için tüm PDF sayfaları yüklendikten sonra sunucuda patlıyor | Türkçe dergi başlığı giren her yönetici | NN/g #5 Hata Önleme, Türkçe Dil Uyumu | Kritik | Regex kuralını Türkçe Unicode harfleri ve yaygın noktalama işaretlerini (`[\p{L}\p{N}\s\-.,!?():'"/]+` `u` bayrağı) kabul edecek biçimde güncelleyin ve aynı şemayı `UploadForm` istemci doğrulamasına bağlayın. |
| `src/app/(admin)/admin/RowActions.tsx:16-17,51,197` | `newIssue` ve `newTitle` başlangıç değerleri açılışta senkronize edilmiyor (eski düzenleme iptal edilirse kirli değer kalır); başarılı yeniden adlandırma ve silmede Sonner `toast.success` bildirimi gösterilmiyor | Yöneticiler | NN/g #1 Sistem Durumunun Görünürlüğü, `ask-sonner` | Yüksek | Diyalog `onOpenChange(true)` olduğunda alanları güncel prop'larla sıfırlayın ve başarıda `toast.success(...)` çağırın. |
| `src/app/(admin)/admin/UploadDialog.tsx:441-460` | Yükleme tamamlandığında başarı kutusu ekrana geldikten yalnızca `1500ms` sonra pencere otomatik kapanıp formu sıfırlıyor; kullanıcı özeti okuyamadan ve sonuç günlüğünü göremeden kapanıyor | Yöneticiler | NN/g #1 Sistem Durumu, #3 Kullanıcı Kontrolü | Orta | Otomatik kapatmayı kaldırın; tamamlanma ekranında kalıcı başarı özeti (`Sayıyı Görüntüle` bağlantısı + `Kapat` düğmesi) sunun. |
| `src/app/(admin)/admin/components/UploadForm.tsx:298` | Sayı numarası kutusu temizlendiğinde `Number("")` `0` döndürdüğü için alanda `0` beliriyor; PDF/kapak boyut sınırları alan altında önceden yazmıyor | Yöneticiler | NN/g #5 Hata Önleme, Carbon Forms | Orta | Boş değeri `''` olarak koruyun ve PDF (`500 MB`) / kapak (`JPEG, PNG, WebP · maks. 10 MB`) yardımcı metinlerini alan altına yerleştirin. |
| `src/app/(admin)/admin/UserMenu.tsx:57-60` | `logoutError` açılır menü içinde (`DropdownMenuLabel`) gösteriliyor; `DropdownMenuItem` tıklandığı anda menü kapandığı için çıkış hatası görünmez oluyor | Çıkışta ağ hatası yaşayan yöneticiler | NN/g #9 Hata Görünürlüğü, `ask-sonner` | Orta | Çıkış hatasını menü içi etiket yerine `toast.error(...)` ile bildirin; çıkış sırasında `isPending` durumu gösterin. |
| `src/app/(admin)/admin/login/page.tsx:33` | `useForm` `mode: "onChange"` kullanıyor; kullanıcı henüz 6 karakterlik şifresini yazmayı bitirmeden ilk harfte kırmızı hata mesajı çıkıyor | Giriş yapan tüm yöneticiler | NN/g Errors in Forms | Orta | Doğrulama modunu `onBlur` + `reValidateMode: "onChange"` yapın. |
| `src/app/(admin)/admin/PasswordChangeDialog.tsx:78-84,210-217` | Başarı sonrası `2000ms` timeout temizlenmiyor, başarı/hata banner'ları `role="alert"` içermiyor ve şifre başarıyla değiştiğinde Sonner bildirimi verilmiyor | Şifre güncelleyen yöneticiler | NN/g #1, Erişilebilirlik | Orta | `useEffect` temizliği ekleyin, hata/başarı kutularına `role="alert"`/`role="status"` verin ve `toast.success` ekleyin. |
| `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx:163,263-295,355` & `components/ui/button.tsx:8` | `AnalyticsDashboardClient` `useReducedMotion()` denetlemiyor ve `600ms` gecikmeli `motion.div` animasyonları kullanıyor (`motion@12` `x`/`y` ana iş parçacığında); `button.tsx` `transition-all` kullanıp `:active` basma tepkisi (`scale(0.97)`) içermiyor | Hareket hassasiyeti olanlar, tüm kullanıcılar | `emil-design-eng`, WCAG 2.3.3 | Orta | `useReducedMotion` ekleyin, süreyi `< 250ms` ve yalnızca `transform`/`opacity` ile sınırlayın; `button.tsx` içinde `transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97]` kullanın. |
| `src/components/ui/toaster.tsx:5-14` | `<Toaster />` kök layout'ta doğru biçimde tek kez mount edilmiş ancak `theme` prop'u almıyor; Sonner varsayılan olarak `'light'` kaldığı için koyu temada beyaz kalacaktır | Koyu tema kullanıcıları | `ask-sonner` Theme kuralı | Orta | İstemci tema sağlayıcısı üzerinden çözümlenen `theme` değerini `<Toaster theme={resolvedTheme} />` olarak iletin (yalnızca tek `<Toaster />` korunarak). |

---

## 5. Veri Tabloları Denetimi

| Sayfa/Bileşen | Sorun | Etkilenen kullanıcı | İhlal edilen ilke | Önem | Çözüm önerisi |
| --- | --- | --- | --- | --- | --- |
| `src/app/(admin)/admin/MagazineTable.tsx:30-34,44` | Arama `.toLowerCase()` ve sıralama parametresiz `.localeCompare()` kullandığından Türkçe `İ/ı`, `I/i` ve `ç, ğ, ö, ş, ü` alfabetik sırası bozuluyor (`"İSTANBUL"` `"istanbul"` ile eşleşmez) | Türkçe dergi arayan/sıralayan yöneticiler | `tr-TR` Arama/Sıralama Kuralı, NN/g #2 | Kritik | Aramada `toLocaleLowerCase('tr-TR')`, sıralamada `new Intl.Collator('tr-TR', { sensitivity: 'base', numeric: true })` kullanın. |
| `src/app/(admin)/admin/MagazineTable.tsx:66-74,125-138` | Arama sonucu `0` olduğunda boş `<tbody>` gösteriliyor; "Sonuç bulunamadı" mesajı ve tek tıkla "Aramayı Temizle" düğmesi yok, arama kutusunda temizle (`X`) ikonu yok | Arama yapan yöneticiler | NN/g #1, #3, IBM Carbon & Polaris Empty States | Yüksek | Sıfır sonuç durumunda tabloyu gizleyip (`Carbon` kuralı) `"Aramanızla eşleşen dergi bulunamadı"` mesajı + `"Aramayı Temizle"` düğmesi gösterin. |
| `src/app/(admin)/admin/MagazineTable.tsx:80-142` | Dar ekranlarda (`< 640px`) `min-w-[200px]` yatay kaydırma yaratıyor; `Yayın Tarihi` ve `İşlemler` ekran dışına taşıyor | Mobil/tablet yöneticiler | NN/g Mobile Tables, `break-ui` | Yüksek | `< 640px` kırılımında kart listesi görünümü, `>= 640px` kırılımında tablo görünümü sunun. |
| `src/app/(admin)/admin/MagazineTable.tsx:86-123,128-131` | Sıralanabilir `<th>` öğelerinde `aria-sort` yok, aktif sıralama yönü (artan/azalan ok) belli değil, sayısal sütunlarda `tabular-nums` yok; `max-w-[260px] truncate` uzun başlıklarda tam metni okuma yolu (`title`/tooltip) sunmuyor | Ekran okuyucu kullanıcıları, uzun başlıklı dergi sahipleri | WCAG 1.3.1, `break-ui`, NN/g Data Tables | Orta | `aria-sort` ve aktif yön oku ekleyin, `Sayı No` ve `Yayın Tarihi` sütunlarına `tabular-nums` verin, kesilen başlıklarda tam metni tooltip/kart detayında gösterin. |
| `src/app/(admin)/admin/MagazineTable.tsx:125-138` vs `loading.tsx:50` | `loading.tsx` iskeletinde 5 sütun ve `Durum` rozeti varken gerçek `MagazineTable` 4 sütunlu; `is_published`, `page_count` ve kapak küçük resmi gösterilmiyor | Tüm yöneticiler | Polaris Loading (iskelet-içerik uyumu), Bilgi Zenginliği | Orta | Tabloya yayın durumu (`Yayında` / `Taslak` rozeti) ve sayfa sayısı bilgisini ekleyin; iskeleti gerçek sütunlarla hizalayın. |

---

## 6. Duyarlılık (Mobil / Tablet / Masaüstü) Denetimi

| Sayfa/Bileşen | Sorun | Etkilenen kullanıcı | İhlal edilen ilke | Önem | Çözüm önerisi |
| --- | --- | --- | --- | --- | --- |
| `src/app/(admin)/admin/RowActions.tsx:27-30` | Mobilde `h-7` (`28px`) ve dar `px-2` (`⋯`) tetikleyicisi, ayrıca `UploadForm.tsx` içinde `text-[10px]` etiket/hata metinleri okunabilirlik ve dokunma ergonomisi sınırında | Mobil/tablet yöneticiler | WCAG 2.2 2.5.8 (Minimum Hedef Boyutu), `mobile-native` | Yüksek | Tüm tıklanabilir eylem düğmelerini en az `min-h-9 min-w-9` (`36px+`, mobilde ideal `44px`), form etiket ve metinlerini en az `text-xs sm:text-sm` (`12px–14px`) yapın. |
| `src/app/(admin)/admin/performance/page.tsx:276-293` | Önbellek politikaları listesi `<li className="pt-2 flex justify-between">` kullanıyor ve `flex-wrap` / `gap` içermiyor; `320px–475px` genişlikte sol başlık ile sağ açıklama sıkışıp üst üste biniyor | Mobil yöneticiler | Duyarlı Yerleşim, `break-ui` | Orta | Listeyi `flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4` olarak düzenleyin. |
| `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx:460-476` | `En Popüler Sayılar` listesinde `w-8 h-8` sayı rozetinde `flex-shrink-0` yok ve başlık kutusu `max-w-[120px]` ile sabitlenmiş; dar veya geniş kartlarda alan verimsiz kullanılıyor ve `1000+` sayılarda kutu sıkışabilir | Mobil/masaüstü yöneticiler | `break-ui` (Flex shrink ve min-width: 0) | Orta | Sayı rozetine `shrink-0 min-w-8 px-2` verin, başlık kapsayıcısını `flex-1 min-w-0` yapın ve uzun başlıklara `title` / çoklu satır desteği ekleyin. |
| `src/app/(admin)/admin/AdminDashboardClient.tsx:33-51` | Üst başlık çubuğundaki 4 düğme mobilde dikey tam genişlik (`w-full`) yığılıp ekranın ilk katlanışını (`above-the-fold`) dolduruyor | Mobil yöneticiler | Görsel Hiyerarşi, Mobil Ergonomi | Düşük | Ortak admin üst çubuğunda gezinmeyi çekmece menüye alıp başlıkta yalnızca sayfa adı + tek birincil CTA (`Yeni Sayı Yükle`) bırakın. |

---

## 7. Erişilebilirlik (WCAG 2.2 AA) Denetimi

| Sayfa/Bileşen | Sorun | Etkilenen kullanıcı | İhlal edilen ilke | Önem | Çözüm önerisi |
| --- | --- | --- | --- | --- | --- |
| `src/app/(admin)/admin/AdminDashboardClient.tsx:37-46` | `< 640px` mobilde `İstatistikler` ve `Performans` düğmelerindeki `<span>` metinleri `hidden sm:inline` ile gizleniyor; düğmelerde `aria-label` olmadığı için ekran okuyucu boş düğme okuyor | Görme engelli / ekran okuyucu kullanan mobil kullanıcılar | WCAG 2.2 4.1.2 (Ad, Rol, Değer), 2.4.4 | Kritik | İkon düğmelere `aria-label` ekleyin veya yan menüde tüm ekranlarda metin etiketi gösterin. |
| `src/app/(admin)/admin/PasswordChangeDialog.tsx:134-146,163-175,193-205` | Şifre göster/gizle düğmeleri `tabIndex={-1}` taşıyor ve hiçbir `aria-label` içermiyor; klavye kullanıcısı bu düğmelere hiç ulaşamıyor | Klavye ve ekran okuyucu kullanıcıları | WCAG 2.2 2.1.1 (Klavye), 4.1.2 | Kritik | `tabIndex={-1}` kaldırın ve dinamik `aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}` + `aria-pressed={show}` ekleyin. |
| `src/app/globals.css:49-51` (`#e5e7eb`) & `src/components/ui/input.tsx`, `select.tsx`, `button.tsx` | `--border` / `--input` rengi `#e5e7eb` beyaz kart üzerinde **1.24:1** kontrast üretiyor; girdi alanı ve kenarlıklı düğme sınırları `3:1` eşiğinin altında | Az gören kullanıcılar | WCAG 2.2 1.4.11 (Metin Dışı Kontrast) | Yüksek | Form girdileri ve kontrol çerçeveleri için kenarlık token'ını en az `#94a3b8`/`#71717a` (`>= 3:1`) veya yüksek kontrastlı dolgu ayrımıyla güçlendirin. |
| `src/components/ui/select.tsx:26`, `login/page.tsx:74`, `error.tsx:108`, `ErrorDisplay.tsx:23` | Odak stilleri tutarsız: `select.tsx` `focus:ring-1`, `input.tsx`/`button.tsx` `focus-visible:ring-[3px]`, `login/page.tsx` `focus:ring-2 focus:ring-red-500`, `analytics` `focus:ring-0` (odak halkasını tamamen siliyor!) | Klavye kullanıcıları | WCAG 2.2 2.4.7 (Odak Görünür), 2.4.13 (Odak Görünümü) | Yüksek | `focus:ring-0` kullanımını kaldırın; tüm etkileşimli öğelerde tek ortak `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` standardını uygulayın. |
| `src/components/ui/dialog.tsx:113` & `breadcrumb.tsx:12,113` | Ekran okuyucu metinleri İngilizce (`Close`, `More`, `breadcrumb`) | Türkçe ekran okuyucu kullanıcıları | WCAG 2.2 3.1.2 (Parçaların Dili) | Orta | `tr.json` veya Türkçe sabitlerle `"Kapat"`, `"Daha fazla"` ve `"İçerik haritası"` olarak güncelleyin. |
| `src/app/(admin)/admin/components/UploadForm.tsx:275,289,318,333,360` & `RowActions.tsx:71,82` | `RowActions` içindeki `<label>` öğelerinde `htmlFor` ve input `id` eşleşmesi yok! Ekran okuyucu `Yeni Sayı No` / `Yeni Başlık` etiketlerini input ile ilişkilendiremiyor | Ekran okuyucu ve işaretçi kullanıcıları | WCAG 2.2 1.3.1, 3.3.2 | Yüksek | `RowActions` içinde benzersiz `id` + `Label htmlFor` bağlantısı kurun. |
| `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx:164-170` | Geri dönüş `<Link>` öğesi yalnızca `title="Geri Dön"` kullanıyor, `aria-label` yok | Ekran okuyucu ve dokunmatik kullanıcılar | WCAG 2.2 4.1.2 | Orta | Ortak üst gezinmeye geçin veya `aria-label` + görünür metin ekleyin. |

---

## 8. Performans Algısı Denetimi

| Sayfa/Bileşen | Sorun | Etkilenen kullanıcı | İhlal edilen ilke | Önem | Çözüm önerisi |
| --- | --- | --- | --- | --- | --- |
| `src/app/(admin)/admin/performance/page.tsx:76` | `<Gauge className="animate-pulse" />` başlık ikonu sayfa açık kaldığı sürece kesintisiz yanıp sönüyor; dikkat dağıtıyor ve `prefers-reduced-motion` gözetmiyor | Tüm yöneticiler, vestibüler hassasiyeti olanlar | NN/g #8 Minimalizm, `emil-design-eng`, WCAG 2.3.3 | Orta | Sürekli `animate-pulse` efektini kaldırın; statik ikon kullanın. |
| `src/app/(admin)/admin/performance/page.tsx:147-159` | `"Durum: Aktif ve İzleniyor"` ve `"Servis Çalışanı: Etkin (Offline Mod)"` kartları gerçek tarayıcı/DB durumunu ölçmeden sabit metin yazıyor | Yöneticiler | NN/g #1 Sistem Durumunun Görünürlüğü | Orta | Sabit sahte durum kartları yerine son ölçüm tarihini ve mevcut örneklem/bütçe uyum oranını hesaplayıp gösterin. |
| `src/app/(admin)/admin/UploadDialog.tsx:266-356` & `UploadLogs.tsx:16-34` | Uzun PDF yüklemelerinde adım göstergesi sadece alt log akışında; `UploadLogs.tsx:17` her render'da yeni `new Date()` basarak geçmiş satırların saatini bozuyor ve `useUploadProgress` içindeki saatle çift saat gösteriyor | Çok sayfalı PDF yükleyen yöneticiler | NN/g Designing for Waits, Veri Doğruluğu | Yüksek | Belirgin adım çubuğu (`1. PDF İşleme → 2. Kapak → 3. Sayfalar → 4. Kayıt`) ekleyin; log nesnelerini `{ id, type, message, timestamp }` yapısına geçirerek zaman damgasını yalnızca oluşturulurken bir kez üretin. |
| `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx:315,394,505,559` | Filtre (`days` / `selectedMagazineId`) değiştiğinde üstteki ana kartlar ve grafikler yalnızca `opacity-30` soluklaşmayla bekliyor (`loading` göstergesi belirsiz); Recharts grafikleri `animationDuration={1500}` ile ağır açılıyor | Analitik inceleyen yöneticiler | `emil-design-eng` (< 300ms), Algılanan Hız | Orta | Yükleme sırasında grafik alanlarında belirgin yükleme göstergesi/iskelet sunun ve Recharts animasyon süresini `300ms` (reduced-motion'da `0`) seviyesine düşürün. |

---

## 9. Dil, Yerelleştirme ve Biçimlendirme Envanteri

### 9.1 Türkçe Olmayan, Teknik Jargon ve Sabit Kodlanmış Metinler

*(Not: Listelenen tüm metinler henüz `src/i18n/tr.json` sözlüğüne taşınmamış, doğrudan kod içine gömülüdür.)*

| Dosya ve Satır | Mevcut Metin / Kod | Sorun Türü | Önerilen Türkçe Karşılık |
| --- | --- | --- | --- |
| `src/components/ui/dialog.tsx:113` | `Close` | İngilizce (`sr-only`) | `Kapat` |
| `src/components/ui/breadcrumb.tsx:12` | `aria-label="breadcrumb"` | İngilizce ARIA etiketi | `İçerik haritası` |
| `src/components/ui/breadcrumb.tsx:113` | `More` | İngilizce (`sr-only`) | `Daha fazla` |
| `src/lib/services/fileValidation.ts:70,78,120,125,141,160` | `'Invalid PDF file format'`, `'Failed to read file'`, `'Invalid image file format'`, `'Invalid MIME type...'`, `'File size exceeds limit...'` | İngilizce kullanıcı hata metni | Türkçe dosya doğrulama mesajları (`tr.json` üzerinden) |
| `src/hooks/useFileUpload.ts:166,263,271` | `'Invalid file parameter...'`, `'Invalid server response format'`, `'Upload failed'` | İngilizce hata fırlatması | Türkçe hata sözlüğü anahtarları |
| `src/hooks/usePDFProcessor.ts:89,161` | `'Canvas context unavailable'`, `'Invalid file parameter...'` | İngilizce hata fırlatması | Türkçe hata sözlüğü anahtarları |
| `src/app/actions/performance-actions.ts:79` | `message: error.message` | Ham İngilizce DB hatası sızıntısı | Katalogdan Türkçe hata mesajı |
| `src/app/(admin)/admin/UploadDialog.tsx:194,199,657` | `"...dialogu kapatıp tekrar açın"`, `"İdempotency anahtarı oluşturulamadı"` | Yarı-İngilizce / Geliştirici jargonu | `"...pencereyi kapatıp tekrar açın"`, `"Yükleme oturumu başlatılamadı. Pencereyi kapatıp tekrar açın."` |
| `src/app/(admin)/admin/UploadDialog.tsx:232,240` | `'Ekran kilidi aktif'`, `'Ekran kilidi başarısız oldu, yükleme devam ediyor'` | Teknik terim | `'Ekran uyanık tutuluyor'`, `'Ekran uyanık tutulamadı; yükleme devam ediyor'` |
| `src/app/(admin)/admin/UploadDialog.tsx:377` | `'✨ Veritabanı kaydı başarıyla tamamlandı'` | Resmi olmayan emoji | `'Dergi kaydı veritabanına eklendi'` |
| `src/app/(admin)/admin/components/UploadForm.tsx:49-51` | `${bytes} B`, `${...} KB`, `${...} MB` | İngilizce `B` ve nokta ondalık | `tr-TR` sayı formatıyla `bayt` / `KB` / `MB` |
| `src/app/(admin)/admin/performance/page.tsx:157-158,278-291` | `'Servis Çalışanı'`, `'Etkin (Offline Mod)'`, `'Cache-First'`, `'Stale-While-Revalidate'`, `'görsel cache'`, `'Adaptive Quality'` | İngilizce / karma teknik jargon | `'Çevrimdışı Önbellek'`, `'Etkin'`, sade Türkçe performans açıklamaları |
| `src/app/(admin)/admin/performance/page.tsx:229-234` | `'Largest Contentful Paint (...)'`, `'Interaction to Next Paint (...)'` vb. | İngilizce açılım + teknik terim | Kısaltma (`LCP`, `INP` vb.) korunup yanında anlaşılır Türkçe isim ve hedef |
| `src/app/(admin)/admin/login/page.tsx:40` & `error.tsx:77,119` | `'Admin Girişi'`, `'Admin Panelinde Bir Hata Oluştu'`, `'Admin Paneline Dön'` | `'Yönetici'` ile tutarsız `'Admin'` kullanımı | `'Yönetici Girişi'`, `'Yönetici Panelinde Bir Hata Oluştu'`, `'Yönetici Paneline Dön'` |
| `src/app/(admin)/admin/AdminDashboardClient.tsx:90-91` | `'Henüz dergi bulunmuyor'`, `'Yeni sayılar ekleyerek yönetim panelinizi zenginleştirin...'` | Pasif / pazarlama tonu | `'Henüz dergi sayısı eklenmedi'`, `'İlk sayıyı yüklemek için PDF dosyasını seçin.'` |
| `src/lib/validators/schemas.ts:18` & `formDataSchemas.ts:26,135` | `/^[a-zA-Z0-9\s\-.,!?]+$/` | Türkçe karakterleri (`çğışöü`) reddeden regex | Türkçe Unicode harflerini kabul eden kural |
| `src/lib/utils/errorMessages.ts:65` | `` `${fieldPath}: ${zodIssue.message}` `` | Ham İngilizce alan adları (`new_issue`, `new_title`) | Alan etiketlerinin Türkçe karşılıklarıyla eşlenmesi |
| `src/lib/constants/errorCatalog.ts:433,457` | `https://example.com/file.pdf`, `kullanici@example.com` | İngilizce örnek alan adı | `https://balkondergi.com/...`, `yonetici@balkondergi.com` |
| `src/lib/constants/errorMessages.ts:42` | `'Canvas context alınamadı'` | İngilizce teknik terim | `'Görsel işleme alanı başlatılamadı'` |

### 9.2 `tr-TR` Tarih, Saat, Sayı ve Sıralama Biçimi Envanteri

| Dosya ve Satır | Mevcut Biçim / API | Tespit Edilen Sorun | Hedef `tr-TR` Standardı |
| --- | --- | --- | --- |
| `src/app/(admin)/admin/MagazineTable.tsx:30-34` | `.toLowerCase()` | Türkçe `İ/ı` ve `I/i` eşleşmesini bozuyor | `toLocaleLowerCase('tr-TR')` |
| `src/app/(admin)/admin/MagazineTable.tsx:44` | `.localeCompare(b.title \|\| '')` | Locale belirtilmediğinden Türkçe alfabetik sıralama garantisiz | `new Intl.Collator('tr-TR', { sensitivity: 'base', numeric: true })` |
| `src/app/(admin)/admin/MagazineTable.tsx:131` | `new Date(mag.publication_date).toLocaleDateString('tr-TR')` | `YYYY-MM-DD` tarih dizesi UTC gece yarısı yorumlanıp yerel saat farkıyla bir gün kayabilir; merkezi biçimlendirici yok | Merkezi `formatDateTR` (`Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })`, tarih-only string parse güvenliği) |
| `src/hooks/useUploadProgress.ts:106` & `UploadLogs.tsx:17` | `new Date().toLocaleTimeString('tr-TR')` ve `UploadLogs` içinde yeniden `new Date()` | Çift zaman damgası basılıyor ve önceki satırların saati her render'da değişiyor | Log oluşturulurken tek kez `formatTimeTR` (`hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false`) ile üretilmeli |
| `src/app/(admin)/admin/analytics/AnalyticsDashboardClient.tsx:153,472` | `.toFixed(1)` ve `.toLocaleString()` (localesiz) | Etkileşim oranı nokta (`2.4`) üretiyor; popüler sayılar listesi locale belirtmiyor | `Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })` ve `formatNumberTR` (`1.234,56`) |
| `src/app/(admin)/admin/performance/page.tsx:196,202,207,250` | `.toFixed(2)` ve ham `{totalLogs}`, `{stat.count}`, `{stat.budget}` | Ondalıklar noktalı (`1250.40ms`), binlik ayırıcı (`1.250`) yok | `Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` ve `tabular-nums` |
| `src/app/(admin)/admin/components/UploadForm.tsx:49-51` | `.toFixed(1)` | Dosya boyutu noktalı (`12.4 MB`) görünüyor | `Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })` (`12,4 MB`) |

---

## 10. İlk 10 Öncelikli Sorun

1. **Tema sistemi eksikliği ve WCAG AA kontrast ihlalleri (`globals.css`, tüm `(admin)` sayfaları)** — `.dark` token'ları uyumsuz ve admin bileşenleri sabit açık renklere bağlı olduğundan koyu tema çalışmıyor; ayrıca beyaz metinli `--primary` (`#ef4444`, **3.76:1**) ve `gray-400`/`slate-400` (**2.41–2.56:1**) metinleri WCAG 1.4.3 sınırının altında kalıyor.
2. **`RowActions` çift hata yutma ve `DropdownMenu` + `Dialog` yuvalama hatası (`RowActions.tsx`, `MagazineService.ts`, `errorMessages.ts`)** — `formatErrorWithContext` düz nesne hatasını tanımadığı için sürüm çakışması ve doğrulama hataları kullanıcıya her seferinde `"Beklenmeyen bir hata oluştu"` diye dönüyor; menü içine gömülü diyaloglar odak ve kapanma yaşam döngüsünü bozuyor.
3. **Başlık Zod regex'inin Türkçe karakterleri engellemesi (`schemas.ts`, `formDataSchemas.ts`, `UploadForm.tsx`)** — `/^[a-zA-Z0-9\s\-.,!?]+$/` kuralı `ç, ğ, ı, İ, ö, ş, ü` karakterlerini reddettiği için yönetici PDF sayfalarını tamamen yükledikten sonra sunucuda hata alıyor.
4. **Ortak admin bilgi mimarisi, navigasyon ve yardım girişinin yokluğu (`(admin)/layout.tsx`, `performance/page.tsx`, `AnalyticsDashboardClient.tsx`)** — Her sayfa farklı bir üst düzen kullanıyor, `/admin/performance` ve mobil `/admin/analytics` üzerinde `UserMenu` bulunmuyor ve WCAG 3.2.6 uyumlu tutarlı yardım/rehber girişi yer almıyor.
5. **Türkçe `İ/ı` arama ve `Intl.Collator` sıralama hatası ile boş arama durumu eksikliği (`MagazineTable.tsx`)** — `.toLowerCase()` ve localesiz `.localeCompare()` Türkçe aramayı/sıralamayı bozuyor; eşleşme olmadığında boş tablo gövdesi tek tıkla sıfırlama sunmadan bırakılıyor.
6. **Kritik erişilebilirlik açıkları (`AdminDashboardClient.tsx`, `PasswordChangeDialog.tsx`, `RowActions.tsx`, `select.tsx`)** — Mobilde etiketsiz ikon düğmeler, `tabIndex={-1}` ve `aria-label` eksik şifre göster/gizle düğmeleri, `htmlFor`suz etiketler ve tutarsız `focus-ring` sınıfları klavye ve ekran okuyucu kullanımını engelliyor.
7. **Sabit kodlanmış metinler, İngilizce kalıntılar ve tutarsız `tr-TR` sayı/saat biçimleri (`dialog.tsx`, `breadcrumb.tsx`, `fileValidation.ts`, `UploadLogs.tsx`, `performance/page.tsx`)** — Kullanıcı metinleri tek bir `tr.json` sözlüğünde toplanmadığı için İngilizce hata/ARIA etiketleri, teknik jargon (`İdempotency`, `dialogu`, `Offline Mod`), noktalı ondalıklar ve `UploadLogs` çift zaman damgası hatası oluşuyor.
8. **Mobil tablo yatay taşması ve dokunmatik hedef boyutu riskleri (`MagazineTable.tsx`, `RowActions.tsx`, `UploadForm.tsx`)** — Mobilde zorunlu yatay kaydırma, `h-7` (`28px`) satır düğmeleri ve `10px` form etiketleri dokunmatik ergonomiyi ve WCAG 2.5.8 hedef ölçütünü zorluyor.
9. **Kök `middleware.ts` dosyasının çalışmaması (`middleware.ts`, `authorization.ts`)** — `src/` yapısı nedeniyle kök `middleware.ts` devre dışı kalıyor; `/admin/*` koruması CSP/nonce başlıkları olmadan yalnızca `<Suspense>` içi sayfa yönlendirmesine dayanıyor.
10. **İlerleme/sonuç geri bildirimi ve ölü kod karmaşası (`UploadDialog.tsx`, `UserMenu.tsx`, `UploadProgress.tsx`, `ReactQueryProvider.tsx`)** — Tamamlanan yükleme penceresi 1,5 saniyede kapanıyor, çıkış/yeniden adlandırma/silme Sonner bildirimi tutarsız ve kullanılmayan bileşenler (`UploadProgress.tsx`, `useUploadLogs.ts`) kod tabanında karmaşa yaratıyor.
