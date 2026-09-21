import Axios from 'axios';

import { env } from '../config/env';
import publicRoutes from '../app/router/public.routes';
import { setCacheEntry, getCacheEntry } from './offlineCache';
import { saveOfflineProducts, saveOfflineCustomers } from './db';
import { reportNetworkFailure } from '../hooks/useOnlineStatus';

function authRequestInterceptor(config) {
  // Những endpoint API không cần đính kèm token
  const publicApiEndpoints = [
    '/auth/token',
    '/auth/introspect',
    '/auth/logout',
    '/auth/refresh',
    '/auth/forgot-password/initiate',
    '/auth/forgot-password/verify-otp',
    '/auth/forgot-password/change-password'
  ];

  if (config.headers) {
    config.headers.Accept = 'application/json; charset=utf-8';
    
    // Nếu không phải là public API endpoint thì mới gắn token
    if (!publicApiEndpoints.includes(config.url)) {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
  }

  config.withCredentials = true;
  return config;
}

function getRequestCacheKey(config) {
  if (!config) return '';
  let url = config.url || '';
  if (config.params) {
    const searchParams = new URLSearchParams();
    Object.entries(config.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        searchParams.append(k, String(v));
      }
    });
    searchParams.sort();
    const query = searchParams.toString();
    if (query) {
      url += (url.includes('?') ? '&' : '?') + query;
    }
  }
  return url;
}

export const api = Axios.create({
  baseURL: env.API_URL,
});

api.interceptors.request.use(authRequestInterceptor);
api.interceptors.response.use(
  (response) => {
    // Transparent offline caching for successful GET requests
    if (response.config && response.config.method?.toLowerCase() === 'get') {
      const cacheKey = getRequestCacheKey(response.config);
      setCacheEntry(cacheKey, response.data).catch((err) => {
        console.warn('[ApiClient] Failed to cache response:', err);
      });

      // Proactively extract and update structured tables
      try {
        const result = response.data?.result;
        if (result) {
          if (response.config.url?.includes('/products')) {
            if (Array.isArray(result)) {
              saveOfflineProducts(result);
            } else if (Array.isArray(result.content)) {
              saveOfflineProducts(result.content);
            } else if (result.id != null) {
              saveOfflineProducts([result]);
            }
          } else if (response.config.url?.includes('/customers')) {
            if (Array.isArray(result)) {
              saveOfflineCustomers(result);
            } else if (Array.isArray(result.content)) {
              saveOfflineCustomers(result.content);
            } else if (result.id != null) {
              saveOfflineCustomers([result]);
            }
          }
        }
      } catch (err) {
        console.warn('[OfflineCache] Error extracting structured records:', err);
      }
    }

    if (response.config?.responseType === 'blob') {
      return response;
    }

    return response.data;
  },
  async (error) => {
    const config = error.config;
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.message?.toLowerCase().includes('network');
    if (isNetworkError) {
      reportNetworkFailure();
    }

    // If network failed and this was a GET request, check if we have cached response
    if (isNetworkError && config && config.method?.toLowerCase() === 'get') {
      const cacheKey = getRequestCacheKey(config);
      const cached = await getCacheEntry(cacheKey);
      if (cached && cached.data) {
        console.info(`[Offline Cache] Serving cached response for ${cacheKey}`);
        return {
          ...cached.data,
          _fromCache: true,
          _cachedAt: cached.updatedAt,
          _isStale: cached.isStale
        };
      }
    }

    const message = error.response?.data?.message || error.message;
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
