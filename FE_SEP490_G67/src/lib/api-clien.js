import Axios from 'axios';

import { env } from '../config/env';
import publicRoutes from '../app/router/public.routes';

function authRequestInterceptor(config) {
  const publicEndpoints = publicRoutes.map(route => route.path);

  if (config.headers) {
    config.headers.Accept = 'application/json; charset=utf-8';
    
    if (!publicEndpoints.includes(config.url)) {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
  }

  config.withCredentials = true;
  return config;
}

export const api = Axios.create({
  baseURL: env.API_URL,
});

api.interceptors.request.use(authRequestInterceptor);
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || error.message;
    // Hiển thị thông báo lỗi
    console.error('API Error:', message);

    // Kiểm tra env trước khi redirect
    if (error.response?.status === 401 && env.ENABLE_AUTO_REDIRECT_LOGIN) {
      const searchParams = new URLSearchParams();
      const redirectTo =
        searchParams.get('redirectTo') || window.location.pathname;
    //   window.location.href = paths.auth.login.getHref(redirectTo);
    }

    return Promise.reject(error);
  },
);
