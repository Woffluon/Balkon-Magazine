import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DateRange, DateRangePreset } from '@/types/analytics'
import { format } from 'date-fns'

interface DateRangePickerProps {
    value: DateRange
    onChange: (val: DateRange) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
    const handlePresetChange = (preset: string) => {
        onChange({
            ...value,
            preset: preset as DateRangePreset,
            // Clear custom dates if switching away from custom (optional, strict clearing might be better)
            from: preset !== 'custom' ? undefined : value.from,
            to: preset !== 'custom' ? undefined : value.to
        })
    }

    const handleDateChange = (type: 'from' | 'to', dateStr: string) => {
        onChange({
            ...value,
            preset: 'custom', // Auto-switch to custom
            [type]: dateStr
        })
    }

    return (
        <div className="flex flex-col sm:flex-row gap-2 items-center">
            <Select value={value.preset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Dönem Seçin" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="today">Bugün</SelectItem>
                    <SelectItem value="7d">Son 7 Gün</SelectItem>
                    <SelectItem value="30d">Son 30 Gün</SelectItem>
                    <SelectItem value="90d">Son 90 Gün</SelectItem>
                    <SelectItem value="this_month">Bu Ay</SelectItem>
                    <SelectItem value="last_month">Geçen Ay</SelectItem>
                    <SelectItem value="custom">Özel Tarih Aralığı</SelectItem>
                </SelectContent>
            </Select>

            {value.preset === 'custom' && (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <Input
                        type="date"
                        value={value.from ? format(new Date(value.from), 'yyyy-MM-dd') : ''}
                        onChange={(e) => handleDateChange('from', e.target.value)}
                        className="w-auto"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                        type="date"
                        value={value.to ? format(new Date(value.to), 'yyyy-MM-dd') : ''}
                        onChange={(e) => handleDateChange('to', e.target.value)}
                        className="w-auto"
                    />
                </div>
            )}
        </div>
    )
}
