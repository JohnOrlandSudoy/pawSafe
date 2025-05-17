-- Create a view for accessing auth users without needing special permissions

-- Create a view to safely expose user data
CREATE OR REPLACE VIEW public.auth_users_view AS
SELECT
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'role' as role,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM
    auth.users;

-- Set up RLS policy for the view
ALTER VIEW public.auth_users_view SECURITY INVOKER;

-- Allow owners to select from this view
CREATE POLICY select_users_policy ON public.auth_users_view
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM public.owners));

-- Create a table for recording user confirmations
CREATE TABLE IF NOT EXISTS public.user_confirmations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    confirmed_by UUID REFERENCES auth.users(id),
    confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    note TEXT
);

-- Set up RLS for user_confirmations
ALTER TABLE public.user_confirmations ENABLE ROW LEVEL SECURITY;

-- Only owners can see or insert confirmations
CREATE POLICY confirmations_select_policy ON public.user_confirmations
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM public.owners));

CREATE POLICY confirmations_insert_policy ON public.user_confirmations
    FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT id FROM public.owners));

-- Create a trigger to auto-confirm users when a confirmation record is inserted
CREATE OR REPLACE FUNCTION public.confirm_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE id = NEW.user_id AND email_confirmed_at IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_confirmation ON public.user_confirmations;
CREATE TRIGGER on_user_confirmation
    AFTER INSERT ON public.user_confirmations
    FOR EACH ROW
    EXECUTE PROCEDURE public.confirm_user(); 