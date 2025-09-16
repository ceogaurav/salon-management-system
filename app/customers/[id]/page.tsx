// app/customers/[id]/page.tsx
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCustomer } from "@/app/actions/customers"
import { getBookingsByCustomerId, getInvoicesByCustomerId } from "@/app/actions/bookings"
import { getCustomerLoyalty } from "@/app/actions/loyalty"
import { getCustomerAnalytics } from "@/app/actions/customer-analytics"
import { CustomerProfileDisplay } from "@/components/customer-profile-display"

// Enhanced customer data fetching
async function getEnhancedCustomerData(id: string) {
  try {
    const customer = await getCustomer(id)

    if (!customer) {
      return null
    }

    // Fetch all customer-related data in parallel for better performance
    const [bookings, invoices, loyaltyData, analytics] = await Promise.all([
      getBookingsByCustomerId(id),
      getInvoicesByCustomerId(id),
      getCustomerLoyalty(id).catch(() => null), // Handle potential loyalty data errors gracefully
      getCustomerAnalytics(id).catch(() => null) // Handle potential analytics errors gracefully
    ])

    return {
      customer,
      bookings,
      invoices,
      loyaltyData,
      analytics
    }
  } catch (error) {
    console.error("Error loading enhanced customer data:", error)
    return null
  }
}

async function CustomerDetailsContent({ id }: { id: string }) {
  const data = await getEnhancedCustomerData(id)

  if (!data) {
    notFound()
  }

  return (
    <CustomerProfileDisplay 
      customer={data.customer} 
      bookings={data.bookings} 
      invoices={data.invoices}
      loyaltyData={data.loyaltyData}
      analytics={data.analytics}
    />
  )
}

export default async function CustomerDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading customer details...</p>
          </div>
        </div>
      }
    >
      <CustomerDetailsContent id={params.id} />
    </Suspense>
  )
}
