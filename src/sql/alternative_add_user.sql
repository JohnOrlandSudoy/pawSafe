-- Alternative add_user function that doesn't use pgcrypto
-- WARNING: This is a simplified version that assumes password hashing is handled by the app

CREATE OR REPLACE FUNCTION add_user_simple(
    new_email TEXT,
    new_role TEXT,
    new_full_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_user_id UUID;
    result JSON;
BEGIN
    -- Check if the current user has permission (is an owner)
    SELECT id INTO admin_user_id FROM public.owners WHERE id = auth.uid();
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Permission denied: Only owners can add users';
    END IF;

    -- Return information needed to create the user
    -- The actual user creation will be handled in the application code
    result := json_build_object(
        'validated', true,
        'requested_by', admin_user_id,
        'request_time', now()
    );
    
    RETURN result;
END;
$$; 