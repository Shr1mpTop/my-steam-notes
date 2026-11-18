import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { EASE_OUT } from "../../lib/ui-constants";

export function Section({
  id,
  kicker,
  title,
  sub,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="section" id={id}>
      <motion.div
        className="section-head"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
      >
        <span className="kicker">{kicker}</span>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </motion.div>
      {children}
    </section>
  );
}
