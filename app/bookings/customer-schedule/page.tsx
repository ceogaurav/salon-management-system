"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, Star, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { createBooking } from "@/app/actions/bookings"
import { getServices, type Service } from "@/app/actions/services"
import { getStaff, type Staff } from "@/app/actions/staff"

// Using actual database interfaces from actions
// Service and Staff are imported from their respective action files

interface StaffWithRating extends Staff {
  rating?: number
  specialties?: string[]
}

interface TimeSlot {
  time: string
  available: boolean
  staffId?: number
}

// Removed hardcoded data - will be fetched from database

const timeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
]

export default function CustomerSchedulePage() {
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedService, setSelectedService] = useState<Service>()
  const [selectedStaff, setSelectedStaff] = useState<StaffWithRating>()
  const [selectedTime, setSelectedTime] = useState<string>()
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  })
  
  // State for fetched data
  const [services, setServices] = useState<Service[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffWithRating[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const [servicesData, staffData] = await Promise.all([
          getServices(),
          getStaff()
        ])
        
        // Filter active services
        const activeServices = servicesData.filter(service => service.is_active)
        setServices(activeServices)
        
        // Transform staff data to include rating and specialties
        const transformedStaff: StaffWithRating[] = staffData
          .filter(staff => staff.is_active)
          .map(staff => ({
            ...staff,
            rating: 4.5 + Math.random() * 0.5, // Generate a rating between 4.5-5.0
            specialties: staff.skills ? staff.skills.split(',').map(s => s.trim()) : []
          }))
        
        setStaffMembers(transformedStaff)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load services and staff data')
        toast({
          title: "Error",
          description: "Failed to load data. Please refresh the page.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedDate && selectedStaff) {
      // Simulate fetching available time slots
      const slots = timeSlots.map((time) => ({
        time,
        available: Math.random() > 0.3, // 70% availability
        staffId: selectedStaff.id,
      }))
      setAvailableSlots(slots)
    }
  }, [selectedDate, selectedStaff])

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    setStep(2)
  }

  const handleStaffSelect = (staff: StaffWithRating) => {
    setSelectedStaff(staff)
    setStep(3)
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date) setStep(4)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep(5)
  }

  const handleBookingSubmit = async () => {
    if (
      !selectedService ||
      !selectedStaff ||
      !selectedDate ||
      !selectedTime ||
      !customerInfo.name ||
      !customerInfo.phone
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const formData = new FormData()
      formData.append("customerName", customerInfo.name)
      formData.append("customerPhone", customerInfo.phone)
      formData.append("customerEmail", customerInfo.email)
      formData.append("serviceNames", selectedService.name)
      formData.append("staffId", selectedStaff.id.toString())
      formData.append("bookingDate", selectedDate.toISOString().split("T")[0])
      formData.append("bookingTime", selectedTime)
      formData.append("totalAmount", selectedService.price.toString())
      formData.append("status", "pending")
      formData.append("notes", customerInfo.notes)

      const result = await createBooking(formData)

      if (result.success) {
        setShowConfirmation(true)
        toast({
          title: "Booking Confirmed!",
          description: `Your appointment has been successfully scheduled. Booking number: ${result.bookingNumber}`,
        })
      } else {
        throw new Error(result.message || "Failed to create booking")
      }
    } catch (error) {
      console.error("Booking error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast({
        title: "Booking Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-green-600 mb-2">Booking Confirmed!</h1>
              <p className="text-gray-600 mb-6">Your appointment has been successfully scheduled</p>

              <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                <h3 className="font-semibold mb-3">Appointment Details:</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Service:</strong> {selectedService?.name}
                  </p>
                  <p>
                    <strong>Staff:</strong> {selectedStaff?.name}
                  </p>
                  <p>
                    <strong>Date:</strong> {selectedDate && formatDate(selectedDate)}
                  </p>
                  <p>
                    <strong>Time:</strong> {selectedTime}
                  </p>
                  <p>
                    <strong>Duration:</strong> {selectedService?.duration_minutes} minutes
                  </p>
                  <p>
                    <strong>Price:</strong> {selectedService && formatCurrency(selectedService.price)}
                  </p>
                  <p>
                    <strong>Customer:</strong> {customerInfo.name}
                  </p>
                  <p>
                    <strong>Phone:</strong> {customerInfo.phone}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button onClick={() => window.location.reload()}>Book Another Appointment</Button>
                <Link href="/bookings">
                  <Button variant="outline">View All Bookings</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/bookings">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Bookings
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Book Your Appointment</h1>
              <p className="text-gray-600">Schedule your salon appointment in just a few steps</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 5 && <div className={`w-12 h-1 ${step > stepNum ? "bg-blue-600" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading services and staff...</p>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {error && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Select Service */}
        {step === 1 && !loading && !error && (
          <Card>
            <CardHeader>
              <CardTitle>Select a Service</CardTitle>
              <p className="text-gray-600">Choose the service you'd like to book</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.length === 0 ? (
                  <div className="col-span-2 text-center py-8">
                    <p className="text-gray-600">No active services available</p>
                  </div>
                ) : (
                  services.map((service) => (
                    <Card
                      key={service.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleServiceSelect(service)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{service.name}</h3>
                          <Badge variant="secondary">{formatCurrency(service.price)}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {service.duration_minutes} min
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Staff */}
        {step === 2 && selectedService && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Specialist</CardTitle>
              <p className="text-gray-600">Select a staff member for your {selectedService.name}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staffMembers
                  .filter((staff) =>
                    staff.specialties?.some((specialty) =>
                      selectedService.name.toLowerCase().includes(specialty.toLowerCase()),
                    ) || true // Show all staff if no specialties match
                  ).length === 0 ? (
                  <div className="col-span-2 text-center py-8">
                    <p className="text-gray-600">No staff available for this service</p>
                  </div>
                ) : (
                  staffMembers
                    .filter((staff) =>
                      staff.specialties?.some((specialty) =>
                        selectedService.name.toLowerCase().includes(specialty.toLowerCase()),
                      ) || true // Show all staff if no specialties match
                    )
                    .map((staff) => (
                      <Card
                        key={staff.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleStaffSelect(staff)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-lg font-medium text-blue-600">{staff.name.charAt(0)}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold">{staff.name}</h3>
                              <p className="text-sm text-gray-600">{staff.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{staff.rating?.toFixed(1) || '4.5'}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {staff.specialties?.map((specialty) => (
                              <Badge key={specialty} variant="outline" className="text-xs">
                                {specialty}
                              </Badge>
                            )) || (
                              <Badge variant="outline" className="text-xs">
                                {staff.role || 'Staff'}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Date */}
        {step === 3 && selectedStaff && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Date</CardTitle>
              <p className="text-gray-600">Select your preferred appointment date</p>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date() || date.getDay() === 0} // Disable past dates and Sundays
                  className="rounded-md border"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Select Time */}
        {step === 4 && selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Time</CardTitle>
              <p className="text-gray-600">Select your preferred appointment time for {formatDate(selectedDate)}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={slot.available ? "outline" : "secondary"}
                    disabled={!slot.available}
                    onClick={() => slot.available && handleTimeSelect(slot.time)}
                    className="h-12"
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Customer Information */}
        {step === 5 && selectedTime && (
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <p className="text-gray-600">Please provide your contact details</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="notes">Special Requests (Optional)</Label>
                <Textarea
                  id="notes"
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  placeholder="Any special requirements or preferences..."
                />
              </div>

              {/* Booking Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Service:</span>
                    <span>{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Staff:</span>
                    <span>{selectedStaff?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{formatDate(selectedDate!)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{selectedService?.duration_minutes} minutes</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base border-t pt-2">
                    <span>Total:</span>
                    <span>{selectedService && formatCurrency(selectedService.price)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setStep(4)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleBookingSubmit} className="flex-1">
                  Confirm Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
