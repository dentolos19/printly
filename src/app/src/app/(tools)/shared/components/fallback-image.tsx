"use client";

import { AlertTriangle } from "lucide-react";
import { type ImgHTMLAttributes, useCallback, useState } from "react";

const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='100' y='95' text-anchor='middle' fill='%239ca3af' font-family='system-ui' font-size='14'%3EImage%3C/text%3E%3Ctext x='100' y='115' text-anchor='middle' fill='%239ca3af' font-family='system-ui' font-size='14'%3EUnavailable%3C/text%3E%3C/svg%3E`;

type FallbackImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "onError"> & {
  showBadge?: boolean;
  fallbackSrc?: string;
};

export function FallbackImage({ showBadge = true, fallbackSrc, className, alt, ...props }: FallbackImageProps) {
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(() => {
    setFailed(true);
  }, []);

  if (failed) {
    return (
      <div className={`relative ${className ?? ""}`}>
        <img {...props} src={fallbackSrc || PLACEHOLDER_SVG} alt={alt || "Unavailable"} className={className} />
        {showBadge && (
          <div className="bg-destructive/80 absolute top-1 right-1 rounded-full p-0.5" title="Asset failed to load">
            <AlertTriangle className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
    );
  }

  return <img {...props} alt={alt} className={className} onError={handleError} />;
}

export { PLACEHOLDER_SVG };
