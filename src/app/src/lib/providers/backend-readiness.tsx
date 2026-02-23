"use client";

import { API_URL } from "@/environment";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type BackendReadinessStatus = "checking" | "ready" | "unavailable";

type BackendReadinessContextValue = {
  status: BackendReadinessStatus;
  isBlocked: boolean;
  retryInSeconds: number;
  attempts: number;
  markUnavailable: () => void;
  markReady: () => void;
  reportResponse: (response: Response) => void;
};

const RETRY_INTERVAL_MS = 3000;
const PROBE_TIMEOUT_MS = 6000;
const RETRYABLE_BACKEND_STATUS = new Set([502, 503, 504, 520, 521, 522, 523, 524, 525, 526]);

const BackendReadinessContext = createContext<BackendReadinessContextValue>({
  status: "checking",
  isBlocked: false,
  retryInSeconds: Math.ceil(RETRY_INTERVAL_MS / 1000),
  attempts: 0,
  markUnavailable: () => {},
  markReady: () => {},
  reportResponse: () => {},
});

export function useBackendReadiness() {
  return useContext(BackendReadinessContext);
}

export default function BackendReadinessProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<BackendReadinessStatus>("checking");
  const [retryInSeconds, setRetryInSeconds] = useState(Math.ceil(RETRY_INTERVAL_MS / 1000));
  const [attempts, setAttempts] = useState(0);
  const statusRef = useRef<BackendReadinessStatus>("checking");

  const markUnavailable = useCallback(() => {
    setStatus((previous) => (previous === "unavailable" ? previous : "unavailable"));
    setRetryInSeconds(Math.ceil(RETRY_INTERVAL_MS / 1000));
  }, []);

  const markReady = useCallback(() => {
    setStatus((previous) => (previous === "ready" ? previous : "ready"));
  }, []);

  const reportResponse = useCallback(
    (response: Response) => {
      if (RETRYABLE_BACKEND_STATUS.has(response.status)) {
        markUnavailable();
        return;
      }

      markReady();
    },
    [markReady, markUnavailable],
  );

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const probeBackend = useCallback(async () => {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), PROBE_TIMEOUT_MS);

    try {
      const response = await globalThis.fetch(`${API_URL}/ready`, {
        method: "GET",
        cache: "no-store",
        signal: abortController.signal,
      });

      if (response.ok) {
        markReady();
        return;
      }

      markUnavailable();
    } catch {
      markUnavailable();
    } finally {
      clearTimeout(timeout);
    }
  }, [markReady, markUnavailable]);

  useEffect(() => {
    if (status === "ready") {
      return;
    }

    setRetryInSeconds(Math.ceil(RETRY_INTERVAL_MS / 1000));

    const countdown = setInterval(() => {
      setRetryInSeconds((value) => {
        if (value <= 1) {
          return Math.ceil(RETRY_INTERVAL_MS / 1000);
        }

        return value - 1;
      });
    }, 1000);

    const runProbe = async () => {
      setAttempts((value) => value + 1);
      await probeBackend();
    };

    void runProbe();
    const interval = setInterval(() => {
      if (statusRef.current === "ready") {
        return;
      }

      void runProbe();
    }, RETRY_INTERVAL_MS);

    return () => {
      clearInterval(countdown);
      clearInterval(interval);
    };
  }, [probeBackend, status]);

  const value = useMemo<BackendReadinessContextValue>(
    () => ({
      status,
      isBlocked: status === "unavailable",
      retryInSeconds,
      attempts,
      markUnavailable,
      markReady,
      reportResponse,
    }),
    [attempts, markReady, markUnavailable, reportResponse, retryInSeconds, status],
  );

  return <BackendReadinessContext.Provider value={value}>{children}</BackendReadinessContext.Provider>;
}
