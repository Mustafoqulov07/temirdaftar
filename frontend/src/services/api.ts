import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

// So'rov yuborishda token header-ga qo'shish yoki cookies-dan olish
api.interceptors.request.use(
  (config) => {
    // Token localStorage-dan o'qish (agarda bor bo'lsa)
    // Aks holda cookies-dan avtomatik yuboriladi (withCredentials: true)
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
        await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Token cookies-da yangilandi, response-da token yo'q
        // Original so'rovni retry qilish
        return api(originalRequest);
      } catch (refreshErr) {
        console.warn('Token refresh failed:', refreshErr);
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }

    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
