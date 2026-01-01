import React from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters'
import { DateRangePicker } from './DateRangePicker'
import { MagazineMultiSelect } from './MagazineMultiSelect'

interface AnalyticsFilterBarProps {
    magazines: Array<{ id: string; title: string; issue_number: number }>
}

export function AnalyticsFilterBar({ magazines }: AnalyticsFilterBarProps) {
    const { filters, setFilters } = useAnalyticsFilters()

    // Magazine Options
    const magazineOptions = magazines.map(m => ({
        id: m.id,
        label: `#${m.issue_number} ${m.title}`
    }))

    const activeFilterCount = [
        filters.minScrollDepth,
        filters.minDurationSeconds,
        filters.deviceType,
        filters.readerType,
        filters.isFinished
    ].filter(v => v !== undefined).length

    return (
        <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">

                {/* Primary Filters */}
                <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                    <MagazineMultiSelect
                        options={magazineOptions}
                        selectedIds={filters.magazineIds}
                        onChange={(ids) => setFilters({ magazineIds: ids })}
                    />

                    <DateRangePicker
                        value={filters.dateRange}
                        onChange={(range) => setFilters({ dateRange: range })}
                    />
                </div>

                {/* Secondary / Advanced Filters */}
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 border-dashed">
                                <Filter className="mr-2 h-4 w-4" />
                                Gelişmiş Filtreler
                                {activeFilterCount > 0 && (
                                    <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-80 p-4" align="end">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Okuyucu Davranışı</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Etkileşim metriklerine göre filtrele.
                                    </p>
                                </div>

                                <div className="h-[1px] bg-border my-2" />

                                <div className="grid gap-2">
                                    <div className="grid gap-1">
                                        <Label htmlFor="scroll">Kaydırma Derinliği (Min)</Label>
                                        <Select
                                            value={filters.minScrollDepth ? String(filters.minScrollDepth) : 'all'}
                                            onValueChange={(val) => {
                                                const numericVal = val === 'all' ? undefined : Number(val)
                                                // Validate against allowed scroll depths to ensure type safety
                                                const isValidDepth = (v: number | undefined): v is 25 | 50 | 75 | 100 | undefined =>
                                                    v === undefined || [25, 50, 75, 100].includes(v)

                                                if (isValidDepth(numericVal)) {
                                                    setFilters({ minScrollDepth: numericVal })
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="scroll" className="h-8">
                                                <SelectValue placeholder="Herhangi" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Herhangi</SelectItem>
                                                <SelectItem value="25">%25+</SelectItem>
                                                <SelectItem value="50">%50+</SelectItem>
                                                <SelectItem value="75">%75+</SelectItem>
                                                <SelectItem value="100">%100 (Tamamlandı)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-1">
                                        <Label htmlFor="device">Cihaz Tipi</Label>
                                        <Select
                                            value={filters.deviceType || 'all'}
                                            onValueChange={(val) => {
                                                const deviceType = val === 'all' ? undefined : val
                                                // Type guard for device type
                                                const isValidDevice = (v: string | undefined): v is "mobile" | "tablet" | "desktop" | undefined =>
                                                    v === undefined || ['mobile', 'tablet', 'desktop'].includes(v)

                                                if (isValidDevice(deviceType)) {
                                                    setFilters({ deviceType })
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="device" className="h-8">
                                                <SelectValue placeholder="Tüm cihazlar" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Tüm cihazlar</SelectItem>
                                                <SelectItem value="mobile">Mobil</SelectItem>
                                                <SelectItem value="tablet">Tablet</SelectItem>
                                                <SelectItem value="desktop">Masaüstü</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-1">
                                        <Label htmlFor="reader">Okuyucu Tipi</Label>
                                        <Select
                                            value={filters.readerType || 'all'}
                                            onValueChange={(val) => {
                                                const readerType = val === 'all' ? undefined : val
                                                // Type guard for reader type
                                                const isValidReader = (v: string | undefined): v is "new" | "returning" | undefined =>
                                                    v === undefined || ['new', 'returning'].includes(v)

                                                if (isValidReader(readerType)) {
                                                    setFilters({ readerType })
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="reader" className="h-8">
                                                <SelectValue placeholder="Tüm okuyucular" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Tüm okuyucular</SelectItem>
                                                <SelectItem value="new">Yeni Okuyucu</SelectItem>
                                                <SelectItem value="returning">Geri Dönen</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="w-full"
                                    onClick={() => setFilters({
                                        minScrollDepth: undefined,
                                        minDurationSeconds: undefined,
                                        deviceType: undefined,
                                        readerType: undefined,
                                        isFinished: undefined
                                    })}
                                >
                                    Filtreleri Sıfırla
                                </Button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {(activeFilterCount > 0 || filters.magazineIds.length > 0 || filters.dateRange.preset !== '30d') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-2 lg:px-3"
                            onClick={() => {
                                // Full Reset handled via URL clear in parent or direct call
                                const params = new URLSearchParams()
                                window.history.pushState(null, '', `?${params.toString()}`)
                                setFilters({
                                    dateRange: { preset: '30d', from: undefined, to: undefined },
                                    magazineIds: [],
                                    minScrollDepth: undefined,
                                    deviceType: undefined,
                                    readerType: undefined
                                })
                            }}
                        >
                            Reset
                            <X className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Active Filters Summary Chips could go here if requested, but chips inside buttons handles it well enough for now */}
        </div>
    )
}
