-- Admin management table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the initial admin
INSERT INTO public.admins (id, email)
VALUES ('4943eb7b-d0bd-40c6-95ce-a0f04471754e', 'admin@subletbuff.com')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Only admins can read the admins table
CREATE POLICY "Admins read admins" ON public.admins
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- Only admins can insert/update/delete admins
CREATE POLICY "Admins manage admins" ON public.admins
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));
