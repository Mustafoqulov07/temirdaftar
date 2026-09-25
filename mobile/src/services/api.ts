import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://temirdaftar-backend.onrender.com/api';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

// 401 (sessiya tugashi) bo'lganda AuthContext logout qilishi uchun hook
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('token');
}

async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem('refreshToken');
}

async function saveTokens(accessToken: string, refreshToken?: string | null) {
  await AsyncStorage.setItem('token', accessToken);
  if (refreshToken) {
    await AsyncStorage.setItem('refreshToken', refreshToken);
  }
}

async function clearAuth() {
  await AsyncStorage.multiRemove(['token', 'refreshToken', 'user', 'store']);
}

// Token saqlangan refresh token orqali yangi access token olish.
// Backend refresh tokenni body orqali ham qabul qiladi (mobil uchun).
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      await clearAuth();
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.accessToken || data.token;
    if (!newAccessToken) {
      await clearAuth();
      return null;
    }
    await saveTokens(newAccessToken, data.refreshToken);
    return newAccessToken;
  } catch {
    return null;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {},
  isRetry = false
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const token = await getToken();

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Agar 401 bo'lsa va bu auth endpoint'i bo'lmasa — tokenni yangilab bir marta qayta urinamiz
  const isAuthEndpoint =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/refresh') ||
    endpoint.includes('/auth/register');

  if (res.status === 401 && !isAuthEndpoint && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiRequest<T>(endpoint, options, true);
    }
    // Refresh ham ishlamadi — sessiya tugadi
    if (onUnauthorized) onUnauthorized();
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error: any = new Error(data?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T = any>(endpoint: string, body: any) =>
    apiRequest<T>(endpoint, { method: 'POST', body }),
  put: <T = any>(endpoint: string, body: any) =>
    apiRequest<T>(endpoint, { method: 'PUT', body }),
  delete: <T = any>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};

export { clearAuth, saveTokens, getToken };
export default api;
