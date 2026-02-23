"use client";

import { useCallback, useEffect, useRef } from "react";

type UseUnsavedChangesGuardOptions = {
  when: boolean;
  message?: string;
};

type UseUnsavedChangesGuardReturn = {
  allowNextNavigation: () => void;
  confirmNavigation: () => boolean;
};

const DEFAULT_MESSAGE = "You have unsaved changes. Are you sure you want to leave this page?";

export function useUnsavedChangesGuard({ when, message = DEFAULT_MESSAGE }: UseUnsavedChangesGuardOptions) {
  const whenRef = useRef(when);
  const messageRef = useRef(message);
  const skipNextNavigationRef = useRef(false);
  const currentUrlRef = useRef<string>(typeof window === "undefined" ? "" : window.location.href);

  useEffect(() => {
    whenRef.current = when;
  }, [when]);

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  const allowNextNavigation = useCallback(() => {
    skipNextNavigationRef.current = true;
  }, []);

  const confirmNavigation = useCallback(() => {
    if (!whenRef.current) {
      return true;
    }

    return window.confirm(messageRef.current);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!whenRef.current || skipNextNavigationRef.current) {
        skipNextNavigationRef.current = false;
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    const parseUrl = (url: string | URL | null | undefined): string => {
      if (!url) return window.location.href;
      return new URL(url.toString(), window.location.href).toString();
    };

    const shouldAllowNavigation = () => {
      if (skipNextNavigationRef.current) {
        skipNextNavigationRef.current = false;
        return true;
      }

      if (!whenRef.current) {
        return true;
      }

      return window.confirm(messageRef.current);
    };

    window.history.pushState = function pushState(data: unknown, unused: string, url?: string | URL | null) {
      if (!shouldAllowNavigation()) {
        return;
      }

      originalPushState(data, unused, url);
      currentUrlRef.current = parseUrl(url);
    };

    window.history.replaceState = function replaceState(data: unknown, unused: string, url?: string | URL | null) {
      if (!shouldAllowNavigation()) {
        return;
      }

      originalReplaceState(data, unused, url);
      currentUrlRef.current = parseUrl(url);
    };

    const onPopState = () => {
      if (!shouldAllowNavigation()) {
        skipNextNavigationRef.current = true;
        originalPushState(window.history.state, "", currentUrlRef.current);
        return;
      }

      currentUrlRef.current = window.location.href;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  return {
    allowNextNavigation,
    confirmNavigation,
  } satisfies UseUnsavedChangesGuardReturn;
}
