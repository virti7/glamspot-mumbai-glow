-- Migration: Add extended booking fields required by admin panel
-- Date: 2026-06-26

-- Extended booking fields for admin management
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_request TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_reference TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'website';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES salon_staff(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_time TIMESTAMPTZ;

-- Add duration_min to booking_services
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS duration_min INT DEFAULT 30;

-- Unique constraint on booking_reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_reference ON bookings (booking_reference) WHERE booking_reference IS NOT NULL;

-- Indexes for new fields
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings (booking_source);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings (payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings (customer_email) WHERE customer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings (customer_phone) WHERE customer_phone IS NOT NULL;

-- Comments
COMMENT ON COLUMN bookings.customer_name IS 'Customer full name at time of booking';
COMMENT ON COLUMN bookings.customer_phone IS 'Customer phone at time of booking';
COMMENT ON COLUMN bookings.customer_email IS 'Customer email at time of booking';
COMMENT ON COLUMN bookings.special_request IS 'Special requests from customer';
COMMENT ON COLUMN bookings.booking_reference IS 'Unique booking reference like GS-123456ABCD';
COMMENT ON COLUMN bookings.payment_status IS 'Payment status: pending, paid, failed, refunded';
COMMENT ON COLUMN bookings.payment_method IS 'Payment method: card, upi, netbanking, wallet, cash';
COMMENT ON COLUMN bookings.platform_fee IS 'Platform commission fee';
COMMENT ON COLUMN bookings.discount_amount IS 'Total discount applied';
COMMENT ON COLUMN bookings.tax_amount IS 'Tax amount (e.g. GST)';
COMMENT ON COLUMN bookings.subtotal IS 'Sum of service prices before fees/tax';
COMMENT ON COLUMN bookings.booking_source IS 'Source: website, glamspot, walk_in, manual';
COMMENT ON COLUMN bookings.created_by IS 'User who created the booking';
COMMENT ON COLUMN bookings.cancelled_at IS 'Timestamp when booking was cancelled';
COMMENT ON COLUMN bookings.check_in_time IS 'When customer checked in';
COMMENT ON COLUMN bookings.completed_time IS 'When booking was completed';
