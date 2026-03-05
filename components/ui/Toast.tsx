'use client'

import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const icon = toast.type === 'success'
    ? <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
    : toast.type === 'error'
      ? <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
      : <AlertCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />

  const borderColor = toast.type === 'success'
    ? 'border-l-success'
    : toast.type === 'error'
      ? 'border-l-error'
      : 'border-l-primary-600'

  return (
    <div
      className={[
        'bg-white rounded-card shadow-card-hover border border-gray-200 border-l-4 px-4 py-3',
        'flex items-center gap-3 min-w-[280px] max-w-sm animate-in slide-in-from-right',
        borderColor,
      ].join(' ')}
    >
      {icon}
      <p className="text-sm text-gray-700 flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
