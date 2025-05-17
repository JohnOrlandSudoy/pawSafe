-- Fix for the list_users function to resolve ambiguous id column reference

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.list_users();

-- Create the fixed version with proper table aliases
CREATE OR REPLACE FUNCTION public.list_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the current user has permission (is an owner)
    IF NOT EXISTS (SELECT 1 FROM public.owners o WHERE o.id = auth.uid()) THEN
        RAISE EXCEPTION 'Permission denied: Only owners can list users';
    END IF;
    
    -- Return user data with explicit table aliases to avoid ambiguity
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        (u.raw_user_meta_data->>'full_name')::TEXT as full_name,
        (u.raw_user_meta_data->>'role')::TEXT as role,
        u.created_at
    FROM 
        auth.users u
    ORDER BY 
        u.created_at DESC;
END;
$$; 