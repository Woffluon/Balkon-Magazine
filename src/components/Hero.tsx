"use client";
import { TimelineContent } from "@/components/ui/timeline-animation";
import VerticalCutReveal from "@/components/ui/vertical-cut-reveal";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { logger } from '@/lib/services/Logger'
import { TypeGuards, ValidationHelpers } from '@/lib/guards/runtimeTypeGuards'

type HeroProps = {
  title?: string
  subtitle?: string
}

export function Hero({
  title = 'Balkon Dergisi',
  subtitle = 'Keyfini çıkar, derin bir nefes al ve rahatla.',
}: HeroProps) {
  // Validate props using type guards (Requirement 7.2)
  const validatedTitle = ValidationHelpers.validateOrDefault(
    title,
    TypeGuards.isNonEmptyString,
    'Balkon Dergisi',
    'Hero.title'
  )
  
  const validatedSubtitle = ValidationHelpers.validateOrDefault(
    subtitle,
    TypeGuards.isNonEmptyString,
    'Keyfini çıkar, derin bir nefes al ve rahatla.',
    'Hero.subtitle'
  )
  
  const handleScrollToMagazines = () => {
    try {
      const magazineSection = document.querySelector('[data-magazine-grid]')
      if (magazineSection) {
        magazineSection.scrollIntoView({ behavior: 'smooth' })
        
        logger.debug('Scrolled to magazine section from hero', {
          component: 'Hero',
          operation: 'handleScrollToMagazines'
        })
      } else {
        logger.warn('Magazine section not found for scrolling from hero', {
          component: 'Hero',
          operation: 'handleScrollToMagazines'
        })
      }
    } catch (error) {
      logger.error('Failed to scroll to magazine section from hero', {
        component: 'Hero',
        operation: 'handleScrollToMagazines',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
  
  const handleKeyboardNavigation = (keyboardEvent: React.KeyboardEvent) => {
    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
      keyboardEvent.preventDefault()
      handleScrollToMagazines()
    }
  }
  const heroRef = useRef<HTMLDivElement>(null);
  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.4,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };
  const scaleVariants = {
    visible: (i: number) => ({
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.4,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      opacity: 0,
    },
  };
  
  return (
    <section className="py-8 px-4 lg:py-10 lg:px-5 xl:py-12 xl:px-6 bg-[#f9f9f9]" ref={heroRef}>
      <div className="max-w-6xl lg:max-w-7xl xl:max-w-8xl mx-auto lg:scale-105 xl:scale-105 transform-gpu">
        <div className="relative">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 w-[85%] absolute lg:top-4 md:top-0 sm:-top-2 -top-3 z-10">
            <div className="flex items-center gap-2 text-xl">
              <span className="text-red-500 animate-spin">✱</span>
              <TimelineContent
                as="span"
                animationNum={0}
                timelineRef={heroRef}
                customVariants={revealVariants}
                className="text-sm font-medium text-gray-600"
              >
                BALKON DERGİSİ
              </TimelineContent>
            </div>
          </div>

          <TimelineContent
            as="figure"
            animationNum={4}
            timelineRef={heroRef}
            customVariants={scaleVariants}
            className="relative group"
          >
            <svg
              className="w-full"
              width={"100%"}
              height={"100%"}
              viewBox="0 0 100 40"
            >
              <defs>
                <clipPath
                  id="clip-inverted"
                  clipPathUnits={"objectBoundingBox"}
                >
                  <path
                    d="M0.0998072 1H0.422076H0.749756C0.767072 1 0.774207 0.961783 0.77561 0.942675V0.807325C0.777053 0.743631 0.791844 0.731953 0.799059 0.734076H0.969813C0.996268 0.730255 1.00088 0.693206 0.999875 0.675159V0.0700637C0.999875 0.0254777 0.985045 0.00477707 0.977629 0H0.902473C0.854975 0 0.890448 0.138535 0.850165 0.138535H0.0204424C0.00408849 0.142357 0 0.180467 0 0.199045V0.410828C0 0.449045 0.0136283 0.46603 0.0204424 0.469745H0.0523086C0.0696245 0.471019 0.0735527 0.497877 0.0733523 0.511146V0.915605C0.0723903 0.983121 0.090588 1 0.0998072 1Z"
                    fill="#D9D9D9"
                  />
                </clipPath>
              </defs>
              <image
                clipPath="url(#clip-inverted)"
                preserveAspectRatio="xMidYMid slice"
                width={"100%"}
                height={"100%"}
                xlinkHref="/hero_image.webp"
              />
            </svg>
          </TimelineContent>

          {/* Stats */}
          <div className="flex flex-wrap lg:justify-start justify-between items-center py-6 mt-4 text-sm">
            <TimelineContent
              as="div"
              animationNum={5}
              timelineRef={heroRef}
              customVariants={revealVariants}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2 mb-2 sm:text-base text-xs">
                <span className="text-red-500 font-bold">Dönemlik</span>
                <span className="text-gray-600">Yayın</span>
                <span className="text-gray-300">|</span>
              </div>
              <div className="flex items-center gap-2 mb-2 sm:text-base text-xs">
                <span className="text-red-500 font-bold">Dijital</span>
                <span className="text-gray-600">& Basılı</span>
              </div>
            </TimelineContent>
            <div className="lg:absolute right-0 bottom-24 flex lg:flex-col flex-row-reverse lg:gap-0 gap-2 w-full lg:w-auto overflow-hidden">
              <TimelineContent
                as="div"
                animationNum={6}
                timelineRef={heroRef}
                customVariants={revealVariants}
                className="flex lg:text-4xl sm:text-2xl text-lg items-center gap-1 sm:gap-2 mb-2 flex-wrap lg:flex-nowrap w-full lg:w-auto"
              >
                <span className="text-red-500 font-semibold whitespace-nowrap">Lise</span>
                <span className="text-gray-600 uppercase font-semibold break-words lg:whitespace-nowrap">öğrencileri</span>
              </TimelineContent>
              <TimelineContent
                as="div"
                animationNum={7}
                timelineRef={heroRef}
                customVariants={revealVariants}
                className="flex items-center gap-1 sm:gap-2 mb-2 sm:text-base text-xs flex-wrap lg:flex-nowrap w-full lg:w-auto"
              >
                <span className="text-red-500 font-bold whitespace-nowrap">Yaratıcılık</span>
                <span className="text-gray-600 whitespace-nowrap">platformu</span>
                <span className="text-gray-300 lg:hidden block">|</span>
              </TimelineContent>
            </div>
          </div>
        </div>
        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h1 className="sm:text-5xl md:text-6xl text-3xl !leading-[110%] font-semibold text-gray-900 mb-8">
              <VerticalCutReveal
                splitBy="words"
                staggerDuration={0.1}
                staggerFrom="first"
                reverse={true}
                transition={{
                  type: "spring",
                  stiffness: 250,
                  damping: 30,
                  delay: 3,
                }}
              >
                {validatedTitle}
              </VerticalCutReveal>
            </h1>

            <TimelineContent
              as="div"
              animationNum={9}
              timelineRef={heroRef}
              customVariants={revealVariants}
              className="grid md:grid-cols-2 gap-8 text-gray-600"
            >
              <TimelineContent
                as="div"
                animationNum={10}
                timelineRef={heroRef}
                customVariants={revealVariants}
                className="sm:text-lg text-base"
              >
                <p className="leading-relaxed">
                  {validatedSubtitle}
                </p>
              </TimelineContent>
              <TimelineContent
                as="div"
                animationNum={11}
                timelineRef={heroRef}
                customVariants={revealVariants}
                className="sm:text-lg text-base"
              >
                <p className="leading-relaxed">
                  Sezai Karakoç Anadolu Lisesi&apos;nin dijital balkonunda yaratıcılığı besleyen platform.
                </p>
              </TimelineContent>
            </TimelineContent>
          </div>

          <div className="md:col-span-1">
            <div className="text-right">
              <TimelineContent
                as="div"
                animationNum={12}
                timelineRef={heroRef}
                customVariants={revealVariants}
                className="text-red-500 text-3xl font-bold mb-2"
              >
                BALKON
              </TimelineContent>
              <TimelineContent
                as="div"
                animationNum={13}
                timelineRef={heroRef}
                customVariants={revealVariants}
                className="text-gray-600 text-base mb-8"
              >
                Sezai Karakoç Anadolu Lisesi | Balkon Dergisi
              </TimelineContent>

              <TimelineContent
                as="div"
                animationNum={14}
                timelineRef={heroRef}
                customVariants={revealVariants}
                className="mb-6"
              >
                <p className="text-gray-900 font-medium mb-4 text-base">
                  Sezai Karakoç Anadolu Lisesi öğrencilerinin edebi çalışmalarını keşfedin.
                </p>
              </TimelineContent>

              <TimelineContent
                as="button"
                animationNum={15}
                timelineRef={heroRef}
                customVariants={revealVariants}
                type="button"
                className="bg-neutral-900 hover:bg-neutral-950 shadow-lg shadow-neutral-900 border border-neutral-700 flex w-fit ml-auto gap-2 hover:gap-4 transition-all duration-300 ease-in-out text-white px-5 py-3 rounded-lg cursor-pointer font-semibold"
                onClick={handleScrollToMagazines}
                onKeyDown={handleKeyboardNavigation}
              >
                SAYILARI KEŞFET <ArrowRight className="" />
              </TimelineContent>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
