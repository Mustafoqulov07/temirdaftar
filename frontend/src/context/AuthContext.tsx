import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface User {
  id: string;
  phoneNumber: string;
  fullName: string;
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
  token: string | null;
  telegramRegData: TelegramRegData | null;
  login: (token: string, user: User, store: Store) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [telegramRegData, setTelegramRegData] = useState<TelegramRegData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFromLocalStorage = () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const storedStore = localStorage.getItem('store');

        if (storedToken && storedUser && storedStore) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setStore(JSON.parse(storedStore));
        }
      } catch (e) {
        console.error('localStorage dan maʼlumotlarni yuklashda xatolik:', e);
        localStorage.removeItem('token');
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
            const { token: newToken, user: newUser, store: newStore } = res.data;
            login(newToken, newUser, newStore);
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

  const login = (newToken: string, newUser: User, newStore: Store) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('store', JSON.stringify(newStore));

    setToken(newToken);
    setUser(newUser);
    setStore(newStore);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('store');

    setToken(null);
    setUser(null);
    setStore(null);
    setTelegramRegData(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        user,
        store,
        token,
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
