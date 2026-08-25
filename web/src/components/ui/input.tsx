import * as React from "react";
import { cn } from "@/lib/utils";

// Campo según el patrón shadcn/ui con los tokens de Órbita.
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] text-tinta placeholder:text-tinta-tenue disabled:cursor-not-allowed disabled:opacity-50",
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
