"use client";

import { useCallback, useEffect, useRef } from "react";

type UseUnsavedChangesGuardOptions = {
  when: boolean;
  message?: string;
};

type UseUnsavedChangesGuardReturn = {
  allowNextNavigation: () => void;
  confirmNavigation: (targetUrl?: string | URL | null) => boolean;
};

const DEFAULT_MESSAGE = "You have unsaved changes. Are you sure you want to leave this page?";

type ToolRouteInfo = {
  tool: "designer" | "imprinter";
  idSegment: string;
};

function parseAbsoluteUrl(url: string | URL | null | undefined, fallbackUrl: string): string {
  if (!url) return fallbackUrl;
  return new URL(url.toString(), fallbackUrl).toString();
}

function getToolRouteInfo(url: string): ToolRouteInfo | null {
  const pathname = new URL(url).pathname;
  const segments = pathname.split("/").filter(Boolean);

  // Match exactly /designer/{idLike} or /imprinter/{idLike}
  if (segments.length !== 2) {
    return null;
  }

  const [tool, idSegment] = segments;
  if ((tool === "designer" || tool === "imprinter") && idSegment.length > 0) {
    return { tool, idSegment };
  }

  return null;
}

function isSameToolIdRouteTransition(fromUrl: string, toUrl: string): boolean {
  const fromRoute = getToolRouteInfo(fromUrl);
  const toRoute = getToolRouteInfo(toUrl);

  return !!fromRoute && !!toRoute && fromRoute.tool === toRoute.tool;
}

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

  const confirmNavigation = useCallback((targetUrl?: string | URL | null) => {
    if (!whenRef.current) {
      return true;
    }

    const fromUrl = currentUrlRef.current || window.location.href;
    const toUrl = parseAbsoluteUrl(targetUrl, window.location.href);

    if (isSameToolIdRouteTransition(fromUrl, toUrl)) {
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

    const shouldAllowNavigation = (targetUrl?: string | URL | null) => {
      if (skipNextNavigationRef.current) {
        skipNextNavigationRef.current = false;
        return true;
      }

      if (!whenRef.current) {
        return true;
      }

      const fromUrl = currentUrlRef.current || window.location.href;
      const toUrl = parseAbsoluteUrl(targetUrl, window.location.href);

      if (isSameToolIdRouteTransition(fromUrl, toUrl)) {
        return true;
      }

      return window.confirm(messageRef.current);
    };

    window.history.pushState = function pushState(data: unknown, unused: string, url?: string | URL | null) {
      if (!shouldAllowNavigation(url)) {
        return;
      }

      originalPushState(data, unused, url);
      currentUrlRef.current = parseAbsoluteUrl(url, window.location.href);
    };

    window.history.replaceState = function replaceState(data: unknown, unused: string, url?: string | URL | null) {
      if (!shouldAllowNavigation(url)) {
        return;
      }

      originalReplaceState(data, unused, url);
      currentUrlRef.current = parseAbsoluteUrl(url, window.location.href);
    };

    const onPopState = () => {
      if (!shouldAllowNavigation(window.location.href)) {
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
