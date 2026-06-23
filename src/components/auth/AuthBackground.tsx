'use client'
import { motion } from 'framer-motion'

export function AuthBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Subtle dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(99,102,241,0.12)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(99,102,241,0.2)_1px,transparent_1px)] [background-size:40px_40px]" />

      {/* Top-left orb */}
      <motion.div
        animate={{ x: [0, 50, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-48 -left-48 h-[600px] w-[600px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-3xl"
      />

      {/* Bottom-right orb */}
      <motion.div
        animate={{ x: [0, -40, 0], y: [0, 50, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-48 -right-48 h-[600px] w-[600px] rounded-full bg-violet-500/10 dark:bg-violet-500/15 blur-3xl"
      />

      {/* Center accent */}
      <motion.div
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0], scale: [1, 1.05, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-purple-500/6 dark:bg-purple-500/10 blur-3xl"
      />

      {/* Top-right accent */}
      <motion.div
        animate={{ y: [0, 30, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute top-0 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-400/8 dark:bg-indigo-400/12 blur-3xl"
      />
    </div>
  )
}
