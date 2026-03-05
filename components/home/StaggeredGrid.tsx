'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function StaggeredGrid({ children }: { children: ReactNode[] }) {
  return (
    <>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
        >
          {child}
        </motion.div>
      ))}
    </>
  )
}
