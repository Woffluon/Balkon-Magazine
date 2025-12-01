/**
 * Error Message Catalog
 * 
 * Comprehensive error message mappings with user-friendly messages in Turkish,
 * technical messages for logging, severity levels, recovery actions, and retry flags.
 * 
 * Requirements:
 * - 4.5: Consistent error code format [CATEGORY]_[SPECIFIC_ERROR]
 * - 4.6: User messages don't expose internal details
 * - 4.7: Multi-step errors indicate progress
 */

/**
 * Error message catalog entry structure
 */
export interface ErrorMessageEntry {
  /** User-friendly message in Turkish (safe to display to end users) */
  userMessage: string
  /** Technical message for logging (may contain internal details) */
  technicalMessage: string
  /** Error severity level for classification and alerting */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** Actionable recovery steps for users */
  recoveryActions: string[]
  /** Whether the error is transient and can be retried */
  isRetryable: boolean
}

/**
 * Error message catalog interface
 * Maps error codes to comprehensive error information
 */
export interface ErrorMessageCatalog {
  [errorCode: string]: ErrorMessageEntry
}

/**
 * Comprehensive error message catalog
 * All error codes follow the format: [CATEGORY]_[SPECIFIC_ERROR]
 */
export const ERROR_CATALOG: ErrorMessageCatalog = {
  // ============================================================================
  // DATABASE ERRORS
  // ============================================================================
  
  DATABASE_CONNECTION_FAILED: {
    userMessage: 'Veritabanına bağlanılamadı. Lütfen daha sonra tekrar deneyin.',
    technicalMessage: 'Database connection failed',
    severity: 'critical',
    recoveryActions: [
      'Birkaç saniye bekleyip tekrar deneyin',
      'İnternet bağlantınızı kontrol edin',
      'Sorun devam ederse destek ekibi ile iletişime geçin'
    ],
    isRetryable: true
  },
  
  DATABASE_QUERY_TIMEOUT: {
    userMessage: 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.',
    technicalMessage: 'Database query timeout',
    severity: 'high',
    recoveryActions: [
      'İşlemi tekrar deneyin',
      'Birkaç dakika bekleyip tekrar deneyin'
    ],
    isRetryable: true
  },
  
  DATABASE_FETCH_FAILED: {
    userMessage: 'Veriler yüklenirken hata oluştu.',
    technicalMessage: 'Database select operation failed',
    severity: 'medium',
    recoveryActions: [
      'Sayfayı yenileyin',
      'Birkaç saniye bekleyip tekrar deneyin'
    ],
    isRetryable: true
  },
  
  DATABASE_CREATE_FAILED: {
    userMessage: 'Kayıt oluşturulamadı.',
    technicalMessage: 'Database insert operation failed',
    severity: 'high',
    recoveryActions: [
      'Girdiğiniz bilgileri kontrol edin',
      'İşlemi tekrar deneyin',
      'Sorun devam ederse destek ekibi ile iletişime geçin'
    ],
    isRetryable: true
  },
  
  DATABASE_UPDATE_FAILED: {
    userMessage: 'Güncelleme başarısız oldu.',
    technicalMessage: 'Database update operation failed',
    severity: 'high',
    recoveryActions: [
      'Değişikliklerinizi kontrol edin',
      'İşlemi tekrar deneyin',
      'Sorun devam ederse destek ekibi ile iletişime geçin'
    ],
    isRetryable: true
  },
  
  DATABASE_DELETE_FAILED: {
    userMessage: 'Silme işlemi başarısız oldu.',
    technicalMessage: 'Database delete operation failed',
    severity: 'high',
    recoveryActions: [
      'İşlemi tekrar deneyin',
      'Kaydın başka bir işlemde kullanılmadığından emin olun',
      'Sorun devam ederse destek ekibi ile iletişime geçin'
    ],
    isRetryable: true
  },
  
  DATABASE_NOT_FOUND: {
    userMessage: 'Aradığınız kayıt bulunamadı.',
    technicalMessage: 'Database record not found',
    severity: 'low',
    recoveryActions: [
      'Kayıt silinmiş veya taşınmış olabilir',
      'Ana sayfaya dönün',
      'Farklı bir kayıt deneyin'
    ],
    isRetryable: false
  },
  
  DATABASE_DUPLICATE_ENTRY: {
    userMessage: 'Bu kayıt zaten mevcut.',
    technicalMessage: 'Database unique constraint violation',
    severity: 'low',
    recoveryActions: [
      'Farklı bir değer deneyin',
      'Mevcut kaydı güncelleyin'
    ],
    isRetryable: false
  },
  
  DATABASE_CONSTRAINT_VIOLATION: {
    userMessage: 'İşlem veri bütünlüğü kurallarını ihlal ediyor.',
    technicalMessage: 'Database constraint violation',
    severity: 'medium',
    recoveryActions: [
      'Girdiğiniz bilgileri kontrol edin',
      'İlişkili kayıtların mevcut olduğundan emin olun'
    ],
    isRetryable: false
  },
  
  DATABASE_TRANSACTION_FAILED: {
    userMessage: 'İşlem tamamlanamadı. Hiçbir değişiklik yapılmadı.',
    technicalMessage: 'Database transaction failed and rolled back',
    severity: 'high',
    recoveryActions: [
      'İşlemi tekrar deneyin',
      'Tüm gerekli bilgilerin doğru olduğundan emin olun'
    ],
    isRetryable: true
  },

  // ============================================================================
  // STORAGE ERRORS
  // ============================================================================
  
  STORAGE_UPLOAD_FAILED: {
    userMessage: 'Dosya yüklenemedi.',
    technicalMessage: 'Storage upload operation failed',
    severity: 'high',
    recoveryActions: [
      'Dosya boyutunu kontrol edin',
      'İnternet bağlantınızı kontrol edin',
      'İşlemi tekrar deneyin'
    ],
    isRetryable: true
  },
  
  STORAGE_DOWNLOAD_FAILED: {
    userMessage: 'Dosya indirilemedi.',
    technicalMessage: 'Storage download operation failed',
    severity: 'medium',
    recoveryActions: [
      'İnternet bağlantınızı kontrol edin',
      'İşlemi tekrar deneyin',
      'Dosyanın mevcut olduğundan emin olun'
    ],
    isRetryable: true
  },
  
  STORAGE_DELETE_FAILED: {
    userMessage: 'Dosya silinemedi.',
    technicalMessage: 'Storage delete operation failed',
    severity: 'high',
    recoveryActions: [
      'İşlemi tekrar deneyin',
      'Dosyanın başka bir işlemde kullanılmadığından emin olun',
      'Sorun devam ederse destek ekibi ile iletişime geçin'
    ],
    isRetryable: true
  },
  
  STORAGE_LIST_FAILED: {
    userMessage: 'Dosyalar listelenemedi.',
    technicalMessage: 'Storage list operation failed',
    severity: 'medium',
    recoveryActions: [
      'Sayfayı yenileyin',
      'İşlemi tekrar deneyin'
    ],
    isRetryable: true
  },
  
  STORAGE_MOVE_FAILED: {
    userMessage: 'Dosya taşınamadı.',
    technicalMessage: 'Storage move operation failed',
    severity: 'high',
    recoveryActions: [
      'Hedef konumun mevcut olduğundan emin olun',
      'İşlemi tekrar deneyin',
      'Dosya adının geçerli olduğundan emin olun'
    ],
    isRetryable: true
  },
  
  STORAGE_COPY_FAILED: {
    userMessage: 'Dosya kopyalanamadı.',
    technicalMessage: 'Storage copy operation failed',
    severity: 'medium',
    recoveryActions: [
      'Yeterli depolama alanı olduğundan emin olun',
      'İşlemi tekrar deneyin'
    ],
    isRetryable: true
  },
  
  STORAGE_FILE_NOT_FOUND: {
    userMessage: 'Dosya bulunamadı.',
    technicalMessage: 'Storage file not found',
    severity: 'low',
    recoveryActions: [
      'Dosya silinmiş veya taşınmış olabilir',
      'Dosya yolunu kontrol edin',
      'Ana sayfaya dönün'
    ],
    isRetryable: false
  },
  
  STORAGE_BUCKET_NOT_FOUND: {
    userMessage: 'Depolama alanı bulunamadı.',
    technicalMessage: 'Storage bucket not found',
    severity: 'critical',
    recoveryActions: [
      'Destek ekibi ile iletişime geçin'
    ],
    isRetryable: false
  },
  
  STORAGE_QUOTA_EXCEEDED: {
    userMessage: 'Depolama alanı dolu.',
    technicalMessage: 'Storage quota exceeded',
    severity: 'critical',
    recoveryActions: [
      'Eski dosyaları silin',
      'Depolama alanınızı yükseltin',
      'Destek ekibi ile iletişime geçin'
    ],
    isRetryable: false
  },
  
  STORAGE_PERMISSION_DENIED: {
    userMessage: 'Bu dosyaya erişim yetkiniz bulunmamaktadır.',
    technicalMessage: 'Storage permission denied',
    severity: 'medium',
    recoveryActions: [
      'Yönetici ile iletişime geçin',
      'Giriş yapın veya oturumunuzu yenileyin'
    ],
    isRetryable: false
  },

  // ============================================================================
  // VALIDATION ERRORS
  // ============================================================================
  
  VALIDATION_MISSING_FIELDS: {
    userMessage: 'Lütfen tüm zorunlu alanları doldurun.',
    technicalMessage: 'Required fields are missing',
    severity: 'low',
    recoveryActions: [
      'Tüm zorunlu alanları doldurun',
      'Kırmızı işaretli alanları kontrol edin'
    ],
    isRetryable: false
  },
  
  VALIDATION_INVALID_FORMAT: {
    userMessage: 'Girdiğiniz bilgi geçerli formatta değil.',
    technicalMessage: 'Input format validation failed',
    severity: 'low',
    recoveryActions: [
      'Girdiğiniz bilgiyi kontrol edin',
      'Doğru formatı kullandığınızdan emin olun'
    ],
    isRetryable: false
  },
  
  VALIDATION_INVALID_ISSUE_NUMBER: {
    userMessage: 'Geçersiz sayı numarası.',
    technicalMessage: 'Magazine issue number validation failed',
    severity: 'low',
    recoveryActions: [
      'Sayı numarasının pozitif bir tam sayı olduğundan emin olun',
      'Farklı bir sayı numarası deneyin'
    ],
    isRetryable: false
  },
  
  VALIDATION_INVALID_DATE: {
    userMessage: 'Geçerli bir tarih giriniz.',
    technicalMessage: 'Date validation failed',
    severity: 'low',
    recoveryActions: [
      'Tarihin doğru formatta olduğundan emin olun',
      'Geçerli bir tarih seçin'
    ],
    isRetryable: false
  },
  
  VALIDATION_INVALID_FILE_TYPE: {
    userMessage: 'Geçersiz dosya tipi.',
    technicalMessage: 'File type validation failed',
    severity: 'low',
    recoveryActions: [
      'Desteklenen dosya formatlarını kontrol edin',
      'Farklı bir dosya deneyin'
    ],
    isRetryable: false
  },
  
  VALIDATION_FILE_TOO_LARGE: {
    userMessage: 'Dosya boyutu çok büyük.',
    technicalMessage: 'File size exceeds maximum allowed',
    severity: 'low',
    recoveryActions: [
      'Daha küçük bir dosya seçin',
      'Dosyayı sıkıştırın',
      'Maksimum dosya boyutunu kontrol edin'
    ],
    isRetryable: false
  },
  
  VALIDATION_INVALID_ID: {
    userMessage: 'Geçersiz ID formatı.',
    technicalMessage: 'ID format validation failed',
    severity: 'low',
    recoveryActions: [
      'Geçerli bir ID kullanın',
      'Ana sayfaya dönün'
    ],
    isRetryable: false
  },
  
  VALIDATION_TITLE_REQUIRED: {
    userMessage: 'Başlık alanı zorunludur. Lütfen bir başlık girin.',
    technicalMessage: 'Title field is required',
    severity: 'low',
    recoveryActions: [
      'Başlık alanını doldurun',
      'En az 1 karakter girin'
    ],
    isRetryable: false
  },
  
  VALIDATION_TITLE_TOO_LONG: {
    userMessage: 'Başlık en fazla 200 karakter olabilir. Lütfen daha kısa bir başlık girin.',
    technicalMessage: 'Title exceeds maximum length of 200 characters',
    severity: 'low',
    recoveryActions: [
      'Başlığı kısaltın',
      'Maksimum 200 karakter kullanın'
    ],
    isRetryable: false
  },
  
  VALIDATION_TITLE_INVALID_CHARACTERS: {
    userMessage: 'Başlık sadece harf, rakam, boşluk ve şu işaretleri içerebilir: - . , ! ? Lütfen özel karakterleri kaldırın.',
    technicalMessage: 'Title contains invalid characters',
    severity: 'low',
    recoveryActions: [
      'Özel karakterleri kaldırın',
      'Sadece harf, rakam ve izin verilen noktalama işaretlerini kullanın'
    ],
    isRetryable: false
  },
  
  VALIDATION_ISSUE_NUMBER_INVALID: {
    userMessage: 'Sayı numarası pozitif bir tam sayı olmalıdır. Lütfen 1 ile 9999 arasında bir sayı girin.',
    technicalMessage: 'Issue number validation failed',
    severity: 'low',
    recoveryActions: [
      '1 ile 9999 arasında bir sayı girin',
      'Ondalık sayı kullanmayın',
      'Negatif sayı kullanmayın'
    ],
    isRetryable: false
  },
  
  VALIDATION_DATE_INVALID_FORMAT: {
    userMessage: 'Yayın tarihi YYYY-AA-GG formatında olmalıdır (örnek: 2024-01-15). Lütfen doğru formatta girin.',
    technicalMessage: 'Publication date format validation failed',
    severity: 'low',
    recoveryActions: [
      'YYYY-AA-GG formatını kullanın',
      'Örnek: 2024-01-15',
      'Tarih seçiciyi kullanın'
    ],
    isRetryable: false
  },
  
  VALIDATION_DATE_INVALID_VALUE: {
    userMessage: 'Yayın tarihi geçerli bir tarih olmalıdır. Lütfen var olan bir tarih girin.',
    technicalMessage: 'Publication date is not a valid date',
    severity: 'low',
    recoveryActions: [
      'Geçerli bir tarih girin',
      'Ay değerinin 1-12 arasında olduğundan emin olun',
      'Gün değerinin o ay için geçerli olduğundan emin olun'
    ],
    isRetryable: false
  },
  
  VALIDATION_URL_INVALID: {
    userMessage: 'Geçerli bir URL giriniz. URL http:// veya https:// ile başlamalıdır.',
    technicalMessage: 'URL format validation failed',
    severity: 'low',
    recoveryActions: [
      'http:// veya https:// ile başlayan bir adres girin',
      'URL formatını kontrol edin',
      'Örnek: https://example.com/file.pdf'
    ],
    isRetryable: false
  },
  
  VALIDATION_PAGE_COUNT_INVALID: {
    userMessage: 'Sayfa sayısı pozitif bir tam sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.',
    technicalMessage: 'Page count validation failed',
    severity: 'low',
    recoveryActions: [
      'Pozitif bir tam sayı girin',
      'Ondalık sayı kullanmayın',
      'En az 1 sayfa olmalıdır'
    ],
    isRetryable: false
  },
  
  VALIDATION_EMAIL_INVALID: {
    userMessage: 'Geçerli bir e-posta adresi girin.',
    technicalMessage: 'Email format validation failed',
    severity: 'low',
    recoveryActions: [
      'E-posta adresini kontrol edin',
      '@ işareti içerdiğinden emin olun',
      'Örnek: kullanici@example.com'
    ],
    isRetryable: false
  },
  
  VALIDATION_PASSWORD_TOO_SHORT: {
    userMessage: 'Şifre en az 6 karakter olmalıdır.',
    technicalMessage: 'Password length validation failed',
    severity: 'low',
    recoveryActions: [
      'Daha uzun bir şifre girin',
      'En az 6 karakter kullanın',
      'Güvenli bir şifre seçin'
    ],
    isRetryable: false
  },

  // ============================================================================
  // AUTHENTICATION & AUTHORIZATION ERRORS
  // ============================================================================
  
  AUTH_INVALID_CREDENTIALS: {
    userMessage: 'Giriş bilgileri hatalı. Lütfen bilgilerinizi kontrol edin.',
    technicalMessage: 'Authentication failed - invalid credentials',
    severity: 'low',
    recoveryActions: [
      'Giriş bilgilerinizi kontrol edin',
      'Büyük/küçük harf duyarlılığına dikkat edin',
      'Erişim sorunu yaşıyorsanız yönetici ile iletişime geçin'
    ],
    isRetryable: false
  },
  
  AUTH_SESSION_EXPIRED: {
    userMessage: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
    technicalMessage: 'Session expired',
    severity: 'medium',
    recoveryActions: [
      'Tekrar giriş yapın'
    ],
    isRetryable: false
  },
  
  AUTH_UNAUTHORIZED: {
    userMessage: 'Bu işlem için yetkiniz bulunmamaktadır.',
    technicalMessage: 'Authorization failed - insufficient permissions',
    severity: 'medium',
    recoveryActions: [
      'Yönetici ile iletişime geçin',
      'Gerekli izinleri talep edin'
    ],
    isRetryable: false
  },
  
  AUTH_LOGIN_REQUIRED: {
    userMessage: 'Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.',
    technicalMessage: 'Authentication required',
    severity: 'low',
    recoveryActions: [
      'Giriş yapın'
    ],
    isRetryable: false
  },
  
  AUTH_TOKEN_INVALID: {
    userMessage: 'Oturum bilgileriniz geçersiz. Lütfen tekrar giriş yapın.',
    technicalMessage: 'Invalid authentication token',
    severity: 'medium',
    recoveryActions: [
      'Tekrar giriş yapın',
      'Çerezleri temizleyin'
    ],
    isRetryable: false
  },

  // ============================================================================
  // PROCESSING ERRORS
  // ============================================================================
  
  PROCESSING_PDF_LOAD_FAILED: {
    userMessage: 'PDF dosyası yüklenemedi.',
    technicalMessage: 'PDF loading failed',
    severity: 'medium',
    recoveryActions: [
      'Dosyanın bozuk olmadığından emin olun',
      'Farklı bir PDF dosyası deneyin',
      'Dosyayı tekrar yükleyin'
    ],
    isRetryable: true
  },
  
  PROCESSING_IMAGE_LOAD_FAILED: {
    userMessage: 'Görsel yüklenemedi.',
    technicalMessage: 'Image loading failed',
    severity: 'low',
    recoveryActions: [
      'İşlemi tekrar deneyin',
      'Sayfayı yenileyin',
      'İnternet bağlantınızı kontrol edin'
    ],
    isRetryable: true
  },
  
  PROCESSING_CONVERSION_FAILED: {
    userMessage: 'Dosya dönüştürme işlemi başarısız oldu.',
    technicalMessage: 'File conversion failed',
    severity: 'high',
    recoveryActions: [
      'İşlemi tekrar deneyin',
      'Dosya formatını kontrol edin',
      'Farklı bir dosya deneyin',
      'Destek ekibi ile iletişime geçin'
    ],
    isRetryable: true
  },
  
  PROCESSING_TIMEOUT: {
    userMessage: 'İşlem zaman aşımına uğradı.',
    technicalMessage: 'Processing operation timeout',
    severity: 'medium',
    recoveryActions: [
      'İşlemi tekrar deneyin',
      'Daha küçük bir dosya deneyin'
    ],
    isRetryable: true
  },
  
  PROCESSING_UNSUPPORTED_FORMAT: {
    userMessage: 'Desteklenmeyen dosya formatı.',
    technicalMessage: 'Unsupported file format',
    severity: 'low',
    recoveryActions: [
      'Desteklenen formatları kontrol edin',
      'Dosyayı desteklenen bir formata dönüştürün'
    ],
    isRetryable: false
  },
  
  PROCESSING_CANVAS_UNAVAILABLE: {
    userMessage: 'Görsel işleme hatası oluştu.',
    technicalMessage: 'Canvas context unavailable',
    severity: 'medium',
    recoveryActions: [
      'Sayfayı yenileyin ve tekrar deneyin',
      'Tarayıcınızı güncelleyin',
      'Farklı bir tarayıcı deneyin'
    ],
    isRetryable: true
  },

  // ============================================================================
  // NETWORK ERRORS
  // ============================================================================
  
  NETWORK_CONNECTION_FAILED: {
    userMessage: 'İnternet bağlantısı kurulamadı.',
    technicalMessage: 'Network connection failed',
    severity: 'high',
    recoveryActions: [
      'İnternet bağlantınızı kontrol edin',
      'Birkaç saniye bekleyip tekrar deneyin',
      'Ağ ayarlarınızı kontrol edin'
    ],
    isRetryable: true
  },
  
  NETWORK_TIMEOUT: {
    userMessage: 'Bağlantı zaman aşımına uğradı.',
    technicalMessage: 'Network request timeout',
    severity: 'medium',
    recoveryActions: [
      'İşlemi tekrar deneyin',
      'İnternet bağlantınızı kontrol edin'
    ],
    isRetryable: true
  },
  
  NETWORK_RATE_LIMIT: {
    userMessage: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.',
    technicalMessage: 'Rate limit exceeded',
    severity: 'medium',
    recoveryActions: [
      'Birkaç dakika bekleyin',
      'İşlemi daha sonra tekrar deneyin'
    ],
    isRetryable: true
  },

  // ============================================================================
  // MULTI-STEP OPERATION ERRORS
  // ============================================================================
  
  OPERATION_UPLOAD_PARTIAL_FAILURE: {
    userMessage: 'Yükleme kısmen tamamlandı. Bazı dosyalar yüklenemedi.',
    technicalMessage: 'Upload operation completed with partial failures',
    severity: 'medium',
    recoveryActions: [
      'Başarılı yüklemeleri kontrol edin',
      'Başarısız dosyaları tekrar yükleyin',
      'Hata detaylarını ve ilerleme durumunu inceleyin'
    ],
    isRetryable: true
  },
  
  OPERATION_DELETE_PARTIAL_FAILURE: {
    userMessage: 'Silme işlemi kısmen tamamlandı. Bazı dosyalar silinemedi.',
    technicalMessage: 'Delete operation completed with partial failures',
    severity: 'high',
    recoveryActions: [
      'Hangi dosyaların silindiğini kontrol edin',
      'Başarısız silme işlemlerini tekrar deneyin',
      'İlerleme durumunu inceleyin',
      'Sorun devam ederse destek ekibi ile iletişime geçin'
    ],
    isRetryable: true
  },
  
  OPERATION_RENAME_PARTIAL_FAILURE: {
    userMessage: 'Yeniden adlandırma kısmen tamamlandı. Bazı dosyalar taşınamadı.',
    technicalMessage: 'Rename operation completed with partial failures',
    severity: 'medium',
    recoveryActions: [
      'Hangi dosyaların taşındığını kontrol edin',
      'Başarısız dosyaları manuel olarak yeniden adlandırın',
      'İlerleme durumunu inceleyin',
      'İşlemi tekrar deneyin'
    ],
    isRetryable: true
  },
  
  OPERATION_ROLLBACK_REQUIRED: {
    userMessage: 'İşlem başarısız oldu. Değişiklikler geri alındı.',
    technicalMessage: 'Operation failed and required rollback',
    severity: 'high',
    recoveryActions: [
      'İşlemi tekrar deneyin',
      'Tüm gereksinimlerin karşılandığından emin olun'
    ],
    isRetryable: true
  },

  // ============================================================================
  // GENERAL ERRORS
  // ============================================================================
  
  GENERAL_UNKNOWN_ERROR: {
    userMessage: 'Beklenmeyen bir hata oluştu.',
    technicalMessage: 'Unknown error occurred',
    severity: 'high',
    recoveryActions: [
      'Sayfayı yenileyin',
      'İşlemi tekrar deneyin',
      'Sorun devam ederse destek ekibi ile iletişime geçin'
    ],
    isRetryable: true
  },
  
  GENERAL_OPERATION_FAILED: {
    userMessage: 'İşlem başarısız oldu.',
    technicalMessage: 'Operation failed',
    severity: 'medium',
    recoveryActions: [
      'İşlemi tekrar deneyin',
      'Girdiğiniz bilgileri kontrol edin'
    ],
    isRetryable: true
  },
  
  GENERAL_SERVER_ERROR: {
    userMessage: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
    technicalMessage: 'Internal server error',
    severity: 'critical',
    recoveryActions: [
      'Birkaç dakika bekleyin',
      'İşlemi tekrar deneyin',
      'Sorun devam ederse destek ekibi ile iletişime geçin'
    ],
    isRetryable: true
  },
  
  GENERAL_SERVICE_UNAVAILABLE: {
    userMessage: 'Servis şu anda kullanılamıyor.',
    technicalMessage: 'Service unavailable',
    severity: 'critical',
    recoveryActions: [
      'Birkaç dakika bekleyin',
      'Daha sonra tekrar deneyin'
    ],
    isRetryable: true
  },
  
  GENERAL_MAINTENANCE: {
    userMessage: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
    technicalMessage: 'System under maintenance',
    severity: 'medium',
    recoveryActions: [
      'Birkaç dakika sonra tekrar deneyin',
      'Bakım tamamlanana kadar bekleyin',
      'Duyurular için web sitesini kontrol edin'
    ],
    isRetryable: true
  }
}

/**
 * Helper function to get error message entry by code
 * Returns a default entry if code is not found
 * @param errorCode - The error code to look up
 * @returns Error message entry
 */
export function getErrorEntry(errorCode: string): ErrorMessageEntry {
  return ERROR_CATALOG[errorCode] || {
    userMessage: 'Bir hata oluştu.',
    technicalMessage: `Unknown error code: ${errorCode}`,
    severity: 'medium',
    recoveryActions: [
      'Sayfayı yenileyin',
      'İşlemi tekrar deneyin',
      'Destek ekibi ile iletişime geçin'
    ],
    isRetryable: true
  }
}

/**
 * Helper function to get all error codes by category
 * @param category - The error category prefix (e.g., 'DATABASE', 'STORAGE')
 * @returns Array of error codes in that category
 */
export function getErrorCodesByCategory(category: string): string[] {
  return Object.keys(ERROR_CATALOG).filter(code => code.startsWith(`${category}_`))
}

/**
 * Helper function to get all retryable error codes
 * @returns Array of retryable error codes
 */
export function getRetryableErrorCodes(): string[] {
  return Object.entries(ERROR_CATALOG)
    .filter(([, entry]) => entry.isRetryable)
    .map(([code]) => code)
}

/**
 * Helper function to get error codes by severity
 * @param severity - The severity level to filter by
 * @returns Array of error codes with that severity
 */
export function getErrorCodesBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): string[] {
  return Object.entries(ERROR_CATALOG)
    .filter(([, entry]) => entry.severity === severity)
    .map(([code]) => code)
}
