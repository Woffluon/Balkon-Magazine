export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'this_month' | 'last_month' | 'custom'

export interface DateRange {
    from: string | undefined // ISO Date String
    to: string | undefined   // ISO Date String
    preset: DateRangePreset
    startIso?: string
    endIso?: string
}

export interface AnalyticsFilters {
    // Time
    dateRange: DateRange

    // Content
    magazineIds: string[] // Empty array = All
    issueStart?: number
    issueEnd?: number

    // Reader Behavior
    minDurationSeconds?: number
    minScrollDepth?: 25 | 50 | 75 | 100
    isFinished?: boolean

    // Session / Device
    readerType?: 'new' | 'returning'
    deviceType?: 'mobile' | 'tablet' | 'desktop'
    platform?: 'web' | 'pwa'
}

export type FilterKey = keyof AnalyticsFilters
