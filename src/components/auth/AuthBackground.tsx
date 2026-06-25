'use client'
import { motion } from 'framer-motion'

export function AuthBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Subtle dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(147,51,234,0.1)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(147,51,234,0.18)_1px,transparent_1px)] [background-size:40px_40px]" />

      {/* Top-left orb — orange */}
      <motion.div
        animate={{ x: [0, 50, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-48 -left-48 h-[600px] w-[600px] rounded-full bg-orange-500/10 dark:bg-orange-500/15 blur-3xl"
      />

      {/* Bottom-right orb — cyan */}
      <motion.div
        animate={{ x: [0, -40, 0], y: [0, 50, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-48 -right-48 h-[600px] w-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 blur-3xl"
      />

      {/* Center accent — purple */}
      <motion.div
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0], scale: [1, 1.05, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-purple-600/8 dark:bg-purple-600/12 blur-3xl"
      />

      {/* Top-right accent — pink */}
      <motion.div
        animate={{ y: [0, 30, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute top-0 right-1/4 h-[300px] w-[300px] rounded-full bg-pink-500/8 dark:bg-pink-500/12 blur-3xl"
      />
    </div>
  )
}
