import { useRef } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import { EASE_OUT } from "../../lib/ui-constants";

/** Glass card with a cursor-following spotlight and springy reveal. */
export function GlowCard({
  children,
  className,
  delay = 0,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <motion.div
      ref={ref}
      className={`glass spot${className ? ` ${className}` : ""}`}
      style={style}
      onMouseMove={onMove}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.62, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
