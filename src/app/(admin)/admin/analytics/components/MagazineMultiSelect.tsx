import React, { useState, useMemo } from 'react'
import { ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Option {
    id: string
    label: string
}

interface MagazineMultiSelectProps {
    options: Option[]
    selectedIds: string[]
    onChange: (ids: string[]) => void
}

export function MagazineMultiSelect({ options, selectedIds, onChange }: MagazineMultiSelectProps) {
    const [search, setSearch] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    // Filter options
    const filteredOptions = useMemo(() => {
        if (!search) return options
        return options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
    }, [options, search])

    const handleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(prev => prev !== id))
        } else {
            onChange([...selectedIds, id])
        }
    }

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange([])
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[250px] justify-between h-auto min-h-10 py-2">
                    <div className="flex flex-wrap gap-1 items-center text-left">
                        {selectedIds.length === 0 && <span className="text-muted-foreground font-normal">Tüm Sayılar</span>}
                        {selectedIds.length > 0 && selectedIds.length <= 2 && (
                            selectedIds.map(id => {
                                const option = options.find(o => o.id === id)
                                return (
                                    <Badge key={id} variant="secondary" className="mr-1">
                                        {option?.label || id}
                                    </Badge>
                                )
                            })
                        )}
                        {selectedIds.length > 2 && (
                            <Badge variant="secondary">
                                {selectedIds.length} Seçildi
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center">
                        {selectedIds.length > 0 && (
                            <div
                                role="button"
                                onClick={clearSelection}
                                className="mr-2 hover:bg-muted rounded-full p-1"
                            >
                                <X className="h-3 w-3 opacity-50" />
                            </div>
                        )}
                        <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[250px]" align="start">
                <div className="p-2">
                    <Input
                        placeholder="Sayı ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8"
                    />
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                    {filteredOptions.length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            Sayı bulunamadı.
                        </div>
                    )}
                    {filteredOptions.map((option) => (
                        <DropdownMenuCheckboxItem
                            key={option.id}
                            checked={selectedIds.includes(option.id)}
                            onCheckedChange={() => handleSelect(option.id)}
                        >
                            {option.label}
                        </DropdownMenuCheckboxItem>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
