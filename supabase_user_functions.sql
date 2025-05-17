-- Create auth_users_view to display user data
CREATE OR REPLACE VIEW auth_users_view AS
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

-- Function to update a user
CREATE OR REPLACE FUNCTION public.update_user(
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
SET search_path = public, auth
AS $$
DECLARE
  v_metadata JSONB;
BEGIN
  -- Construct metadata JSON
  v_metadata = jsonb_build_object(
    'full_name', p_full_name,
    'role', p_role
  );
  
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

-- Function to delete a user
CREATE OR REPLACE FUNCTION public.delete_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Delete from auth.users
  DELETE FROM auth.users
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;

-- Grant select permission on the view
GRANT SELECT ON auth_users_view TO authenticated;

-- Add comment to functions
COMMENT ON FUNCTION public.update_user IS 'Updates a user''s information';
COMMENT ON FUNCTION public.delete_user IS 'Deletes a user by ID';
COMMENT ON VIEW auth_users_view IS 'View for displaying user data from auth schema'; 