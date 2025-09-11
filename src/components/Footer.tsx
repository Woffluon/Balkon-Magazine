"use client";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { useRef } from "react";
import Link from "next/link";

export function Footer() {
  const footerRef = useRef<HTMLDivElement>(null);
  
  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: "easeOut" as const
      },
    }),
    hidden: {
      filter: "blur(4px)",
      y: 20,
      opacity: 0,
    },
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-24" ref={footerRef}>
      <div className="max-w-6xl lg:max-w-7xl xl:max-w-8xl mx-auto px-4 lg:px-5 xl:px-6 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <TimelineContent
              as="div"
              animationNum={0}
              timelineRef={footerRef}
              customVariants={revealVariants}
              className="mb-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-red-500 text-2xl font-bold">BALKON</span>
                <div className="h-6 w-px bg-gray-300"></div>
                <span className="text-gray-600 font-medium">Dergisi</span>
              </div>
              
              <p className="text-gray-700 font-semibold mb-3">
                Sezai Karakoç Anadolu Lisesi
              </p>
              
              <p className="text-gray-600 leading-relaxed max-w-md">
                &ldquo;Şu içimizin de balkonu olsaydı, çıkıp arada nefes alsaydık.&rdquo; 
                Öğrencilerimizin yaratıcılıklarını geliştiren, keyifli ve mutlu anların kayda geçtiği dijital balkonumuz.
              </p>
            </TimelineContent>
            
            <TimelineContent
              as="div"
              animationNum={1}
              timelineRef={footerRef}
              customVariants={revealVariants}
              className="flex gap-4 mt-6"
            >
              <a
                href="https://www.instagram.com/balkon.dergi"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-gray-200 bg-white rounded-lg flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 hover:text-red-500 transition-colors">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="mailto:dergisezaikarakocanadolulisesi@gmail.com"
                className="w-10 h-10 border border-gray-200 bg-white rounded-lg flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 hover:text-red-500 transition-colors">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </a>
            </TimelineContent>
          </div>

          {/* Quick Links */}
          <div>
            <TimelineContent
              as="h3"
              animationNum={2}
              timelineRef={footerRef}
              customVariants={revealVariants}
              className="text-gray-900 font-semibold mb-4"
            >
              Hızlı Erişim
            </TimelineContent>
            <TimelineContent
              as="ul"
              animationNum={3}
              timelineRef={footerRef}
              customVariants={revealVariants}
              className="space-y-3"
            >
              <li>
                <Link href="/" className="text-gray-600 hover:text-red-500 transition-colors">
                  Ana Sayfa
                </Link>
              </li>
              <li>
                <button
                  onClick={() => {
                    const magazineSection = document.querySelector('[data-magazine-grid]');
                    magazineSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-gray-600 hover:text-red-500 transition-colors"
                >
                  Dergi Sayıları
                </button>
              </li>
              <li>
                <a 
                  href="https://ciglisezaikarakoc.meb.k12.tr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-red-500 transition-colors"
                >
                  Okul Websitesi
                </a>
              </li>
            </TimelineContent>
          </div>

          {/* School Info */}
          <div>
            <TimelineContent
              as="h3"
              animationNum={4}
              timelineRef={footerRef}
              customVariants={revealVariants}
              className="text-gray-900 font-semibold mb-4"
            >
              Okul Bilgileri
            </TimelineContent>
            <TimelineContent
              as="div"
              animationNum={5}
              timelineRef={footerRef}
              customVariants={revealVariants}
              className="space-y-3 text-gray-600"
            >
              <p className="text-sm leading-relaxed">
                Sezai Karakoç Anadolu Lisesi
              </p>
              <p className="text-sm leading-relaxed">
                Eğitimde Mükemmellik ve Yaratıcılık
              </p>
              <p className="text-sm leading-relaxed">
                Dönemlik Dergi Yayını
              </p>
            </TimelineContent>
          </div>
        </div>

        {/* Inspirational Quote Section */}
        <TimelineContent
          as="div"
          animationNum={6}
          timelineRef={footerRef}
          customVariants={revealVariants}
          className="border-t border-gray-200 pt-8 mb-8"
        >
          <div className="text-center">
            <p className="text-gray-700 italic text-lg mb-2 max-w-4xl mx-auto">
              &ldquo;Her sayfa bir hikaye Her hikaye bir balkon Her balkon bir nefes&rdquo;
            </p>
            <p className="text-gray-500 text-sm">
              - Balkon Dergisi Mottosu
            </p>
          </div>
        </TimelineContent>

        {/* Bottom Bar */}
        <TimelineContent
          as="div"
          animationNum={7}
          timelineRef={footerRef}
          customVariants={revealVariants}
          className="border-t border-gray-200 pt-8"
        >
          <div className="text-center md:text-left">
            <p className="text-gray-600 text-sm mb-2">
              © {currentYear} Sezai Karakoç Anadolu Lisesi Balkon Dergisi. Tüm hakları saklıdır.
            </p>
            <p className="text-gray-500 text-xs">
              Made by{" "}
              <a 
                href="https://github.com/Woffluon"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-600 transition-colors font-medium"
              >
                Efe Arabacı
              </a>
              {" "}|{" "}
              <a 
                href="mailto:efe.arabaci.dev@gmail.com"
                className="text-red-500 hover:text-red-600 transition-colors"
              >
                efe.arabaci.dev@gmail.com
              </a>
            </p>
          </div>
        </TimelineContent>
      </div>
    </footer>
  );
}