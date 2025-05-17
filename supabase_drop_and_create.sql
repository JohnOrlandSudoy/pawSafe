-- First drop the existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.delete_user(UUID);
DROP FUNCTION IF EXISTS public.update_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.delete_pet(UUID);
DROP FUNCTION IF EXISTS public.update_pet(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

-- Drop the view if it exists
DROP VIEW IF EXISTS auth_users_view;

-- Create auth_users_view to display user data
CREATE VIEW auth_users_view AS
SELECT 
  u.id,
  u.email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'avatar' as avatar,
  raw_user_meta_data->>'specialty' as specialty,
  raw_user_meta_data->>'license' as license,
  raw_user_meta_data->>'contact' as contact,
  raw_user_meta_data->>'notes' as notes,
  u.created_at
FROM auth.users u;

-- Function to update a user (corrected)
CREATE FUNCTION public.update_user(
  p_user_id UUID,
  p_full_name TEXT,
  p_role TEXT,
  p_specialty TEXT DEFAULT NULL,
  p_license TEXT DEFAULT NULL,
  p_contact TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metadata JSONB;
  v_existing_metadata JSONB;
BEGIN
  -- Get existing metadata to preserve other fields
  SELECT raw_user_meta_data INTO v_existing_metadata
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Start with existing metadata or empty object
  v_metadata = COALESCE(v_existing_metadata, '{}'::jsonb);
  
  -- Update specific fields
  v_metadata = v_metadata || jsonb_build_object('full_name', p_full_name);
  v_metadata = v_metadata || jsonb_build_object('role', p_role);
  
  -- Add optional fields if provided
  IF p_specialty IS NOT NULL THEN
    v_metadata = v_metadata || jsonb_build_object('specialty', p_specialty);
  END IF;
  
  IF p_license IS NOT NULL THEN
    v_metadata = v_metadata || jsonb_build_object('license', p_license);
  END IF;
  
  IF p_contact IS NOT NULL THEN
    v_metadata = v_metadata || jsonb_build_object('contact', p_contact);
  END IF;
  
  IF p_notes IS NOT NULL THEN
    v_metadata = v_metadata || jsonb_build_object('notes', p_notes);
  END IF;
  
  -- Update user metadata
  UPDATE auth.users
  SET raw_user_meta_data = v_metadata
  WHERE id = p_user_id;
  
  RETURN v_metadata;
END;
$$;

-- Function to delete a user (corrected)
CREATE FUNCTION public.delete_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  success BOOLEAN;
BEGIN
  -- Delete from auth.users
  DELETE FROM auth.users
  WHERE id = p_user_id;
  
  GET DIAGNOSTICS success = ROW_COUNT;
  RETURN success > 0;
END;
$$;

-- Function to delete a pet
CREATE FUNCTION public.delete_pet(p_pet_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  success BOOLEAN;
BEGIN
  DELETE FROM pets
  WHERE id = p_pet_id;
  
  GET DIAGNOSTICS success = ROW_COUNT;
  RETURN success > 0;
END;
$$;

-- Function to update a pet
CREATE FUNCTION public.update_pet(
  p_pet_id UUID,
  p_name TEXT,
  p_type TEXT,
  p_breed TEXT,
  p_gender TEXT,
  p_is_pregnant BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  success BOOLEAN;
BEGIN
  UPDATE pets
  SET 
    name = p_name,
    type = p_type,
    breed = p_breed,
    gender = p_gender,
    is_pregnant = p_is_pregnant,
    updated_at = NOW()
  WHERE id = p_pet_id;
  
  GET DIAGNOSTICS success = ROW_COUNT;
  RETURN success > 0;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_pet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_pet(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Grant select permission on the view
GRANT SELECT ON auth_users_view TO authenticated;

-- Add comment to functions
COMMENT ON FUNCTION public.update_user IS 'Updates a user''s information';
COMMENT ON FUNCTION public.delete_user IS 'Deletes a user by ID';
COMMENT ON FUNCTION public.delete_pet IS 'Deletes a pet by ID';
COMMENT ON FUNCTION public.update_pet IS 'Updates a pet''s information';
COMMENT ON VIEW auth_users_view IS 'View for displaying user data from auth schema'; 