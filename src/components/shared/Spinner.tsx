import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={cn("w-6 h-6 animate-spin text-brand-500", className)} />;
}
