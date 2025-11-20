/**
 * Centralized error messages for the application
 * All error messages should be defined here for consistency and easy localization
 */
export const ERROR_MESSAGES = {
  VALIDATION: {
    MISSING_FIELDS: 'Lütfen tüm zorunlu alanları doldurun',
    INVALID_ISSUE_NUMBER: 'Geçersiz sayı numarası',
    INVALID_DATE: 'Geçerli bir tarih giriniz',
    INVALID_FILE_TYPE: 'Geçersiz dosya tipi',
    INVALID_ID: 'Geçersiz ID formatı',
    FILE_TOO_LARGE: 'Dosya boyutu çok büyük',
    INVALID_FORMAT: 'Geçersiz format'
  },
  DATABASE: {
    FETCH_FAILED: 'Veriler yüklenirken hata oluştu',
    CREATE_FAILED: 'Kayıt oluşturulamadı',
    UPDATE_FAILED: 'Güncelleme başarısız',
    DELETE_FAILED: 'Silme işlemi başarısız',
    GENERIC_ERROR: 'Veritabanı hatası',
    NOT_FOUND: 'Kayıt bulunamadı',
    DUPLICATE_ENTRY: 'Bu kayıt zaten mevcut'
  },
  STORAGE: {
    UPLOAD_FAILED: 'Dosya yüklenemedi',
    DELETE_FAILED: 'Dosya silinemedi',
    LIST_FAILED: 'Dosyalar listelenemedi',
    MOVE_FAILED: 'Dosya taşınamadı',
    COPY_FAILED: 'Dosya kopyalanamadı',
    BUCKET_NOT_FOUND: 'Depolama alanı bulunamadı',
    FILE_NOT_FOUND: 'Dosya bulunamadı'
  },
  AUTH: {
    UNAUTHORIZED: 'Yetkiniz bulunmamaktadır',
    SESSION_EXPIRED: 'Oturumunuz sona erdi',
    LOGIN_REQUIRED: 'Giriş yapmanız gerekiyor',
    INVALID_CREDENTIALS: 'Geçersiz kullanıcı adı veya şifre'
  },
  PROCESSING: {
    PDF_LOAD_FAILED: 'PDF yüklenemedi',
    IMAGE_LOAD_FAILED: 'Görsel yüklenemedi',
    CANVAS_UNAVAILABLE: 'Canvas context alınamadı',
    CONVERSION_FAILED: 'Dönüştürme başarısız',
    UNSUPPORTED_FORMAT: 'Desteklenmeyen dosya formatı',
    PROCESSING_TIMEOUT: 'İşlem zaman aşımına uğradı'
  },
  GENERAL: {
    UNKNOWN_ERROR: 'Bilinmeyen hata oluştu',
    OPERATION_FAILED: 'İşlem başarısız oldu',
    NETWORK_ERROR: 'Ağ bağlantısı hatası',
    SERVER_ERROR: 'Sunucu hatası'
  }
} as const
