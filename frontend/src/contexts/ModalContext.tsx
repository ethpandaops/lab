import React, { createContext, useContext, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalContextType {
  showModal: (content: ReactNode) => void
  hideModal: () => void
}

const ModalContext = createContext<ModalContextType | null>(null)

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}

interface ModalProviderProps {
  children: ReactNode
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [modalContent, setModalContent] = useState<ReactNode | null>(null)

  const showModal = (content: ReactNode) => {
    setModalContent(content)
  }

  const hideModal = () => {
    setModalContent(null)
  }

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      {modalContent && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={hideModal}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md bg-surface/95 backdrop-blur-lg ring-1 ring-white/10 rounded-lg shadow-lg">
            {modalContent}
          </div>
        </div>,
        document.body
      )}
    </ModalContext.Provider>
  )
} 