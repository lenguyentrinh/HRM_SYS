import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, CameraOff, Upload, CheckCircle2, XCircle, Clock, ArrowRight, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCheckin, useEmployeeId } from '../hooks/useCheckin'
import type { CheckinState, CheckinType, CheckinResponse } from '../types'

interface QrBarcodeDetector {
  detect(el: HTMLVideoElement | HTMLImageElement): Promise<{ rawValue: string }[]>
}

function createBarcodeDetector(): QrBarcodeDetector | null {
  if ('BarcodeDetector' in window) {
    const Ctor = (window as any).BarcodeDetector
    return new Ctor({ formats: ['qr_code'] }) as QrBarcodeDetector
  }
  return null
}

export function CheckinPage() {
  const [mode, setMode] = useState<CheckinType>('check_in')
  const [pageState, setPageState] = useState<CheckinState>('idle')
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState(false)
  const [result, setResult] = useState<CheckinResponse | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimerRef = useRef(0)

  const { data: employeeId } = useEmployeeId()
  const checkin = useCheckin()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  async function startCamera() {
    setCameraError(false)
    setPageState('scanning')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = s
      if (videoRef.current) {
        videoRef.current.srcObject = s
        await videoRef.current.play()
      }
      startScanLoop()
    } catch {
      setCameraError(true)
      setPageState('manual_input')
    }
  }

  function stopScan() {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
    stopCamera()
    setPageState('idle')
  }

  async function startScanLoop() {
    if (!videoRef.current || !streamRef.current) return

    try {
      const detector = createBarcodeDetector()
      if (detector) {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0) {
          handleDetectedCode(barcodes[0].rawValue)
          return
        }
      }
    } catch {}

    scanTimerRef.current = window.setTimeout(startScanLoop, 1500)
  }

  function handleDetectedCode(code: string) {
    stopCamera()
    setManualCode(code)
    submitCheckin(code)
  }

  async function submitCheckin(code?: string) {
    const token = code ?? manualCode
    if (!token.trim() || !employeeId) return

    setPageState('processing')
    checkin.mutate(
      { token: token.trim(), employee_id: employeeId, type: mode },
      {
        onSuccess: (data) => {
          if (data.success) {
            setResult(data)
            setPageState('success')
          } else {
            setResult(data)
            setPageState('error')
          }
        },
        onError: (err: Error) => {
          setResult({ success: false, message: err.message, error: 'unknown' })
          setPageState('error')
        },
      },
    )
  }

  function handleReset() {
    setPageState('idle')
    setResult(null)
    setManualCode('')
    setCameraError(false)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const img = new Image()
    img.onload = async () => {
      try {
        const detector = createBarcodeDetector()
        if (detector) {
          const barcodes = await detector.detect(img)
          if (barcodes.length > 0) {
            handleDetectedCode(barcodes[0].rawValue)
            return
          }
        }
        setPageState('manual_input')
      } catch {
        setPageState('manual_input')
      }
    }
    img.src = URL.createObjectURL(file)
  }

  const timeStr = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (pageState === 'success' && result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-bounce-in">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>

        <h2 className="text-2xl font-bold text-green-700 mb-2">
          {result.message}
        </h2>

        <Card className="w-full max-w-xs p-4 mt-6 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Type</span>
            <Badge variant={mode === 'check_in' ? 'success' : 'info'} className="uppercase text-xs">
              {mode === 'check_in' ? 'Check In' : 'Check Out'}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Time</span>
            <span className="font-mono font-medium">{timeStr}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Status</span>
            <Badge variant="success">{result.status ?? 'Present'}</Badge>
          </div>
          {result.late_minutes != null && result.late_minutes > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Late</span>
              <span className="text-amber-600 font-medium">{result.late_minutes} min</span>
            </div>
          )}
        </Card>

        <Button onClick={handleReset} className="mt-8 bg-orange-500 hover:bg-orange-600 text-white px-8">
          {mode === 'check_in' ? 'Check Out' : 'Check In'} Again
        </Button>
      </div>
    )
  }

  if (pageState === 'error' && result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <XCircle className="h-12 w-12 text-red-500" />
        </div>

        <h2 className="text-xl font-bold text-red-600 mb-2">Check-in Failed</h2>
        <p className="text-slate-500 mb-8">{result.message}</p>

        <div className="flex gap-3">
          <Button onClick={handleReset} variant="outline">
            Try Again
          </Button>
          <Button onClick={() => { handleReset(); startCamera() }} className="bg-orange-500 hover:bg-orange-600 text-white">
            Scan Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <p className="text-slate-500 text-sm mt-1">{dateStr}</p>
      </div>

      <div className="flex rounded-lg bg-slate-100 p-1 max-w-xs mx-auto">
        <button
          onClick={() => setMode('check_in')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'check_in' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'
          }`}
        >
          Check In
        </button>
        <button
          onClick={() => setMode('check_out')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'check_out' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'
          }`}
        >
          Check Out
        </button>
      </div>

      {pageState === 'scanning' && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] max-w-sm mx-auto">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <div className="absolute inset-0 border-[3px] border-orange-400 rounded-xl pointer-events-none">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/2 border-2 border-orange-400 rounded-lg">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8">
                <ScanLine className="w-8 h-8 text-orange-400 animate-pulse" />
              </div>
            </div>
          </div>
          <button
            onClick={stopScan}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
          >
            <CameraOff className="h-5 w-5 text-white" />
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-1.5 rounded-full">
            Point camera at QR code
          </p>
        </div>
      )}

      {pageState === 'idle' && (
        <div className="space-y-3">
          <button
            onClick={startCamera}
            className="w-full py-16 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center gap-3 text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-colors"
          >
            <Camera className="h-10 w-10" />
            <span className="text-sm font-medium">Tap to Open Camera</span>
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="flex-1 h-px bg-slate-200" />
            <span>or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="flex gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
              <Upload className="h-4 w-4" />
              Upload QR Image
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
            <button
              onClick={() => setPageState('manual_input')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Clock className="h-4 w-4" />
              Enter Code
            </button>
          </div>
        </div>
      )}

      {pageState === 'manual_input' && (
        <Card className="p-4 space-y-4 max-w-sm mx-auto">
          <p className="text-sm text-slate-600 text-center">
            {cameraError ? 'Camera not available.' : 'Enter the QR code manually.'}
          </p>
          <div className="flex gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste QR code here..."
              className="flex-1"
            />
            <Button
              onClick={() => submitCheckin()}
              disabled={!manualCode.trim() || checkin.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {checkin.isPending ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>
          <button
            onClick={() => { setPageState('idle'); setCameraError(false) }}
            className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Back
          </button>
        </Card>
      )}

      {pageState === 'processing' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Processing...</p>
          <p className="text-slate-400 text-sm">Please wait a moment</p>
        </div>
      )}
    </div>
  )
}
