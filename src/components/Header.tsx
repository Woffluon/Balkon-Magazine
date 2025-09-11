"use client";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { useRef } from "react";
import Link from "next/link";

export function Header() {
  const headerRef = useRef<HTMLDivElement>(null);
  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.2,
        duration: 0.4,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -10,
      opacity: 0,
    },
  };

  return (
    <header className="sticky top-0 z-50 bg-[#f9f9f9]/95 backdrop-blur-sm border-b border-gray-200" ref={headerRef}>
      <div className="max-w-6xl lg:max-w-7xl xl:max-w-8xl mx-auto px-4 lg:px-5 xl:px-6">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <TimelineContent
              as="div"
              animationNum={0}
              timelineRef={headerRef}
              customVariants={revealVariants}
              className="flex items-center gap-2"
            >
              <span className="text-red-500 text-xl lg:text-2xl font-bold">BALKON</span>
            </TimelineContent>
            <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
            <TimelineContent
              as="span"
              animationNum={1}
              timelineRef={headerRef}
              customVariants={revealVariants}
              className="hidden sm:block text-gray-600 text-sm lg:text-base font-medium"
            >
              Dergisi
            </TimelineContent>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-gray-600 hover:text-red-500 transition-colors font-medium text-sm lg:text-base"
            >
              <TimelineContent
                as="span"
                animationNum={2}
                timelineRef={headerRef}
                customVariants={revealVariants}
              >
                Ana Sayfa
              </TimelineContent>
            </Link>
            <button
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                const magazineSection = document.querySelector('[data-magazine-grid]');
                magazineSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-gray-600 hover:text-red-500 transition-colors font-medium text-sm lg:text-base"
            >
              <TimelineContent
                as="span"
                animationNum={3}
                timelineRef={headerRef}
                customVariants={revealVariants}
              >
                Sayılar
              </TimelineContent>
            </button>
          </nav>

          {/* Mobile Menu & Social Icons */}
          <div className="flex items-center gap-3">
            {/* Social Icons */}
            <div className="flex gap-2">
              <TimelineContent
                as="a"
                animationNum={3}
                timelineRef={headerRef}
                customVariants={revealVariants}
                href="https://www.instagram.com/balkon.dergi"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 border border-gray-200 bg-white/80 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 hover:text-red-500 transition-colors">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </TimelineContent>
              <TimelineContent
                as="a"
                animationNum={4}
                timelineRef={headerRef}
                customVariants={revealVariants}
                href="mailto:dergisezaikarakocanadolulisesi@gmail.com"
                className="w-8 h-8 border border-gray-200 bg-white/80 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 hover:text-red-500 transition-colors">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </TimelineContent>
            </div>

            {/* Mobile Menu Button */}
            <TimelineContent
              as="button"
              animationNum={5}
              timelineRef={headerRef}
              customVariants={revealVariants}
              className="md:hidden w-8 h-8 border border-gray-200 bg-white/80 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
              onClick={() => {
                // Simple mobile menu toggle - can be expanded
                const nav = document.querySelector('[data-mobile-nav]');
                nav?.classList.toggle('hidden');
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </TimelineContent>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div data-mobile-nav className="hidden md:hidden border-t border-gray-200 py-4">
          <nav className="flex flex-col gap-4">
            <Link
              href="/"
              className="text-gray-600 hover:text-red-500 transition-colors font-medium text-base px-2 py-1"
            >
              Ana Sayfa
            </Link>
            <button
              onClick={() => {
                const magazineSection = document.querySelector('[data-magazine-grid]');
                magazineSection?.scrollIntoView({ behavior: 'smooth' });
                // Hide mobile menu
                const nav = document.querySelector('[data-mobile-nav]');
                nav?.classList.add('hidden');
              }}
              className="text-gray-600 hover:text-red-500 transition-colors font-medium text-base px-2 py-1 text-left"
            >
              Sayılar
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}