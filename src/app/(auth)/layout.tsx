import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Auth' }

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Branding Panel */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-950 via-violet-950 to-purple-950 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-1/4 -left-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <img src="/logo-dark.svg" alt="Nexus" className="h-10" />
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Connect with the world around you.
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Share moments, build communities, and stay connected with the people who matter most.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            { emoji: '🚀', text: 'Real-time messaging with voice messages' },
            { emoji: '🌐', text: 'Connect with millions of people worldwide' },
            { emoji: '🔒', text: 'Privacy-first, security-always design' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-white/80 text-sm">
              <span className="text-lg">{item.emoji}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Auth Panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center mb-8">
            <img src="/logo-light.svg" alt="Nexus" className="h-9 dark:hidden" />
            <img src="/logo-dark.svg" alt="Nexus" className="h-9 hidden dark:block" />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
