'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <div className="fixed top-4 right-4 z-50 no-print">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4 mr-2" />
        Export PDF
      </Button>
    </div>
  )
}
