-- SQL for User Management capabilities

-- Create a secure function to add users (only authenticated owners can use this)
CREATE OR REPLACE FUNCTION add_user(
    new_email TEXT,
    new_password TEXT,
    new_full_name TEXT,
    new_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with definer's permissions
SET search_path = public
AS $$
DECLARE
    new_user_id UUID;
    admin_user_id UUID;
BEGIN
    -- Check if the current user has permission (is an owner)
    SELECT id INTO admin_user_id FROM public.owners WHERE id = auth.uid();
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Permission denied: Only owners can add users';
    END IF;
    
    -- Create the user in auth.users table
    INSERT INTO auth.users (
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        created_at,
        updated_at,
        is_sso_user,
        is_anonymous
    )
    VALUES (
        (SELECT instance_id FROM auth.users WHERE id = admin_user_id LIMIT 1),
        new_email,
        crypt(new_password, gen_salt('bf')),
        now(), -- Auto-confirm email
        jsonb_build_object(
            'full_name', new_full_name,
            'role', new_role,
            'created_by', admin_user_id
        ),
        now(),
        now(),
        false,
        false
    )
    RETURNING id INTO new_user_id;
    
    -- If user is an Administrator, add them to the owners table
    IF new_role = 'Administrator' THEN
        INSERT INTO public.owners (id, full_name)
        VALUES (new_user_id, new_full_name);
    END IF;
    
    RETURN new_user_id;
END;
$$;

-- Create a secure function to list all users (for administrators)
CREATE OR REPLACE FUNCTION list_users()
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
    IF NOT EXISTS (SELECT 1 FROM public.owners WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Permission denied: Only owners can list users';
    END IF;
    
    -- Return user data
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

-- Create a secure function to delete a user
CREATE OR REPLACE FUNCTION delete_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if the current user has permission (is an owner)
    SELECT id INTO admin_user_id FROM public.owners WHERE id = auth.uid();
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Permission denied: Only owners can delete users';
    END IF;
    
    -- Check if trying to delete self
    IF target_user_id = admin_user_id THEN
        RAISE EXCEPTION 'Cannot delete your own account';
    END IF;
    
    -- Remove from owners table first if applicable
    DELETE FROM public.owners WHERE id = target_user_id;
    
    -- Remove from auth.users
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RETURN FOUND;
END;
$$;

-- Create a secure function to update a user
CREATE OR REPLACE FUNCTION update_user(
    target_user_id UUID,
    new_email TEXT DEFAULT NULL,
    new_full_name TEXT DEFAULT NULL,
    new_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_user_id UUID;
    current_role TEXT;
    update_data JSONB;
BEGIN
    -- Check if the current user has permission (is an owner)
    SELECT id INTO admin_user_id FROM public.owners WHERE id = auth.uid();
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Permission denied: Only owners can update users';
    END IF;
    
    -- Get current user data for selective update
    SELECT raw_user_meta_data->>'role' INTO current_role
    FROM auth.users
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Prepare the update data
    update_data := '{}';
    
    -- Build the update JSONB
    IF new_full_name IS NOT NULL THEN
        update_data := update_data || jsonb_build_object('full_name', new_full_name);
    END IF;
    
    IF new_role IS NOT NULL THEN
        update_data := update_data || jsonb_build_object('role', new_role);
    END IF;
    
    -- Update email if provided
    IF new_email IS NOT NULL THEN
        UPDATE auth.users 
        SET email = new_email
        WHERE id = target_user_id;
    END IF;
    
    -- Update metadata
    UPDATE auth.users 
    SET raw_user_meta_data = raw_user_meta_data || update_data,
        updated_at = now()
    WHERE id = target_user_id;
    
    -- Handle role change to/from Administrator
    IF new_role IS NOT NULL AND new_role != current_role THEN
        -- If new role is Administrator, add to owners table
        IF new_role = 'Administrator' THEN
            INSERT INTO public.owners (id, full_name)
            VALUES (
                target_user_id, 
                COALESCE(new_full_name, (
                    SELECT raw_user_meta_data->>'full_name' 
                    FROM auth.users 
                    WHERE id = target_user_id
                ))
            )
            ON CONFLICT (id) DO NOTHING;
            
        -- If old role was Administrator but new role isn't, remove from owners
        ELSIF current_role = 'Administrator' THEN
            DELETE FROM public.owners WHERE id = target_user_id;
        END IF;
    END IF;
    
    RETURN FOUND;
END;
$$;

-- Create a secure function to change a user's password
CREATE OR REPLACE FUNCTION change_user_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if the current user has permission (is an owner)
    SELECT id INTO admin_user_id FROM public.owners WHERE id = auth.uid();
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Permission denied: Only owners can change passwords';
    END IF;
    
    -- Update the password
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;
    
    RETURN FOUND;
END;
$$; 