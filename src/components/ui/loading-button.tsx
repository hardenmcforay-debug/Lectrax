"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
}

/**
 * Alias for Button with an explicit loading-oriented default type="submit".
 * Prefer `<Button loading={...} />` for most call sites; use this when you want
 * a named submit control in forms.
 */
const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ type = "submit", loading = false, ...props }, ref) => {
    return <Button ref={ref} type={type} loading={loading} {...props} />;
  }
);
LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
