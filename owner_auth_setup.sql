-- SQL Setup for Owner-Only Authentication System

-- 1. Create a trigger function to auto-verify email on signup
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Set email confirmation to true
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      is_sso_user = FALSE,
      is_anonymous = FALSE
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a trigger to run the function after user insertion
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_email();

-- 3. Set up RLS (Row Level Security) policies to ensure only owners can access data
-- First, create an owners table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.owners (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create a secure function to add users to the owners table
CREATE OR REPLACE FUNCTION public.add_user_to_owners()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.owners (id, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a trigger to add new administrators to the owners table
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_user_meta_data->>'role' = 'Administrator')
  EXECUTE PROCEDURE public.add_user_to_owners();

-- 6. Enable Row Level Security on the owners table
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

-- 7. Create policy to allow owners to see other owners
CREATE POLICY owners_policy ON public.owners
  USING (auth.uid() IN (SELECT id FROM public.owners));

-- 8. For existing users, verify their email addresses
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 9. Update any existing administrators to be in the owners table
INSERT INTO public.owners (id, full_name)
SELECT id, raw_user_meta_data->>'full_name'
FROM auth.users
WHERE 
  raw_user_meta_data->>'role' = 'Administrator'
  AND id NOT IN (SELECT id FROM public.owners)
ON CONFLICT DO NOTHING; 