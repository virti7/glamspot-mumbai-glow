-- Migration: Add enhanced staff fields to salon_staff table
-- Date: 2025-06-26

ALTER TABLE salon_staff ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE salon_staff ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE salon_staff ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE salon_staff ADD COLUMN IF NOT EXISTS working_days TEXT;
ALTER TABLE salon_staff ADD COLUMN IF NOT EXISTS working_hours TEXT;
ALTER TABLE salon_staff ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE salon_staff ADD COLUMN IF NOT EXISTS experience INT;
ALTER TABLE salon_staff ADD COLUMN IF NOT EXISTS photo TEXT;

COMMENT ON COLUMN salon_staff.phone IS 'Staff member phone number';
COMMENT ON COLUMN salon_staff.email IS 'Staff member email address';
COMMENT ON COLUMN salon_staff.bio IS 'Short bio/description of the staff member';
COMMENT ON COLUMN salon_staff.working_days IS 'Comma-separated working days (e.g. Mon,Tue,Wed)';
COMMENT ON COLUMN salon_staff.working_hours IS 'Working hours string (e.g. 10:00 AM - 8:00 PM)';
COMMENT ON COLUMN salon_staff.specialization IS 'Staff specialization (e.g. Hair Coloring, Bridal Makeup)';
COMMENT ON COLUMN salon_staff.experience IS 'Years of experience';
COMMENT ON COLUMN salon_staff.photo IS 'Staff profile photo URL';
