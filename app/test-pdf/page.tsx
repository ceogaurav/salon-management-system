"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { downloadInvoicePDF } from "@/lib/invoice-actions"
import { Download } from "lucide-react"
import { useState } from "react"

export default function TestPDFPage() {
  const [downloading, setDownloading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const testData = {
    invoiceNumber: "TEST-001",
    invoiceDate: "2024-01-15",
    dueDate: "2024-02-15",
    customerName: "Test Customer",
    customerAddress: "123 Test Street\nTest City, Test State - 123456",
    customerPhone: "+91 98765 43210",
    customerEmail: "test@customer.com",
    items: [
      {
        id: 1,
        description: "Hair Cut",
        quantity: 1,
        rate: 500,
        amount: 500,
      },
      {
        id: 2,
        description: "Hair Wash",
        quantity: 1,
        rate: 200,
        amount: 200,
      },
    ],
    subtotal: 700,
    discount: 50,
    gstRate: 18,
    placeOfSupply: "Karnataka",
    businessName: "Test Salon",
    businessAddress: "456 Business Street\nBusiness City, Business State - 654321",
    businessPhone: "+91 87654 32109",
    businessEmail: "info@testsalon.com",
    businessGSTIN: "29ABCDE1234F1Z5",
    businessPAN: "ABCDE1234F",
  }

  const handleTestDownload = async () => {
    setDownloading(true)
    setResult(null)
    
    try {
      console.log("Starting PDF test with data:", testData)
      
      // Check if running in browser
      if (typeof window === 'undefined') {
        throw new Error('Not running in browser environment')
      }
      
      console.log('Browser environment confirmed, proceeding with PDF generation...')
      await downloadInvoicePDF(testData)
      setResult("✅ PDF generated and downloaded successfully!")
    } catch (error) {
      console.error("PDF test failed:", error)
      setResult(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>PDF Generation Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to test PDF generation with sample invoice data.
          </p>
          
          <Button 
            onClick={handleTestDownload} 
            disabled={downloading}
            className="w-full gap-2"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Generating PDF..." : "Test PDF Download"}
          </Button>
          
          {result && (
            <div className={`p-3 rounded border ${
              result.includes('Failed') 
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-green-50 border-green-200 text-green-800'
            }`}>
              {result}
            </div>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer font-medium mb-2">Sample Data</summary>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
              {JSON.stringify(testData, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}