import Axios from 'axios';

import { env } from '../config/env';

function authRequestInterceptor(config) {
  if (config.headers) {
    config.headers.Accept = 'application/json';
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
    // 🆕 Hiển thị thông báo lỗi
    console.error('API Error:', message);

    // 🆕 Kiểm tra env trước khi redirect
    if (error.response?.status === 401 && env.ENABLE_AUTO_REDIRECT_LOGIN) {
      const searchParams = new URLSearchParams();
      const redirectTo =
        searchParams.get('redirectTo') || window.location.pathname;
    //   window.location.href = paths.auth.login.getHref(redirectTo);
    }

    return Promise.reject(error);
  },
);