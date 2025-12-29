import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, BookOpen } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="text-center space-y-8 max-w-lg mx-auto">
                {/* Decorative Element */}
                <div className="relative">
                    <h1 className="text-[150px] font-black text-red-500/10 dark:text-red-500/20 leading-none select-none">
                        404
                    </h1>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        Aradığınız sayfa balkondan düşmüş olabilir...
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                        Görünüşe göre bu sayfa taşınmış, silinmiş veya hiç var olmamış.
                        Ama endişelenmeyin, balkonda her zaman yerimiz var.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Link href="/">
                        <Button size="lg" className="w-full sm:w-auto gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 border-0">
                            <Home className="w-5 h-5" />
                            Ana Sayfaya Dön
                        </Button>
                    </Link>

                    <Link href="/dergi/son-sayi">
                        <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 border-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                            <BookOpen className="w-5 h-5" />
                            Dergileri İncele
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
