import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

// So'rov yuborishda token header-ga qo'shish
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 401 xatolar uchun refresh token logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
                          originalRequest?.url?.includes('/auth/refresh') ||
                          originalRequest?.url?.includes('/auth/register');
    const isBlocked = error.response?.data?.isBlocked;

    if (error.response && error.response.status === 401 && !isAuthEndpoint && !isBlocked && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const response = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Response-dan yangi token-ni saqlash (cookies-dan refreshToken avtomatik)
        const { token, accessToken } = response.data;
        const newToken = token || accessToken;
        if (newToken) {
          localStorage.setItem('token', newToken);
        }

        // Original so'rovni retry qilish yangi token bilan
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        console.warn('Token refresh failed:', refreshErr);
        localStorage.removeItem('user');
        localStorage.removeItem('store');
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }

    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('user');
      localStorage.removeItem('store');
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
