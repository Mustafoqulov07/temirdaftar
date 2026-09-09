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
  token: string | null;
  telegramRegData: TelegramRegData | null;
  login: (token: string | null, user: User, store: Store | null) => void;
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
        // Token localStorage-da saqlanmaydi, faqat cookies-da saqlanyabdi
      } catch (e) {
        console.error('Storage maʼlumotlarni yuklashda xatolik:', e);
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
            // Token cookies-da saqlanyabdi
            // User va store ma'lumotlarini fetch qilish
            api.get('/auth/profile')
              .then((profileRes) => {
                const { user, store } = profileRes.data;
                login(null, user, store);
                setLoading(false);
              })
              .catch((err) => {
                console.error('Profile fetch failed:', err);
                setLoading(false);
              });
          }
        })
        .catch((err) => {
          console.error('Telegram authentication failed:', err);
          loadFromLocalStorage();
        });
    } else {
      loadFromLocalStorage();
    }
  }, []);

  const login = (token: string | null, newUser: User, newStore: Store | null) => {
    // Token cookies-da saqlanyabdi, localStorage-ga saqlanmaydi
    setToken(token);
    setUser(newUser);
    setStore(newStore);
  };

  const logout = () => {
    localStorage.removeItem('token');
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
