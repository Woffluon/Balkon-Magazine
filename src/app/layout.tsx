import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { env } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Balkon Dergisi - Sezai Karakoç Anadolu Lisesi Öğrenci Dergisi',
    template: '%s | Balkon Dergisi',
  },
  description: 'Sezai Karakoç Anadolu Lisesi Balkon Dergisi: Öğrencilerin yaratıcılıklarını geliştiren, okuma-yazma becerilerini güçlendiren dijital platform. "Şu içimizin de balkonu olsaydı, çıkıp arada nefes alsaydık." felsefesiyle öğrenci hikayeleri, şiirleri, röportajlar, bilim köşesi ve sanat-kültür içerikleriyle dönemlik yayın.',
  keywords: [
    'sezai karakoç anadolu lisesi',
    'balkon dergisi',
    'sezai karakoç',
    'anadolu lisesi dergisi',
    'lise öğrenci dergisi',
    'öğrenci yaratıcılığı',
    'eğitim dergisi',
    'okul dergisi',
    'öğrenci hikayeleri',
    'öğrenci şiirleri',
    'edebi yazılar',
    'röportajlar',
    'bilim teknoloji köşesi',
    'sanat kültür',
    'eğitici bilgiler',
    'okuma yazma becerileri',
    'dönemlik dergi',
    'dijital dergi',
    'basılı dergi',
    'öğrenci platformu',
    'okul projeleri',
    'spor etkinlikleri',
    'yarışmalar',
    'resim çalışmaları',
    'nefes alma felsefesi',
    'çiçekli balkon'
  ],
  authors: [{ name: 'Sezai Karakoç Anadolu Lisesi Balkon Dergisi Editörlük Ekibi' }],
  creator: 'Sezai Karakoç Anadolu Lisesi',
  publisher: 'Sezai Karakoç Anadolu Lisesi Balkon Dergisi',
  category: 'Eğitim',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    title: 'Balkon Dergisi - Sezai Karakoç Anadolu Lisesi Öğrenci Dergisi',
    description: 'Sezai Karakoç Anadolu Lisesi öğrencilerinin yaratıcılık ve edebiyat platformu. "Şu içimizin de balkonu olsaydı, çıkıp arada nefes alsaydık." mottosıyla dönemlik yayınlanan dijital dergi.',
    url: '/',
    siteName: 'Sezai Karakoç Anadolu Lisesi Balkon Dergisi',
    locale: 'tr_TR',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Sezai Karakoç Anadolu Lisesi Balkon Dergisi - Öğrenci Yaratıcılık Platformu',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Balkon Dergisi - Sezai Karakoç Anadolu Lisesi',
    description: 'Sezai Karakoç Anadolu Lisesi öğrencilerinin edebiyat ve yaratıcılık dergisi. Çiçekli balkonlardan nefes alan öğrenci sesleri.',
    images: ['/og-image.jpg'],
    creator: '@balkondergisi',
  },
  alternates: {
    canonical: '/',
    languages: {
      'tr-TR': '/',
    },
  },
  verification: {
    google: env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '16x16', type: 'image/png' }
    ],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

/**
 * Escapes HTML entities in JSON-LD structured data to prevent XSS attacks
 * 
 * @param json - The JSON object to escape
 * @returns Escaped JSON string safe for embedding in HTML
 */
function escapeJsonLd(json: object): string {
  return JSON.stringify(json)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
}

/**
 * Gets a validated site URL with fallback to localhost
 * 
 * @returns Valid site URL or localhost default
 */
function getSafeUrl(): string {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  
  // If NEXT_PUBLIC_SITE_URL is not set or invalid, use localhost
  if (!siteUrl) {
    return 'http://localhost:3000';
  }
  
  // Additional validation: ensure it's a valid URL
  try {
    new URL(siteUrl);
    return siteUrl;
  } catch {
    return 'http://localhost:3000';
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const safeUrl = getSafeUrl();
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Sezai Karakoç Anadolu Lisesi Balkon Dergisi",
    "description": "Sezai Karakoç Anadolu Lisesi öğrencilerinin yaratıcılık platformu - Öğrenci hikayeleri, şiirleri, bilim köşesi ve sanat içerikleri",
    "url": safeUrl,
    "publisher": {
      "@type": "EducationalOrganization",
      "name": "Sezai Karakoç Anadolu Lisesi",
      "description": "Lise öğrencilerinin yaratıcılıklarını geliştiren eğitim kurumu",
      "educationalLevel": "Lise",
      "founder": {
        "@type": "Person",
        "name": "Sezai Karakoç",
        "description": "Türk şair, yazar ve düşünür"
      }
    },
    "about": {
      "@type": "Periodical",
      "name": "Balkon Dergisi",
      "description": "Öğrencilerin yaratıcılıklarını geliştirmek, okuma-yazma becerilerini güçlendirmek ve kendilerini ifade edebilecekleri platform",
      "issn": "Dijital Dergi Yayıncılığı",
      "genre": ["Eğitim", "Edebiyat", "Bilim", "Sanat", "Kültür"],
      "frequency": "Dönemlik",
      "inLanguage": "tr-TR",
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Dergi İçerikleri",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "CreativeWork",
              "name": "Öğrenci hikayeleri, şiirleri, edebi yazıları"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "CreativeWork",
              "name": "Röportajlar (öğretmenler, mezun öğrenciler, öğrenci aileleri)"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "CreativeWork",
              "name": "Bilim ve Teknoloji Köşesi"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "CreativeWork",
              "name": "Sanat ve Kültür"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "CreativeWork",
              "name": "Etkinlik ve Yarışmalar"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "CreativeWork",
              "name": "Eğitici bilgiler ve eğlenceli aktiviteler"
            }
          }
        ]
      }
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": safeUrl + "/dergi/{search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    "audience": {
      "@type": "EducationalAudience",
      "educationalRole": "student",
      "audienceType": "Sezai Karakoç Anadolu Lisesi öğrencileri"
    },
    "inLanguage": "tr-TR",
    "isAccessibleForFree": true,
    "citation": "Şu içimizin de balkonu olsaydı, çıkıp arada nefes alsaydık.",
    "motto": "Hayat bize ne sunarsa sunsun, ne kadar zorlarsa zorlasın bir Balkon'a çıkıp nefes aldık mı her şey kolaylaşır.",
    "mission": "Okulun en çiçekli, keyifli, mutlu anlarının kayda geçtiği bir sembol",
    "temporalCoverage": "Dönemlik",
    "spatialCoverage": "Türkiye",
    "funding": "Sezai Karakoç Anadolu Lisesi"
  };
  
  return (
    <html lang="tr" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.png" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/favicon.png" sizes="180x180" />
        <link rel="shortcut icon" href="/favicon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {/* Structured Data for Sezai Karakoç Anadolu Lisesi Balkon Magazine */}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: escapeJsonLd(structuredData)
          }}
        />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
