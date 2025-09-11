import Link from 'next/link'
import Image from 'next/image'
import type { Magazine } from '@/types/magazine'

type Props = {
  magazine: Magazine
}

export function MagazineCard({ magazine }: Props) {
  return (
    <Link 
      key={magazine.id} 
      href={`/dergi/${magazine.issue_number}`} 
      className="group block w-full"
    >
      {/* Card Container */}
      <div className="relative overflow-hidden rounded-xl bg-white aspect-[3/4] w-full transition-all duration-500 group-hover:shadow-xl">
        {/* Cover Image */}
        <div className="relative w-full h-full overflow-hidden rounded-xl">
          {magazine.cover_image_url ? (
            <>
              <Image
                src={magazine.cover_image_url}
                alt={magazine.title}
                fill
                className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Artistic frame effect */}
              <div className="absolute inset-2 border-2 border-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Corner decorations */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-400 border border-gray-200 rounded-xl">
              <div className="text-4xl mb-3">📚</div>
              <div className="text-sm font-medium">Kapak Resmi</div>
              <div className="text-xs">Yakında...</div>
            </div>
          )}
          
          {/* Reading indicator */}
          <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-gray-700 shadow-sm border border-white/20">
              OKU
            </div>
          </div>
          
          {/* Floating page indicator */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="bg-red-500/90 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold shadow-lg">
              →
            </div>
          </div>
        </div>
      </div>
      
      {/* Card Info */}
      <div className="pt-4 w-full">
        <div className="space-y-3">
          {/* Magazine Title */}
          <h3 className="font-bold text-sm sm:text-base lg:text-lg line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] text-gray-900 group-hover:text-red-600 transition-colors duration-300 leading-tight">
            {magazine.title}
          </h3>
          
          {/* Issue Info & Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                Sayı {magazine.issue_number}
              </span>
            </div>
            
            {/* Read more indicator */}
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1">
              <svg 
                className="w-4 h-4 text-red-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
          
          {/* Clean decorative underline */}
          <div className="h-1 bg-red-500 w-0 group-hover:w-full transition-all duration-500 ease-out rounded-full"></div>
        </div>
      </div>
    </Link>
  )
}
