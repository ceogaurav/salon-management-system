"use client"

import { useReactToPrint } from "react-to-print"
import type { RefObject } from "react"

// Alternative PDF generation using jsPDF directly
let jsPDFModule: any = null
let html2canvasModule: any = null

const getJsPDF = async () => {
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available on the client side')
  }
  
  if (!jsPDFModule) {
    jsPDFModule = await import('jspdf')
  }
  
  return jsPDFModule.default || jsPDFModule.jsPDF
}

const getHtml2Canvas = async () => {
  if (typeof window === 'undefined') {
    throw new Error('HTML2Canvas is only available on the client side')
  }
  
  if (!html2canvasModule) {
    html2canvasModule = await import('html2canvas')
  }
  
  return html2canvasModule.default || html2canvasModule
}

export async function downloadInvoicePDF(invoiceData: any) {
  // Check if running on client side
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in the browser')
  }

  try {
    // Add missing business information if not provided
    const completeInvoiceData = {
      ...invoiceData,
      businessName: invoiceData.businessName || "Your Salon",
      businessAddress: invoiceData.businessAddress || "123 Business Street\nCity, State - 123456",
      businessPhone: invoiceData.businessPhone || "+91 98765 43210",
      businessEmail: invoiceData.businessEmail || "info@yoursalon.com",
      businessGSTIN: invoiceData.businessGSTIN || "29ABCDE1234F1Z5",
      businessPAN: invoiceData.businessPAN || "ABCDE1234F",
      customerAddress: invoiceData.customerAddress || "Customer Address",
      gstRate: invoiceData.gstRate || 18,
    }

    console.log("Generating PDF with data:", completeInvoiceData)

    const response = await fetch("/api/invoices/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invoiceData: completeInvoiceData }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("API Error:", errorData)
      throw new Error(errorData.message || "Failed to generate invoice data")
    }

    const { htmlContent, invoiceData: responseData } = await response.json()

    if (!htmlContent) {
      throw new Error("No HTML content received from server")
    }

    console.log("Received HTML content, length:", htmlContent.length)

    // Create a visible temporary container for better rendering
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = htmlContent
    tempDiv.style.position = "absolute"
    tempDiv.style.left = "0"
    tempDiv.style.top = "0"
    tempDiv.style.width = "800px"
    tempDiv.style.background = "white"
    tempDiv.style.padding = "20px"
    tempDiv.style.fontFamily = "Arial, sans-serif"
    tempDiv.style.fontSize = "14px"
    tempDiv.style.color = "black"
    tempDiv.style.zIndex = "9999"
    document.body.appendChild(tempDiv)

    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log("Capturing element with html2canvas...")

    // Get the modules
    const html2canvas = await getHtml2Canvas()
    const jsPDF = await getJsPDF()

    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
        width: 800,
        height: tempDiv.scrollHeight
      })

      console.log("Canvas generated, creating PDF...")

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [800, canvas.height]
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      pdf.addImage(imgData, 'JPEG', 0, 0, 800, canvas.height)
      
      const filename = `invoice-${responseData?.invoiceNumber || completeInvoiceData.invoiceNumber || 'unknown'}.pdf`
      pdf.save(filename)
      
      console.log("PDF saved successfully as:", filename)
    } catch (pdfError) {
      console.error("PDF generation error:", pdfError)
      throw new Error("Failed to generate PDF: " + (pdfError as Error).message)
    } finally {
      // Clean up
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv)
      }
    }
  } catch (error) {
    console.error("Error downloading PDF:", error)
    throw error
  }
}

// Print invoice
export function useInvoicePrint(ref: RefObject<HTMLDivElement>) {
  return useReactToPrint({
    contentRef: ref,
    documentTitle: "Invoice",
  })
}

// Generate shareable link
export function getInvoiceShareUrl(token: string) {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/inv/${token}`
}
