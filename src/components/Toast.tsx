import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

interface ToastApi {
  show: (message: string, icon?: ReactNode) => void
}

const ToastContext = createContext<ToastApi>({ show: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; icon?: ReactNode } | null>(null)
  const timer = useRef<number>(undefined)
  const reduce = useReducedMotion()

  const show = useCallback((message: string, icon?: ReactNode) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), message, icon })
    timer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              className="toast glass glass--thick"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96, filter: 'blur(6px)' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
            >
              {toast.icon}
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
