'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { api } from '@/lib/api'

export interface CapDownloadProps {
  alertId: string
  wardName?: string
}

/**
 * Common Alerting Protocol export.
 *
 * CAP 1.2 is what a state EOC and NDMA's Sachet already ingest, so this button
 * is the handoff from TAPAS into the systems that actually reach people.
 */
export function CapDownload({ alertId, wardName }: CapDownloadProps) {
  const [busy, setBusy] = useState(false)

  const handleDownload = async () => {
    setBusy(true)
    try {
      const xml = await api.capXml(alertId)

      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${alertId}.xml`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      let copied = false
      try {
        await navigator.clipboard?.writeText(xml)
        copied = true
      } catch {
        // Clipboard access is often blocked outside a secure context; the file
        // download is the primary path, so this is not an error worth showing.
      }

      toast({
        title: 'CAP XML downloaded',
        description: copied
          ? `${wardName ? `${wardName} alert` : 'Alert'} saved and copied to clipboard.`
          : `${wardName ? `${wardName} alert` : 'Alert'} saved as ${alertId}.xml.`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'CAP export failed',
        description:
          error instanceof Error
            ? error.message
            : 'Could not reach the alert service.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={busy}
      data-testid="cap-download"
    >
      <Download className="h-4 w-4" />
      {busy ? 'Preparing…' : 'Download CAP XML'}
    </Button>
  )
}
