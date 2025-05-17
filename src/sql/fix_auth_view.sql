-- Create a simplified view for accessing auth users
-- This should work on any Supabase project

-- Drop the view if it already exists
DROP VIEW IF EXISTS public.auth_users_view;

-- Create a simple view with the necessary user data
CREATE OR REPLACE VIEW public.auth_users_view AS
SELECT
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'role' as role,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    CASE WHEN email_confirmed_at IS NOT NULL THEN true ELSE false END as is_confirmed,
    CASE WHEN raw_user_meta_data->>'role' = 'Administrator' THEN true ELSE false END as is_admin
FROM
    auth.users;

-- Make sure everyone can access this view (we'll control access at the row level)
GRANT SELECT ON public.auth_users_view TO authenticated;
GRANT SELECT ON public.auth_users_view TO anon;
GRANT SELECT ON public.auth_users_view TO service_role;

-- Add RLS policy for the view
CREATE POLICY "Administrators can view all users" 
ON public.auth_users_view 
FOR SELECT 
USING (
    -- Check if requesting user is an admin by looking at their role in auth.users
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE 
            id = auth.uid() AND
            raw_user_meta_data->>'role' = 'Administrator'
    )
);

-- Enable RLS on the view
ALTER VIEW public.auth_users_view SECURITY INVOKER;
ALTER TABLE public.auth_users_view ENABLE ROW LEVEL SECURITY; 