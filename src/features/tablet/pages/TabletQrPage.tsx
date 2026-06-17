import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, Wifi, WifiOff } from 'lucide-react'
import QRCode from 'qrcode'
import { useBranch, useQrTokens } from '../hooks/useTabletQr'

export function TabletQrPage() {
  const { branch_id } = useParams<{ branch_id: string }>()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [now, setNow] = useState(new Date())

  const today = now.toISOString().split('T')[0]
  const isOnline = navigator.onLine

  const { data: branch } = useBranch(branch_id)
  const { data: tokens, isLoading: tokensLoading } = useQrTokens(branch_id, today)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [tokens?.length])

  const activeToken = tokens?.[selectedIndex]

  useEffect(() => {
    if (!activeToken?.token) {
      setQrDataUrl('')
      return
    }
    QRCode.toDataURL(activeToken.token, {
      width: 400,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
    }).then(setQrDataUrl)
  }, [activeToken?.token])

  const handlePrev = useCallback(() => {
    if (!tokens?.length) return
    setSelectedIndex((i) => (i > 0 ? i - 1 : tokens.length - 1))
  }, [tokens?.length])

  const handleNext = useCallback(() => {
    if (!tokens?.length) return
    setSelectedIndex((i) => (i < tokens.length - 1 ? i + 1 : 0))
  }, [tokens?.length])

  useEffect(() => {
    if (!tokens?.length || tokens.length <= 1) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [tokens?.length, handlePrev, handleNext])

  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col select-none">
      <header className="flex items-center justify-between px-8 py-6 border-b border-slate-700">
        <div>
          <h1 className="text-xl font-semibold tracking-wide">{branch?.name ?? 'Loading...'}</h1>
          {branch?.address && <p className="text-sm text-slate-400 mt-0.5">{branch.address}</p>}
        </div>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-400" />
          )}
          <div className="text-right">
            <div className="text-2xl font-mono font-bold tracking-wider text-orange-400">{timeStr}</div>
            <div className="text-xs text-slate-400">{dateStr}</div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 py-8">
        {tokensLoading && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-slate-600 border-t-orange-500 animate-spin" />
            <p className="text-slate-400">Loading QR codes...</p>
          </div>
        )}

        {!tokensLoading && (!tokens || tokens.length === 0) && (
          <div className="flex flex-col items-center gap-4 text-center">
            <Clock className="h-16 w-16 text-slate-600" />
            <h2 className="text-2xl font-semibold text-slate-400">No Active Shifts</h2>
            <p className="text-slate-500 max-w-sm">No QR tokens available for today. Check-in will be available when a shift is active.</p>
          </div>
        )}

        {activeToken && (
          <div className="flex flex-col items-center gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-2xl">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-72 h-72" />
              ) : (
                <div className="w-72 h-72 flex items-center justify-center text-slate-300">
                  <div className="w-12 h-12 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">
                {(activeToken as any).shifts?.name ?? 'Shift'}
              </h2>
              <p className="text-slate-400 mt-1">
                {(activeToken as any).shifts?.start_time?.slice(0, 5) ?? '--'} – {(activeToken as any).shifts?.end_time?.slice(0, 5) ?? '--'}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Valid until{' '}
                {activeToken.expires_at
                  ? new Date(activeToken.expires_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  : '--'}
              </p>
            </div>
          </div>
        )}
      </main>

      {tokens && tokens.length > 1 && (
        <footer className="border-t border-slate-700 px-8 py-6">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrev}
              className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-3 overflow-x-auto max-w-lg px-2 py-1 scrollbar-hide">
              {tokens.map((token, i) => (
                <button
                  key={token.id}
                  onClick={() => setSelectedIndex(i)}
                  className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                    i === selectedIndex
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <span className="font-medium">{(token as any).shifts?.name ?? `Shift ${i + 1}`}</span>
                  <span className="ml-2 text-xs opacity-75">
                    {(token as any).shifts?.start_time?.slice(0, 5)}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </footer>
      )}

      {(!tokens || tokens.length <= 1) && (
        <footer className="border-t border-slate-700 px-8 py-4 text-center text-xs text-slate-500">
          Auto-refreshes every 30 seconds
        </footer>
      )}
    </div>
  )
}
