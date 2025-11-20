import { CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface UploadLogsProps {
  logs: string[]
}

type LogType = 'info' | 'success' | 'error' | 'progress'

interface ParsedLog {
  type: LogType
  message: string
  timestamp: string
}

function parseLog(log: string): ParsedLog {
  const timestamp = new Date().toLocaleTimeString('tr-TR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
  
  // Determine log type based on content
  let type: LogType = 'info'
  if (log.includes('HATA') || log.includes('başarısız') || log.includes('Hata:')) {
    type = 'error'
  } else if (log.includes('tamamlandı') || log.includes('başarıyla') || log.includes('yüklendi')) {
    type = 'success'
  } else if (log.includes('işleniyor') || log.includes('başlatılıyor') || log.includes('bekleyin')) {
    type = 'progress'
  }
  
  return { type, message: log, timestamp }
}

function LogIcon({ type }: { type: LogType }) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
    case 'progress':
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
    default:
      return <Info className="w-4 h-4 text-gray-500 flex-shrink-0" />
  }
}

export function UploadLogs({ logs }: UploadLogsProps) {
  const logsEndRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])
  
  const parsedLogs = logs.map(parseLog)
  
  return (
    <div className="space-y-2">
      <label className="text-xs sm:text-sm font-medium text-gray-700">
        İşlem Günlükleri
      </label>
      <div 
        id="upload-logs" 
        className="rounded-lg border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-3 sm:p-4 h-32 sm:h-40 md:h-56 overflow-y-auto shadow-inner"
      >
        {parsedLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            <Info className="w-4 h-4 mr-2" />
            <span>İşlem günlükleri burada görünecek</span>
          </div>
        ) : (
          <div className="space-y-2">
            {parsedLogs.map((log, index) => (
              <div 
                key={index}
                className={`flex items-start gap-2 p-2 rounded-md transition-all duration-200 ${
                  log.type === 'error' 
                    ? 'bg-red-50 border border-red-100' 
                    : log.type === 'success'
                    ? 'bg-green-50 border border-green-100'
                    : log.type === 'progress'
                    ? 'bg-blue-50 border border-blue-100'
                    : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <LogIcon type={log.type} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs sm:text-sm leading-relaxed ${
                    log.type === 'error' 
                      ? 'text-red-800 font-medium' 
                      : log.type === 'success'
                      ? 'text-green-800'
                      : log.type === 'progress'
                      ? 'text-blue-800'
                      : 'text-gray-700'
                  }`}>
                    {log.message}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {log.timestamp}
                  </p>
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
