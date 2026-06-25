import { useState } from "react";
import { Button } from "../shared/Button";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}

export function StepName({ value, onChange, onNext }: Props) {
  const [touched, setTouched] = useState(false);
  const valid = value.trim().length >= 2;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-2">Step 1 of 5</p>
        <h1 className="text-3xl font-bold">What's your name?</h1>
        <p className="text-neutral-400 mt-2">Your personal training plan starts here.</p>
      </div>

      <input
        type="text"
        placeholder="Your first name"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setTouched(true);
        }}
        onKeyDown={(e) => e.key === "Enter" && valid && onNext()}
        className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-lg text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
        autoFocus
      />
      {touched && !valid && (
        <p className="text-red-400 text-sm -mt-5">Please enter at least 2 characters.</p>
      )}

      <Button onClick={onNext} disabled={!valid} fullWidth size="lg">
        Continue
      </Button>
    </div>
  );
}
