import React, { createContext, useContext, useState, useCallback } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Premium Toast Container - Ekranning yuqori qismida, har doim modallardan ham ustda */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center space-y-2.5 w-[92%] max-w-md pointer-events-none">
        {toasts.map((toast) => {
          let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
          let iconColor = 'text-blue-600';
          let Icon = InformationCircleIcon;
          let title = 'Maʻlumot';

          if (toast.type === 'success') {
            badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-500/10';
            iconColor = 'text-emerald-600';
            Icon = CheckCircleIcon;
            title = 'Muvaffaqiyatli';
          } else if (toast.type === 'error') {
            badgeColor = 'bg-red-50 text-red-800 border-red-200 shadow-red-500/10';
            iconColor = 'text-red-600';
            Icon = ExclamationCircleIcon;
            title = 'Xatolik';
          } else if (toast.type === 'warning') {
            badgeColor = 'bg-amber-50 text-amber-800 border-amber-200 shadow-amber-500/10';
            iconColor = 'text-amber-600';
            Icon = ExclamationCircleIcon;
            title = 'Diqqat';
          }

          return (
            <div
              key={toast.id}
              className={`w-full flex items-center justify-between p-3.5 bg-white border rounded-2xl shadow-xl pointer-events-auto transition-all duration-300 transform translate-y-0 animate-slide-in ${badgeColor}`}
              role="alert"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div className={`p-1.5 rounded-xl bg-white shadow-sm shrink-0 ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wider opacity-60 leading-none mb-0.5">
                    {title}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug break-words">
                    {toast.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                aria-label="Yopish"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
