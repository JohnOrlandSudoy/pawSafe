-- Function to delete a pet
CREATE OR REPLACE FUNCTION public.delete_pet(p_pet_id UUID)
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
CREATE OR REPLACE FUNCTION public.update_pet(
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
GRANT EXECUTE ON FUNCTION public.delete_pet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_pet(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Add comment to functions
COMMENT ON FUNCTION public.delete_pet IS 'Deletes a pet by ID';
COMMENT ON FUNCTION public.update_pet IS 'Updates a pet''s information'; 