"use client";

import * as React from "react";

function VisuallyHidden({ className, ...props }: React.ComponentProps<"span">) {
  return <span className="sr-only" {...props} />;
}

export { VisuallyHidden };
