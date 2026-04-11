import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ACCOUNT_ID,
  R2_BUCKET_NAME
} = process.env;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID || !R2_BUCKET_NAME) {
  console.error("Hata: Gerekli ortam değişkenleri eksik! (.env.local kontrol edin)");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function configureCORS() {
  console.log(`${R2_BUCKET_NAME} için CORS yapılandırması başlatılıyor...`);

  const corsRules = [
    {
      AllowedHeaders: ["*"],
      AllowedMethods: ["GET", "HEAD"],
      AllowedOrigins: [
        "http://localhost:3000",
        "https://balkondergi.com",
        "https://*.balkondergi.com",
        "https://*.pages.dev",
        "https://*.vercel.app"
      ],
      ExposeHeaders: ["ETag", "Content-Type", "Content-Length"],
      MaxAgeSeconds: 3600,
    },
  ];

  try {
    const command = new PutBucketCorsCommand({
      Bucket: R2_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: corsRules,
      },
    });

    await s3.send(command);
    console.log("✅ Başarılı: CORS politikası Cloudflare R2'ye başarıyla uygulandı.");
    console.log("İzin verilen Originler:", corsRules[0].AllowedOrigins.join(", "));
  } catch (error) {
    console.error("❌ Hata: CORS yapılandırması uygulanırken bir sorun oluştu:");
    console.error(error);
    process.exit(1);
  }
}

configureCORS();
