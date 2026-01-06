import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-neutral-900",
          "placeholder:text-neutral-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-error-300 focus-visible:ring-error-500"
            : "border-neutral-300 focus-visible:ring-primary-500 hover:border-neutral-400",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
