import { useEffect, useState } from "react";

export type TextSize = "sm" | "md" | "lg";

const STORAGE_KEY = "textSize";

// Every Tailwind text-* utility is rem-based, so scaling the root font-size
// scales the whole app's type proportionally without touching each screen.
const ROOT_FONT_SIZE: Record<TextSize, string> = {
  sm: "14px",
  md: "16px",
  lg: "19px",
};

function readStoredTextSize(): TextSize {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "sm" || stored === "lg" ? stored : "md";
}

export function useTextSize() {
  const [textSize, setTextSizeState] = useState<TextSize>(() => readStoredTextSize());

  useEffect(() => {
    document.documentElement.style.fontSize = ROOT_FONT_SIZE[textSize];
  }, [textSize]);

  const setTextSize = (size: TextSize) => {
    localStorage.setItem(STORAGE_KEY, size);
    setTextSizeState(size);
  };

  return { textSize, setTextSize };
}
