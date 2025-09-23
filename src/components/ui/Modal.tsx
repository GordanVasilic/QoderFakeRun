'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: string
  showCloseButton?: boolean
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-sm',
  showCloseButton = true 
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div 
      className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        zIndex: 9999
      }}
    >
      <div 
        ref={modalRef}
        className={`bg-white rounded-xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto transform transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            {title && (
              <h2 className="text-xl font-bold text-gray-900">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
        
        <div className={title || showCloseButton ? "p-2" : "p-4"}>
          {children}
        </div>
      </div>
    </div>
  )

  // Use portal to render at document body level
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null
}