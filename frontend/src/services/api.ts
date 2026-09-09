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
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken }, { withCredentials: true });

        // Response-dan yangi token-larni saqlash
        const { token, refreshToken: newRefreshToken } = response.data;
        if (token) {
          localStorage.setItem('token', token);
        }
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Original so'rovni retry qilish yangi token bilan
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        console.warn('Token refresh failed:', refreshErr);
        localStorage.removeItem('user');
        localStorage.removeItem('store');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
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
      localStorage.removeItem('refreshToken');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
