import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setApiToken } from '../services/api';

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
    let cancelled = false;

    const finishLoading = () => {
      if (!cancelled) setLoading(false);
    };

    // Saqlangan token bo'lsa — user/store ma'lumotlarini /auth/profile orqali
    // qayta yuklaymiz. Aks holda sahifa refresh qilinganda user = null bo'lib qoladi
    // (masalan SUPER_ADMIN admin sahifasiga qayta kira olmasdi).
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        finishLoading();
        return;
      }

      setToken(storedToken);
      setApiToken(storedToken);

      try {
        const profileRes = await api.get('/auth/profile');
        if (cancelled) return;
        const { user: profileUser, store: profileStore } = profileRes.data;
        setUser(profileUser);
        setStore(profileStore);
      } catch (err: any) {
        // 401 interceptor tomonidan refresh/redirect qilinadi — bu yerda faqat
        // boshqa xatolarni loglaymiz va sessiyani tozalaymiz
        console.error('Sessiyani tiklashda xatolik:', err);
        if (cancelled) return;
        if (err?.response?.status !== 401) {
          setApiToken(null);
          setToken(null);
        }
      } finally {
        finishLoading();
      }
    };

    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initData) {
      tg.ready();
      tg.expand();

      api.post('/auth/telegram', { initData: tg.initData })
        .then(async (res) => {
          if (cancelled) return;
          if (res.data.isNew) {
            setTelegramRegData({
              telegramId: res.data.telegramId,
              fullName: res.data.fullName,
            });
            finishLoading();
          } else {
            const { token: newToken } = res.data;
            if (newToken) {
              setApiToken(newToken);
              setToken(newToken);
            }

            // User va store ma'lumotlarini fetch qilish
            const profileRes = await api.get('/auth/profile');
            if (cancelled) return;
            const { user: profileUser, store: profileStore } = profileRes.data;
            setUser(profileUser);
            setStore(profileStore);
            finishLoading();
          }
        })
        .catch((err) => {
          console.error('Telegram authentication failed:', err);
          restoreSession();
        });
    } else {
      restoreSession();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const login = (newToken: string | null, newUser: User, newStore: Store | null) => {
    // Token memory + localStorage-da saqlanadi (API interceptor-da ishlatiladi)
    if (newToken) {
      setApiToken(newToken);
    }
    setToken(newToken);
    setUser(newUser);
    setStore(newStore);
  };

  const logout = () => {
    // Backend sessiyasini (refresh cookie) ham yopamiz — hatto xato bo'lsa ham davom etamiz
    api.post('/auth/logout').catch(() => {});
    setApiToken(null);
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
