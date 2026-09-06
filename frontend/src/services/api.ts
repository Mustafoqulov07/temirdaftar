import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// So'rov yuborishdan oldin token borligini tekshiramiz va headerga qo'shamiz
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Agar 401 Unauthorized qaytsa, Refresh Token orqali yangi Access Token olishga urinamiz
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Agar so'rov login, refresh yoki bloklangan foydalanuvchi bo'lsa, qayta urinmaymiz
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');
    const isBlocked = error.response?.data?.isBlocked;

    if (error.response && error.response.status === 401 && !isAuthEndpoint && !isBlocked && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
          const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          const newAccessToken = res.data.accessToken || res.data.token;
          const newRefreshToken = res.data.refreshToken;

          localStorage.setItem('token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          console.warn('Tokenni yangilash amalga oshmadi, sessiya tugagan:', refreshErr);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('store');
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshErr);
        }
      }
    }

    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('store');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
