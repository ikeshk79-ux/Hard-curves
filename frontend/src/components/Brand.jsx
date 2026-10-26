import { useRef } from "react";
import { Dumbbell } from "lucide-react";

export const Brand = ({ size = "md", onLongPress, testId = "brand-logo" }) => {
  const timer = useRef(null);
  const big = size === "lg";
  const start = () => {
    if (!onLongPress) return;
    timer.current = setTimeout(onLongPress, 1000);
  };
  const stop = () => clearTimeout(timer.current);
  return (
    <div
      data-testid={testId}
      className="flex select-none items-center gap-2.5"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => onLongPress && e.preventDefault()}
    >
      <span className={`grid place-items-center rounded-lg bg-hc-lime text-hc-ink ${big ? "h-14 w-14" : "h-9 w-9"}`}>
        <Dumbbell className={big ? "h-8 w-8" : "h-5 w-5"} strokeWidth={2.5} />
      </span>
      <span className={`font-display font-black uppercase leading-none tracking-tight ${big ? "text-4xl" : "text-2xl"}`}>
        Hard <span className="text-hc-lime">Curves</span>
      </span>
    </div>
  );
};
