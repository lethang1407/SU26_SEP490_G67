import { useState, useRef, useCallback, useEffect } from 'react';
import { createPayosCheckout, getPayosCheckoutStatus, cancelPayosCheckout } from '../api';

const POLL_BASE_MS = 3000;
const POLL_MAX_MS = 24000;
const PENDING_STATUSES = ['PENDING', 'PROCESSING'];

export function isSettled(status) {
    return status != null && !PENDING_STATUSES.includes(status);
}

export function usePayosCheckout({ onPaid } = {}) {
    const [session, setSession] = useState(null);
    const [opening, setOpening] = useState(false);
    const [error, setError] = useState(null);
    const [pollDelayMs, setPollDelayMs] = useState(POLL_BASE_MS);
    const [pollTick, setPollTick] = useState(0);
    const throttled = pollDelayMs > POLL_BASE_MS;

    const onPaidRef = useRef(onPaid);
    useEffect(() => {
        onPaidRef.current = onPaid;
    });

    const settledCodeRef = useRef(null);

    const sessionRef = useRef(null);
    useEffect(() => {
        sessionRef.current = session;
    });

    const abandon = useCallback(async (target, reason) => {
        if (!target || target.status === 'PAID') return;
        try {
            await cancelPayosCheckout(target.payosOrderCode, reason);
        } catch {
        }
    }, []);


    const open = useCallback(async (payload) => {
        const previous = sessionRef.current;

        setOpening(true);
        setError(null);
        settledCodeRef.current = null;
        setPollDelayMs(POLL_BASE_MS);
        setPollTick(0);

        if (previous) {
            await abandon(previous, 'Gio hang thay doi');
        }

        try {
            const created = await createPayosCheckout(payload);
            setSession(created);
            return created;
        } catch (err) {
            const message = err.response?.data?.message
                || 'Không tạo được mã QR chuyển khoản. Vui lòng thử lại.';
            setError(message);
            setSession(null);
            return null;
        } finally {
            setOpening(false);
        }
    }, [abandon]);

    const close = useCallback(async () => {
        const current = sessionRef.current;
        setSession(null);
        setError(null);
        settledCodeRef.current = null;
        await abandon(current, 'Thu ngan dong ma QR');
    }, [abandon]);

    const [refreshing, setRefreshing] = useState(false);

    const refresh = useCallback(async () => {
        if (!session || refreshing) return null;
        setRefreshing(true);
        try {
            const latest = await getPayosCheckoutStatus(session.payosOrderCode);
            setSession(latest);
            setPollDelayMs(POLL_BASE_MS);
            return latest;
        } catch {
            setPollDelayMs((current) => Math.min(current * 2, POLL_MAX_MS));
            return null;
        } finally {
            setRefreshing(false);
            setPollTick((tick) => tick + 1);
        }
    }, [session, refreshing]);

    const payosOrderCode = session?.payosOrderCode ?? null;
    const status = session?.status ?? null;

    useEffect(() => {
        if (!payosOrderCode || isSettled(status)) return undefined;

        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const latest = await getPayosCheckoutStatus(payosOrderCode);
                if (cancelled) return;
                setSession(latest);
                setPollDelayMs(POLL_BASE_MS);
            } catch {
                if (cancelled) return;
                setPollDelayMs((current) => Math.min(current * 2, POLL_MAX_MS));
            } finally {
                if (!cancelled) setPollTick((tick) => tick + 1);
            }
        }, pollDelayMs);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [payosOrderCode, status, pollDelayMs, pollTick]);

    useEffect(() => {
        if (status !== 'PAID' || !session) return;
        if (settledCodeRef.current === session.payosOrderCode) return;
        settledCodeRef.current = session.payosOrderCode;
        onPaidRef.current?.(session);
    }, [status, session]);

    return {
        session,
        status,
        opening,
        error,
        setError,
        throttled,
        refreshing,
        open,
        close,
        refresh,
    };
}
