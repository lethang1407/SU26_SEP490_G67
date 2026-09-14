import { useState, useEffect, useCallback } from 'react';
import { env } from '@/config/env';

// Clear any accidental old localStorage flag so browser is never stuck
if (typeof window !== 'undefined') {
    localStorage.removeItem('force_offline_mode');
}

let currentIsOnline = typeof window !== 'undefined' ? window.navigator.onLine : true;
let listeners = new Set();
let pingTimer = null;
let isChecking = false;
let lastChecked = Date.now();

function notifyListeners() {
    listeners.forEach(fn => {
        try {
            fn(currentIsOnline);
        } catch (err) {
            console.warn('[useOnlineStatus] Listener notification error:', err);
        }
    });
}

function updateStatus(newStatus) {
    if (currentIsOnline !== newStatus) {
        currentIsOnline = newStatus;
        notifyListeners();
    }
}

/**
 * Perform genuine Internet connectivity probe.
 * When a user turns off Wi-Fi or disconnects internet, localhost continues to respond,
 * but real public endpoints immediately fail with DNS/socket errors.
 */
async function probeUrl(url, timeoutMs = 2000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return true;
    } catch {
        clearTimeout(timeoutId);
        return false;
    }
}

export async function checkRealInternet() {
    // 1. If the browser already knows it's offline
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
        return false;
    }

    // 2. Probe public endpoint 1: Google generate_204 (Android/Chromium standard)
    const gstaticOk = await probeUrl('https://connectivitycheck.gstatic.com/generate_204', 1800);
    if (gstaticOk) return true;

    // 3. Fallback probe 2: Cloudflare 1.1.1.1
    const cfOk = await probeUrl('https://1.1.1.1/cdn-cgi/trace', 1800);
    if (cfOk) return true;

    // 4. Fallback probe 3: Google 204
    const googleOk = await probeUrl('https://www.google.com/generate_204', 1800);
    if (googleOk) return true;

    return false;
}

/**
 * Full connectivity verification.
 */
export async function verifyConnection() {
    if (isChecking) return currentIsOnline;
    isChecking = true;

    try {
        // Fast-fail if browser navigator reports offline
        if (typeof window !== 'undefined' && !window.navigator.onLine) {
            updateStatus(false);
            lastChecked = Date.now();
            return false;
        }

        // Check real Internet connectivity
        const hasInternet = await checkRealInternet();
        if (!hasInternet) {
            updateStatus(false);
            lastChecked = Date.now();
            return false;
        }

        // If backend API is on a remote host (not localhost), also verify it's reachable
        const isLocalhost = !env.API_URL || env.API_URL.includes('localhost') || env.API_URL.includes('127.0.0.1');
        if (!isLocalhost) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const res = await fetch(`${env.API_URL}/store/payment-info`, {
                    method: 'GET',
                    cache: 'no-store',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (!res || res.status === 0) {
                    updateStatus(false);
                    lastChecked = Date.now();
                    return false;
                }
            } catch (backendErr) {
                console.warn('[useOnlineStatus] Backend health probe failed:', backendErr);
                updateStatus(false);
                lastChecked = Date.now();
                return false;
            }
        }

        updateStatus(true);
        lastChecked = Date.now();
        return true;
    } finally {
        isChecking = false;
    }
}

/**
 * Called by Axios interceptor or any request failure to immediately switch to offline
 * without waiting for the timer.
 */
export function reportNetworkFailure() {
    updateStatus(false);
    setTimeout(verifyConnection, 1000);
}

// Optional toggle function for manual debugging if ever needed
export function toggleOfflineMode(forceValue) {
    const next = typeof forceValue === 'boolean' ? forceValue : !currentIsOnline;
    updateStatus(next);
    return next;
}

if (typeof window !== 'undefined') {
    window.toggleOffline = toggleOfflineMode;
}

function setupGlobalListeners() {
    if (typeof window === 'undefined') return;

    // Instant reaction to browser events
    window.addEventListener('offline', () => {
        updateStatus(false);
    });

    window.addEventListener('online', () => {
        verifyConnection();
    });

    // Check whenever tab becomes active or focused
    window.addEventListener('focus', () => {
        verifyConnection();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            verifyConnection();
        }
    });

    // Active automatic polling every 2.5 seconds
    if (!pingTimer) {
        pingTimer = setInterval(() => {
            verifyConnection();
        }, 2500);
    }
}

setupGlobalListeners();

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(currentIsOnline);

    useEffect(() => {
        const handler = (status) => setIsOnline(status);
        listeners.add(handler);
        setIsOnline(currentIsOnline);

        // Immediate check on mount
        verifyConnection();

        return () => {
            listeners.delete(handler);
        };
    }, []);

    const checkNow = useCallback(async () => {
        return await verifyConnection();
    }, []);

    return {
        isOnline,
        isOffline: !isOnline,
        toggleOffline: toggleOfflineMode,
        checkNow,
        lastChecked
    };
}
