-- Transfer Requests table for landlord portal
-- Tracks tenant transfer/sublease approval requests

-- Status enum for transfer requests
CREATE TYPE transfer_request_status AS ENUM ('pending', 'approved', 'denied');

CREATE TABLE transfer_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  landlord_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applicant_name  text NOT NULL,
  applicant_email text NOT NULL,
  unit            text,
  status          transfer_request_status NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_transfer_requests_landlord ON transfer_requests(landlord_id);
CREATE INDEX idx_transfer_requests_listing ON transfer_requests(listing_id);
CREATE INDEX idx_transfer_requests_status ON transfer_requests(status);

-- Enable RLS
ALTER TABLE transfer_requests ENABLE ROW LEVEL SECURITY;

-- Landlords can only see their own transfer requests
CREATE POLICY "Landlords can view own transfer requests"
  ON transfer_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = landlord_id);

-- Landlords can update status on their own transfer requests
CREATE POLICY "Landlords can update own transfer requests"
  ON transfer_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

-- Landlords can insert transfer requests for their own listings
CREATE POLICY "Landlords can insert own transfer requests"
  ON transfer_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = landlord_id);
