'use client'
import { motion } from 'framer-motion'
import { MessageCircle, ImageIcon, Users } from 'lucide-react'

const features = [
  {
    icon: MessageCircle,
    label: 'Real-time messaging & video calls',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: ImageIcon,
    label: 'Share photos, videos & moments',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
  },
  {
    icon: Users,
    label: 'Discover people & communities',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
]

export function AuthBranding() {
  return (
    <div className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="space-y-4"
      >
        <h1 className="text-4xl xl:text-[2.75rem] font-black leading-tight tracking-tight text-foreground">
          Your world,
          <br />
          <span className="text-gradient">one platform.</span>
        </h1>
        <p className="text-sm xl:text-base text-muted-foreground leading-relaxed max-w-[320px]">
          Connect with the people that matter, share your moments, and discover new stories every day.
        </p>
      </motion.div>

      <div className="space-y-3">
        {features.map(({ icon: Icon, label, color, bg }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.45, ease: 'easeOut' }}
            className="flex items-center gap-3"
          >
            <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <span className="text-sm font-medium text-foreground/80">{label}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="flex items-center gap-2.5"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400/70 opacity-75" />
          <span className="relative rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="text-xs text-muted-foreground">Live now — join the community</span>
      </motion.div>
    </div>
  )
}
