import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface User {
  id: string;
  phoneNumber: string;
  fullName: string;
  role?: string;
  isBlocked?: boolean;
  telegramId?: string | null;
}

interface Store {
  id: string;
  name: string;
  address?: string | null;
}

interface TelegramRegData {
  telegramId: string;
  fullName: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  store: Store | null;
  telegramRegData: TelegramRegData | null;
  login: (user: User, store: Store | null) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [telegramRegData, setTelegramRegData] = useState<TelegramRegData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFromLocalStorage = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedStore = localStorage.getItem('store');

        if (storedUser) {
          setUser(JSON.parse(storedUser));
          setStore(storedStore ? JSON.parse(storedStore) : null);
        }
      } catch (e) {
        console.error('localStorage dan maʼlumotlarni yuklashda xatolik:', e);
        localStorage.removeItem('user');
        localStorage.removeItem('store');
      } finally {
        setLoading(false);
      }
    };

    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initData) {
      tg.ready();
      tg.expand();

      api.post('/auth/telegram', { initData: tg.initData })
        .then((res) => {
          if (res.data.isNew) {
            setTelegramRegData({
              telegramId: res.data.telegramId,
              fullName: res.data.fullName,
            });
            setLoading(false);
          } else {
            const { user: newUser, store: newStore } = res.data;
            login(newUser, newStore || null);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Telegram authentication failed, falling back to local storage:', err);
          loadFromLocalStorage();
        });
    } else {
      loadFromLocalStorage();
    }
  }, []);

  const login = (newUser: User, newStore: Store | null) => {
    localStorage.setItem('user', JSON.stringify(newUser));
    if (newStore) {
      localStorage.setItem('store', JSON.stringify(newStore));
    } else {
      localStorage.removeItem('store');
    }

    setUser(newUser);
    setStore(newStore);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('store');

    setUser(null);
    setStore(null);
    setTelegramRegData(null);

    api.post('/auth/logout').catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        store,
        telegramRegData,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
