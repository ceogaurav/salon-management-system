"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Banknote, Smartphone, Percent, Receipt, User, ShoppingCart, Tag, Star } from "lucide-react"

import { CouponSelector } from "@/components/coupon-selector"
import LoyaltyCheckout from "@/components/loyalty-checkout"
import GiftCardRedeemer from "@/components/gift-card-redeemer"

import { calculateTier, type CustomerLoyalty as UiCustomerLoyalty } from "@/lib/loyalty"
import { formatCurrency } from "@/lib/currency"

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address?: string
}
interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  type: "service" | "product" | "package" | "membership"
  staff_id?: number
  staff_name?: string
}
interface Invoice {
  id: number
  customer: Customer
  items: CartItem[]
  subtotal: number
  discount: number
  gst: number
  total: number
  payment_method: string
  notes?: string
  created_at: string
  // Enhanced fields for comprehensive invoice details
  coupon_code?: string
  coupon_discount?: number
  loyalty_points_used?: number
  loyalty_discount?: number
  gift_card_discount?: number
  points_earned?: number
  transaction_id?: string
  staff_name?: string
  appointment_date?: string
  appointment_time?: string
  booking_id?: number
}
interface UICoupon {
  id: number
  code: string
  name: string
  description: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  min_order_amount: number
  max_discount?: number
  valid_from: string
  valid_until: string
  usage_limit?: number
  used_count: number
  is_active: boolean
}
interface CheckoutScreenProps {
  customer: Customer
  cartItems: CartItem[]
  onComplete: (invoice: Invoice) => void
  onBack: () => void
}

interface LoyaltySettingsUI {
  is_active: boolean
  earn_on_purchase_enabled: boolean
  points_per_rupee: number
  max_redemption_percent: number
  points_validity_days: number
  minimum_order_amount: number
}

function CheckoutScreenComp({ customer, cartItems, onComplete, onBack }: CheckoutScreenProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [notes, setNotes] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<UICoupon | null>(null)

  const [customerLoyalty, setCustomerLoyalty] = useState<UiCustomerLoyalty | null>(null)
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettingsUI | null>(null)
  const [expiringSoon, setExpiringSoon] = useState<{ days: number; points: number } | null>(null)

  const [redeemEnabled, setRedeemEnabled] = useState(false)
  const [loyaltyRedeemPoints, setLoyaltyRedeemPoints] = useState<number>(0)

  const [giftCards, setGiftCards] = useState<{ code: string; amount: number }[]>([])
  const giftCardDiscount = useMemo(() => giftCards.reduce((s, g) => s + (g.amount || 0), 0), [giftCards])

  // idempotency key persisted for a single submission
  const idempotencyKeyRef = useRef<string | null>(null)

  const refreshLoyalty = useCallback(async () => {
    try {
      console.log("[v0] Fetching loyalty data for customer:", customer.id)
      const res = await fetch(`/api/loyalty/customer?id=${encodeURIComponent(String(customer.id))}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })
      const json = await res.json()

      console.log("[v0] Raw loyalty API response:", json)

      const settings = json?.settings as Partial<LoyaltySettingsUI> | undefined
      const soon = json?.expiringSoon as { days: number; points: number } | undefined
      const data = json?.data

      if (settings) {
        setLoyaltySettings({
          is_active: settings.is_active !== false,
          earn_on_purchase_enabled: settings.earn_on_purchase_enabled !== false,
          points_per_rupee: Number(settings.points_per_rupee ?? 1),
          max_redemption_percent: Math.max(0, Math.min(100, Number(settings.max_redemption_percent ?? 50))),
          points_validity_days: Math.max(1, Number(settings.points_validity_days ?? 45)),
          minimum_order_amount: Math.max(0, Number(settings.minimum_order_amount ?? 0)),
        })
      } else {
        setLoyaltySettings({
          is_active: true,
          earn_on_purchase_enabled: true,
          points_per_rupee: 1,
          max_redemption_percent: 50,
          points_validity_days: 45,
          minimum_order_amount: 0,
        })
      }

      if (soon) setExpiringSoon(soon)

      if (data) {
        console.log("[v0] Processing existing loyalty data:", data)
        const ui: UiCustomerLoyalty = {
          id: String(data.customer_id || customer.id),
          customerId: String(data.customer_id || customer.id),
          points: Math.max(0, Number(data.current_points || 0)),
          tier: calculateTier(Number(data.total_redeemed || 0)),
          lifetimeSpending: Number(data.total_redeemed || 0),
          joinDate: data.created_at || new Date().toISOString(),
          lastActivity: data.updated_at || new Date().toISOString(),
        }
        console.log("[v0] Processed loyalty data:", ui)
        setCustomerLoyalty(ui)
      } else {
        console.log("[v0] No loyalty data found, creating default enrollment")
        const ui: UiCustomerLoyalty = {
          id: String(customer.id),
          customerId: String(customer.id),
          points: 0,
          tier: calculateTier(0),
          lifetimeSpending: 0,
          joinDate: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
        }
        setCustomerLoyalty(ui)
      }
    } catch (error) {
      console.error("[v0] Error fetching loyalty data:", error)
      setLoyaltySettings({
        is_active: true,
        earn_on_purchase_enabled: true,
        points_per_rupee: 1,
        max_redemption_percent: 50,
        points_validity_days: 45,
        minimum_order_amount: 0,
      })
      setCustomerLoyalty({
        id: String(customer.id),
        customerId: String(customer.id),
        points: 0,
        tier: "bronze",
        lifetimeSpending: 0,
        joinDate: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      })
    }
  }, [customer.id])

  useEffect(() => {
    refreshLoyalty()
  }, [refreshLoyalty])

  // Totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const manualDiscount = useMemo(
    () => (appliedCoupon ? 0 : (subtotal * discountPercent) / 100),
    [appliedCoupon, discountPercent, subtotal],
  )
  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0
    const base =
      appliedCoupon.discount_type === "percentage"
        ? (subtotal * appliedCoupon.discount_value) / 100
        : appliedCoupon.discount_value
    const capped = appliedCoupon.max_discount ? Math.min(base, appliedCoupon.max_discount) : base
    return Math.min(capped, subtotal)
  }, [appliedCoupon, subtotal])

  const discountedSubtotal = Math.max(0, subtotal - (appliedCoupon ? couponDiscount : manualDiscount))
  const gstAmount = (discountedSubtotal * 18) / 100
  const amountBeforeLoyalty = discountedSubtotal + gstAmount
  const amountBeforeLoyaltyAfterGC = Math.max(0, amountBeforeLoyalty - giftCardDiscount)

  // Max redeemable points from settings
  const maxRedeemablePoints = useMemo(() => {
    const capPct = loyaltySettings?.max_redemption_percent ?? 50
    const bySub = Math.max(0, Math.floor(amountBeforeLoyaltyAfterGC * (capPct / 100)))
    const byBal = Math.max(0, customerLoyalty?.points ?? 0)
    return Math.min(bySub, byBal)
  }, [amountBeforeLoyaltyAfterGC, customerLoyalty?.points, loyaltySettings?.max_redemption_percent])

  useEffect(() => {
    setLoyaltyRedeemPoints((prev) => Math.min(prev, maxRedeemablePoints))
    if (maxRedeemablePoints === 0 && redeemEnabled) setRedeemEnabled(false)
  }, [maxRedeemablePoints, redeemEnabled])

  const loyaltyDiscount = Math.min(loyaltyRedeemPoints, amountBeforeLoyaltyAfterGC)
  const total = Math.max(0, amountBeforeLoyaltyAfterGC - loyaltyDiscount)

  // Points earned using settings (+ min order)
  const finalAmount = amountBeforeLoyaltyAfterGC - (redeemEnabled ? loyaltyRedeemPoints : 0)
  const pointsEarned = useMemo(() => {
    if (!customerLoyalty) return 0
    const active = loyaltySettings?.is_active !== false
    const earnOn = loyaltySettings?.earn_on_purchase_enabled !== false
    const rate = Number(loyaltySettings?.points_per_rupee ?? 1)
    const minOrder = Number(loyaltySettings?.minimum_order_amount ?? 0)
    if (!(active && earnOn)) return 0
    if (finalAmount < minOrder) return 0
    return Math.max(0, Math.floor(finalAmount * rate))
  }, [
    customerLoyalty,
    finalAmount,
    loyaltySettings?.is_active,
    loyaltySettings?.earn_on_purchase_enabled,
    loyaltySettings?.points_per_rupee,
    loyaltySettings?.minimum_order_amount,
  ])

  // Handlers
  const handleToggleRedeem = useCallback(
    (enabled: boolean) => {
      setRedeemEnabled(enabled)
      setLoyaltyRedeemPoints((prev) => (enabled ? Math.min(prev || 0, maxRedeemablePoints) : 0))
    },
    [maxRedeemablePoints],
  )

  // IMPORTANT: define this to avoid "handleChangePoints is not defined"
  const handleChangePoints = useCallback(
    (pts: number) => {
      const val = Math.max(0, Math.min(Math.floor(pts || 0), maxRedeemablePoints))
      setLoyaltyRedeemPoints(val)
    },
    [maxRedeemablePoints],
  )

  const handleCompletePayment = async () => {
    setIsProcessing(true)
    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== "undefined" && (crypto as any).randomUUID
            ? (crypto as any).randomUUID()
            : `${customer.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
      }

      const today = new Date().toISOString().split("T")[0]
      const payload = {
        customer_id: customer.id,
        items: cartItems,
        payment_method: paymentMethod,
        notes: notes || null,
        coupon_code: appliedCoupon?.code,
        coupon_discount: appliedCoupon ? couponDiscount : manualDiscount, // Pass calculated discount
        invoice_date: today,
        due_date: today,
        redeem_points: redeemEnabled ? loyaltyRedeemPoints : 0,
        points_earned_client: pointsEarned,
        gift_cards: giftCards,
        idempotency_key: idempotencyKeyRef.current,
      }
      const res = await fetch("/api/checkout/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKeyRef.current! },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success || !data.invoice) throw new Error(data.message || "Failed to finalize checkout")

      const serverTotals = data.totals || {
        subtotal,
        couponDiscount: appliedCoupon ? couponDiscount : manualDiscount,
        gstAmount,
        giftCardDiscount,
        loyaltyDiscount,
        total,
      }

      const invoice: Invoice = {
        id: data.invoice.id || Math.floor(Math.random() * 10000),
        customer,
        items: cartItems,
        subtotal: serverTotals.subtotal,
        discount: serverTotals.couponDiscount, // This includes both coupon and manual discounts
        gst: serverTotals.gstAmount,
        total: serverTotals.total,
        payment_method: paymentMethod,
        notes,
        created_at: new Date().toISOString(),
        // Enhanced fields with checkout details
        coupon_code: appliedCoupon?.code,
        coupon_discount: appliedCoupon ? couponDiscount : 0,
        loyalty_points_used: redeemEnabled ? loyaltyRedeemPoints : 0,
        loyalty_discount: redeemEnabled ? loyaltyDiscount : 0,
        gift_card_discount: giftCardDiscount,
        points_earned: serverTotals.pointsEarned || pointsEarned,
        staff_name: cartItems.find(item => item.staff_name)?.staff_name,
      }
      onComplete(invoice)
    } catch (e) {
      console.error(e)
      alert("Failed to process payment. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Items in Cart</h2>
          <p className="text-gray-600 mb-6">
            Add some services or products or package or membership to proceed with checkout.
          </p>
          <Button onClick={onBack}>Go Back</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4" />
              <span className="font-medium">Customer</span>
            </div>
            <p className="font-semibold">{customer.name}</p>
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
            {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
          </div>

          {/* Items */}
          <div className="space-y-3">
            <h4 className="font-medium">Items ({cartItems.length})</h4>
            {cartItems.map((item, index) => (
              <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{item.name}</span>
                    <Badge
                      variant={
                        item.type === "service"
                          ? "default"
                          : item.type === "product"
                            ? "secondary"
                            : item.type === "package"
                              ? "outline"
                              : "destructive"
                      }
                      className={
                        item.type === "package"
                          ? "bg-purple-100 text-purple-800 border-purple-300"
                          : item.type === "membership"
                            ? "bg-gold-100 text-gold-800 border-gold-300"
                            : ""
                      }
                    >
                      {item.type}
                    </Badge>
                  </div>
                  {item.staff_name && <p className="text-sm text-muted-foreground">Staff: {item.staff_name}</p>}
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.price)} × {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {appliedCoupon && couponDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  Coupon ({appliedCoupon.code})
                </span>
                <span>-{formatCurrency(couponDiscount)}</span>
              </div>
            )}

            {!appliedCoupon && discountPercent > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Manual Discount ({discountPercent}%):</span>
                <span>-{formatCurrency(manualDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>GST (18%):</span>
              <span>{formatCurrency(gstAmount)}</span>
            </div>

            {giftCardDiscount > 0 && (
              <div className="flex justify-between text-purple-700">
                <span>Gift Cards</span>
                <span>-{formatCurrency(giftCardDiscount)}</span>
              </div>
            )}

            {redeemEnabled && loyaltyDiscount > 0 && (
              <div className="flex justify-between text-purple-600">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  Loyalty Redeemed
                </span>
                <span>-{formatCurrency(loyaltyDiscount)}</span>
              </div>
            )}

            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment + Redemptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Coupons */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Apply Coupon
            </Label>
            <CouponSelector
              orderAmount={subtotal}
              appliedCoupon={appliedCoupon}
              onCouponApplied={(coupon) => {
                setAppliedCoupon(coupon as UICoupon)
                setDiscountPercent(0)
              }}
              onCouponRemoved={() => setAppliedCoupon(null)}
            />
          </div>

          {/* Manual discount */}
          <div className="space-y-2">
            <Label htmlFor="discount" className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Discount Percentage
            </Label>
            <Input
              id="discount"
              type="number"
              min="0"
              max="100"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
              placeholder="Enter discount percentage"
              disabled={!!appliedCoupon}
            />
            {appliedCoupon && (
              <p className="text-xs text-gray-500">Manual discount is disabled while a coupon is applied.</p>
            )}
          </div>

          {/* Gift Cards */}
          <div className="space-y-2">
            <Label>Apply Gift Card</Label>
            <GiftCardRedeemer baseDue={amountBeforeLoyalty} onChange={(cards) => setGiftCards(cards)} />
          </div>

          {/* Loyalty (controlled) */}
          <div className="space-y-2">
            <LoyaltyCheckout
              customerLoyalty={customerLoyalty}
              redeemEnabled={redeemEnabled}
              pointsToRedeem={redeemEnabled ? loyaltyRedeemPoints : 0}
              maxRedeemablePoints={maxRedeemablePoints}
              finalAmount={amountBeforeLoyaltyAfterGC - (redeemEnabled ? loyaltyRedeemPoints : 0)}
              pointsEarned={pointsEarned}
              earningRate={loyaltySettings?.points_per_rupee ?? 1}
              maxRedeemPercent={loyaltySettings?.max_redemption_percent ?? 50}
              minOrderAmount={loyaltySettings?.minimum_order_amount ?? 0}
              expiringSoonPoints={expiringSoon?.points ?? 0}
              expiringSoonDays={expiringSoon?.days ?? 7}
              onToggleRedeem={handleToggleRedeem}
              onChangePoints={handleChangePoints} // stays defined above
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "cash", label: "Cash", icon: Banknote },
                { id: "card", label: "Card", icon: CreditCard },
                { id: "upi", label: "UPI", icon: Smartphone },
              ].map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      paymentMethod === m.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special notes or instructions..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onBack} className="flex-1 bg-transparent">
              Back to Services
            </Button>
            <Button onClick={handleCompletePayment} disabled={isProcessing} className="flex-1">
              {isProcessing ? "Processing..." : `Complete Payment ${formatCurrency(total)}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CheckoutScreenComp
export { CheckoutScreenComp as CheckoutScreen }
