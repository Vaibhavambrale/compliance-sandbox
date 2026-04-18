'use client'

import { Button } from '@/components/ui/button'
import { Printer, Download } from 'lucide-react'

export default function PrintButton() {
  return (
    <div className="fixed top-4 right-4 z-50 no-print flex gap-2">
      <Button variant="outline" size="sm" onClick={() => window.print()} className="shadow-sm bg-white">
        <Download className="h-4 w-4 mr-2" />
        Save as PDF
      </Button>
      <Button variant="ghost" size="sm" onClick={() => window.print()} className="text-gray-500">
        <Printer className="h-4 w-4 mr-1" />
        Print
      </Button>
    </div>
  )
}
