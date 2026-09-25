import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setUnauthorizedHandler } from '@/services/api';

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

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  store: Store | null;
  loading: boolean;
  login: (phoneNumber: string, password: string) => Promise<void>;
  register: (data: {
    fullName: string;
    phoneNumber: string;
    password: string;
    storeName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  // Sessiya tugaganda (refresh ham ishlamasa) — toza holatga qaytish.
  // api.ts tomonidan chaqiriladi.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStore(null);
    });
  }, []);

  // Load saved auth from AsyncStorage on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const [storedToken, storedUser, storedStore] = await AsyncStorage.multiGet([
          'token',
          'user',
          'store',
        ]);

        if (storedToken[1] && storedUser[1]) {
          const parsedUser = JSON.parse(storedUser[1]);
          const parsedStore = storedStore[1] ? JSON.parse(storedStore[1]) : null;
          setUser(parsedUser);
          setStore(parsedStore);

          // Saqlangan ma'lumotlar eski bo'lishi mumkin — fonda yangilab olamiz.
          // 401 bo'lsa api.ts tomonidan sessiya tozalanadi.
          try {
            const profile = await api.get('/auth/profile');
            if (profile?.user) {
              setUser(profile.user);
              await AsyncStorage.setItem('user', JSON.stringify(profile.user));
            }
            if (profile?.store) {
              setStore(profile.store);
              await AsyncStorage.setItem('store', JSON.stringify(profile.store));
            }
          } catch {
            // 401 emas bo'lsa (masalan tarmoq xatosi) — saqlangan sessiya bilan davom etamiz
          }
        }
      } catch (e) {
        console.error('Auth yüklashda xatolik:', e);
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
  }, []);

  const persistSession = useCallback(
    async (userVal: User | null, storeVal: Store | null) => {
      setUser(userVal);
      setStore(storeVal);
      if (userVal) {
        await AsyncStorage.setItem('user', JSON.stringify(userVal));
      } else {
        await AsyncStorage.removeItem('user');
      }
      if (storeVal) {
        await AsyncStorage.setItem('store', JSON.stringify(storeVal));
      } else {
        await AsyncStorage.removeItem('store');
      }
    },
    []
  );

  const login = useCallback(
    async (phoneNumber: string, password: string) => {
      // Backend faqat token qaytaradi — user/store'ni /auth/profile orqali olamiz
      const response = await api.post<{ token?: string }>('/auth/login', {
        phoneNumber,
        password,
      });

      if (!response?.token) {
        throw new Error('Tizimga kirishda xatolik yuz berdi');
      }

      await persistSession(null, null);
      const profile = await api.get<{ user: User; store: Store | null }>('/auth/profile');
      await persistSession(profile.user, profile.store || null);
    },
    [persistSession]
  );

  const register = useCallback(
    async (data: {
      fullName: string;
      phoneNumber: string;
      password: string;
      storeName: string;
    }) => {
      const response = await api.post<{ token?: string }>('/auth/register', data);

      if (!response?.token) {
        throw new Error('Roʻyxatdan oʻtishda xatolik yuz berdi');
      }

      await persistSession(null, null);
      const profile = await api.get<{ user: User; store: Store | null }>('/auth/profile');
      await persistSession(profile.user, profile.store || null);
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    // Backend sessiyasini yopishga urinamiz — xato bo'lsa ham davom etamiz
    api.post('/auth/logout', {}).catch(() => {});
    setUnauthorizedHandler(null);
    setUser(null);
    setStore(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await api.get<{ user: User; store: Store | null }>('/auth/profile');
    await persistSession(profile.user, profile.store || null);
  }, [persistSession]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        store,
        loading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
