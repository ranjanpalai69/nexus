import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse } from '@fortawesome/free-solid-svg-icons'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center p-6">
      <div>
        <p className="text-8xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">404</p>
        <h1 className="text-2xl font-bold mt-2">Page not found</h1>
        <p className="text-muted-foreground mt-1 text-sm">This page doesn&apos;t exist or was removed.</p>
      </div>
      <Link href="/feed">
        <Button variant="gradient" className="gap-2">
          <FontAwesomeIcon icon={faHouse} className="h-4 w-4" />
          Go Home
        </Button>
      </Link>
    </div>
  )
}
