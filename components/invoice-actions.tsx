"use client"

import { Button } from "@/components/ui/button"
import { Download, Printer, Send } from "lucide-react"
import { downloadInvoicePDF, useInvoicePrint, getInvoiceShareUrl } from "@/lib/invoice-actions"
import { useRef } from "react"

interface InvoiceActionsProps {
  invoiceId: string
  shareToken: string
  children: React.ReactNode
}

export function InvoiceActions({ invoiceId, shareToken, children }: InvoiceActionsProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const handlePrint = useInvoicePrint(invoiceRef)

  return (
    <div className="space-y-4">
      {/* Hidden Invoice Template for Print */}
      <div className="hidden">
        <div ref={invoiceRef} id={`print-${invoiceId}`}>
          {children}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <Button onClick={() => downloadInvoicePDF(`print-${invoiceId}`)} className="gap-2">
          <Download className="w-4 h-4" /> Download PDF
        </Button>

        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" /> Print Invoice
        </Button>

        <Button
          asChild
          variant="secondary"
          className="gap-2"
        >
          <a href={getInvoiceShareUrl(shareToken)} target="_blank" rel="noopener noreferrer">
            <Send className="w-4 h-4" /> Share Invoice
          </a>
        </Button>
      </div>
    </div>
  )
}
