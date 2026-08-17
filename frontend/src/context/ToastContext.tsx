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
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let bgColor = 'bg-blue-50 border-blue-100 text-blue-800';
          let Icon = InformationCircleIcon;
          let iconColor = 'text-blue-500';

          if (toast.type === 'success') {
            bgColor = 'bg-emerald-50 border-emerald-100 text-emerald-800';
            Icon = CheckCircleIcon;
            iconColor = 'text-emerald-500';
          } else if (toast.type === 'error') {
            bgColor = 'bg-rose-50 border-rose-100 text-rose-800';
            Icon = ExclamationCircleIcon;
            iconColor = 'text-rose-500';
          } else if (toast.type === 'warning') {
            bgColor = 'bg-amber-50 border-amber-100 text-amber-800';
            Icon = ExclamationCircleIcon;
            iconColor = 'text-amber-500';
          }

          return (
            <div
              key={toast.id}
              className={`flex items-start p-4 border rounded-2xl shadow-lg pointer-events-auto transition-all duration-300 transform translate-y-0 animate-slide-in ${bgColor}`}
              role="alert"
            >
              <Icon className={`w-5 h-5 mr-3 shrink-0 ${iconColor}`} />
              <div className="text-sm font-semibold flex-1 leading-tight">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
