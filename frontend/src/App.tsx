import { useState, useRef, useCallback } from 'react'
import './App.css'
import { AuthProvider, useAuth } from './AuthContext'
import { ToastProvider, useToast } from './components/Toast'
import AuthModal from './components/AuthModal'
import HistoryPanel from './components/HistoryPanel'
import { scanApi } from './api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ParsedData {
  price?: number
  originalPrice?: number
  currency?: string
  currencySymbol?: string
  barcode?: string
  isPromo?: boolean
  promoType?: string
  discountPercent?: number
  productName?: string
}

interface ScanResult {
  id: string
  text: string
  timestamp: Date
  imageUrl?: string
  parsed?: ParsedData
}

function AppContent() {
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [history, setHistory] = useState<ScanResult[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [enhanceImage, setEnhanceImage] = useState(false)

  const { user, logout, isLoading: authLoading } = useAuth()
  const { showToast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setImage(e.target?.result as string)
      setImageFile(file)
      setResult(null)
      setParsedData(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleScan = async () => {
    if (!imageFile) return

    setIsLoading(true)

    try {
      const data = await scanApi.scan(imageFile, enhanceImage)
      setResult(data.text)
      setParsedData(data.parsed)

      const newResult: ScanResult = {
        id: data.id || Date.now().toString(),
        text: data.text,
        timestamp: new Date(),
        imageUrl: image || undefined,
        parsed: data.parsed
      }
      setHistory(prev => [newResult, ...prev].slice(0, 10))
      showToast('Распознавание завершено', 'success')
    } catch (error) {
      console.error('Scan error:', error)
      showToast('Не удалось распознать текст. Проверьте подключение к серверу.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setImage(null)
    setImageFile(null)
    setResult(null)
    setParsedData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openCamera = async () => {
    setShowCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Camera error:', error)
      setShowCamera(false)
    }
  }

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg')

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
        setImage(dataUrl)
        setImageFile(file)
        setResult(null)
        setParsedData(null)
      }
    }, 'image/jpeg')

    closeCamera()
  }

  const copyResult = async () => {
    if (result) {
      await navigator.clipboard.writeText(result)
      showToast('Текст скопирован', 'success', 2000)
    }
  }

  const loadHistoryItem = (item: ScanResult) => {
    if (item.imageUrl) {
      setImage(item.imageUrl)
    }
    setResult(item.text)
    setParsedData(item.parsed || null)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return null
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽'
    return `${price.toFixed(2)} ${symbol}`
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">PriceTag Scanner</h1>
        </div>
        <div className="header-right">
          <button className="btn btn-icon" onClick={() => setShowHistory(true)} title="История">
            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
          {authLoading ? (
            <span className="auth-loading">...</span>
          ) : user ? (
            <div className="user-menu">
              <span className="user-name">{user.username}</span>
              <button className="btn btn-secondary btn-small" onClick={logout}>
                Выйти
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={() => setShowAuthModal(true)}>
              Войти
            </button>
          )}
        </div>
      </header>

      <main className="main">
        <section className="scanner-section">
          <div className="section-header">
            <h2 className="section-title">Изображение</h2>
            <div className="section-actions">
              <button className="btn btn-icon" onClick={openCamera} title="Камера">
                <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
            </div>
          </div>

          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''} ${image ? 'has-image' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !image && fileInputRef.current?.click()}
          >
            {image ? (
              <>
                <img src={image} alt="Preview" className="preview-image" />
                {isLoading && <div className="scan-line" />}
                {isLoading && (
                  <div className="loading-overlay">
                    <div className="loading-spinner" />
                    <span className="loading-text">Распознавание...</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div className="upload-text">
                  <p className="upload-text-main">Перетащите изображение или нажмите</p>
                  <p className="upload-text-sub">PNG, JPG до 10MB</p>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={handleScan}
              disabled={!image || isLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
              Распознать
            </button>
            {image && (
              <button className="btn btn-secondary" onClick={handleClear}>
                Очистить
              </button>
            )}
          </div>

          <label className="enhance-toggle">
            <input
              type="checkbox"
              checked={enhanceImage}
              onChange={(e) => setEnhanceImage(e.target.checked)}
            />
            <span className="enhance-toggle-slider"></span>
            <span className="enhance-toggle-label">Улучшить качество</span>
          </label>
        </section>

        <section className="results-section">
          <div className="section-header">
            <h2 className="section-title">Результат</h2>
          </div>

          <div className="results-container">
            {result ? (
              <div className="results-content">
                {parsedData && (parsedData.price || parsedData.isPromo) && (
                  <div className={`parsed-summary ${parsedData.isPromo ? 'is-promo' : ''}`}>
                    {parsedData.isPromo && (
                      <div className="promo-banner">
                        <span className="promo-icon">%</span>
                        <span className="promo-text">
                          {parsedData.promoType || 'Акция'}
                          {parsedData.discountPercent && ` -${parsedData.discountPercent}%`}
                        </span>
                      </div>
                    )}
                    {parsedData.productName && parsedData.productName !== 'Неизвестный товар' && (
                      <div className="parsed-name">{parsedData.productName}</div>
                    )}
                    <div className="parsed-price-row">
                      {parsedData.originalPrice && (
                        <span className="parsed-price-old">
                          {formatPrice(parsedData.originalPrice, parsedData.currency)}
                        </span>
                      )}
                      {parsedData.price && (
                        <span className={`parsed-price ${parsedData.isPromo ? 'parsed-price-promo' : ''}`}>
                          {formatPrice(parsedData.price, parsedData.currency)}
                        </span>
                      )}
                    </div>
                    {parsedData.barcode && (
                      <div className="parsed-barcode">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="16" rx="1"/>
                          <line x1="7" y1="8" x2="7" y2="16"/>
                          <line x1="11" y1="8" x2="11" y2="16"/>
                          <line x1="15" y1="8" x2="15" y2="16"/>
                        </svg>
                        {parsedData.barcode}
                      </div>
                    )}
                  </div>
                )}
                <div className="results-header">
                  <span className="results-title">Распознанный текст</span>
                  <button className="results-copy" onClick={copyResult}>
                    Копировать
                  </button>
                </div>
                <div className="results-body">
                  <div className="results-text markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="results-empty">
                <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
                <span className="results-empty-text">
                  Загрузите изображение ценника
                </span>
              </div>
            )}

            {history.length > 0 && (
              <div className="history-section">
                <h3 className="history-title">Недавние</h3>
                <div className="history-list">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className={`history-item ${item.parsed?.isPromo ? 'history-item-promo' : ''}`}
                      onClick={() => loadHistoryItem(item)}
                    >
                      <span className="history-item-text">
                        {item.parsed?.productName && item.parsed.productName !== 'Неизвестный товар'
                          ? item.parsed.productName
                          : item.text.slice(0, 40)}...
                      </span>
                      <div className="history-item-meta">
                        {item.parsed?.price && (
                          <span className={`history-item-price ${item.parsed.isPromo ? 'price-promo' : ''}`}>
                            {formatPrice(item.parsed.price, item.parsed.currency)}
                          </span>
                        )}
                        <span className="history-item-time">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {showCamera && (
        <div className="modal-overlay" onClick={closeCamera}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Камера</h3>
              <button className="modal-close" onClick={closeCamera}>
                <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="camera-preview">
              <video ref={videoRef} autoPlay playsInline />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeCamera}>
                Отмена
              </button>
              <button className="btn btn-primary" onClick={capturePhoto}>
                Сделать снимок
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectScan={(scan) => {
          setResult(scan.originalText)
          setParsedData(scan.extractedData)
          if (scan.imageData) {
            setImage(scan.imageData)
          }
          setShowHistory(false)
        }}
      />
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
