import { NextResponse } from "next/server"
import { getCustomerInvoiceData } from "@/app/actions/loyalty"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 })
    }

    const customerData = await getCustomerInvoiceData(Number(customerId))
    
    return NextResponse.json({
      success: true,
      data: customerData
    })
  } catch (error) {
    console.error("Error fetching customer invoice data:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch customer invoice data" },
      { status: 500 }
    )
  }
}