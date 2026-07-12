import { ButtonHTMLAttributes } from "react";
import { Button as ShadcnButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const VARIANT_MAP = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  danger: "destructive",
} as const;

// This app's tap targets (py-3/py-4, larger than shadcn's compact default
// sizes) matter on a mobile-first PWA, so sizing stays a local override on
// top of the shared shadcn Button rather than shadcn's own size scale.
const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-sm h-auto",
  md: "px-5 py-3 text-base h-auto",
  lg: "px-6 py-4 text-lg h-auto",
};

export function Button({ variant = "primary", size = "md", fullWidth, className, ...props }: ButtonProps) {
  return (
    <ShadcnButton
      variant={VARIANT_MAP[variant]}
      className={cn("rounded-xl font-semibold active:scale-95", SIZE_CLASSES[size], fullWidth && "w-full", className)}
      {...props}
    />
  );
}
