import { useEffect, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_OUT } from "../lib/ui-constants";

interface PanelProps {
  kicker?: string;
  title?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
}

/** Glass panel with hairline border + staggered entrance. */
export function Panel({ kicker, title, sub, actions, children, delay = 0, className }: PanelProps) {
  return (
    <motion.section
      className={`panel${className ? ` ${className}` : ""}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-32px" }}
      transition={{ duration: 0.55, delay, ease: EASE_OUT }}
    >
      {(kicker || title || sub || actions) && (
        <div className="panel-head">
          {kicker && <span className="panel-kicker">{kicker}</span>}
          {title && <h3 className="panel-title">{title}</h3>}
          {sub && <span className="panel-sub">{sub}</span>}
          {actions}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </motion.section>
  );
}

/** Framer entrance wrapper for arbitrary content (chips, rows, cells). */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-24px" }}
      transition={{ duration: 0.45, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
}

/** Rolling number — counts up on mount and re-rolls when value changes. */
export function AnimatedNumber({ value, decimals = 0, suffix, duration = 0.9 }: AnimatedNumberProps) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(() => (0).toFixed(decimals));

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (latest) => {
        setDisplay(
          latest.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }),
        );
      },
    });
    return () => controls.stop();
  }, [mv, value, decimals, duration]);

  return (
    <>
      {display}
      {suffix ?? null}
    </>
  );
}
