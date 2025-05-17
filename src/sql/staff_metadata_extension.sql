-- Create a staff_metadata table to store additional staff information
CREATE TABLE IF NOT EXISTS public.staff_metadata (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    specialty TEXT,
    license TEXT,
    contact TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant access to authenticated users
ALTER TABLE public.staff_metadata ENABLE ROW LEVEL SECURITY;

-- Staff can read their own metadata
CREATE POLICY staff_metadata_select_policy ON public.staff_metadata
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'Administrator'
    ));

-- Only admins can insert/update/delete metadata
CREATE POLICY staff_metadata_insert_policy ON public.staff_metadata
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'Administrator'
    ));

CREATE POLICY staff_metadata_update_policy ON public.staff_metadata
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'Administrator'
    ));

CREATE POLICY staff_metadata_delete_policy ON public.staff_metadata
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'Administrator'
    ));

-- Update auth_users_view if it exists to include metadata
CREATE OR REPLACE VIEW auth_users_view AS
SELECT
    au.id,
    au.email,
    au.confirmed_at,
    au.created_at,
    -- Parse metadata if it exists
    COALESCE(au.raw_user_meta_data->>'full_name', '') as full_name,
    COALESCE(au.raw_user_meta_data->>'role', 'Staff') as role,
    COALESCE(sm.specialty, au.raw_user_meta_data->>'specialty') as specialty,
    COALESCE(sm.license, au.raw_user_meta_data->>'license') as license,
    COALESCE(sm.contact, au.raw_user_meta_data->>'contact') as contact,
    COALESCE(sm.notes, au.raw_user_meta_data->>'notes') as notes
FROM
    auth.users au
LEFT JOIN
    public.staff_metadata sm ON au.id = sm.user_id;

-- Function to update staff metadata
CREATE OR REPLACE FUNCTION public.update_staff_metadata(
    p_user_id UUID,
    p_specialty TEXT DEFAULT NULL,
    p_license TEXT DEFAULT NULL,
    p_contact TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if the current user is an admin
    SELECT EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'Administrator'
    ) INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Access denied: Only administrators can update staff metadata';
    END IF;
    
    -- Insert or update the metadata
    INSERT INTO public.staff_metadata (user_id, specialty, license, contact, notes)
    VALUES (p_user_id, p_specialty, p_license, p_contact, p_notes)
    ON CONFLICT (user_id)
    DO UPDATE SET
        specialty = COALESCE(p_specialty, staff_metadata.specialty),
        license = COALESCE(p_license, staff_metadata.license),
        contact = COALESCE(p_contact, staff_metadata.contact),
        notes = COALESCE(p_notes, staff_metadata.notes),
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating staff metadata: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get staff metadata
CREATE OR REPLACE FUNCTION public.get_staff_metadata(
    p_user_id UUID DEFAULT auth.uid()
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Check if the current user is allowed to view this metadata
    IF p_user_id <> auth.uid() THEN
        -- Verify if the current user is an admin
        IF NOT EXISTS (
            SELECT 1 
            FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'Administrator'
        ) THEN
            RETURN NULL;
        END IF;
    END IF;
    
    -- Get metadata from both the users metadata and the staff_metadata table
    SELECT jsonb_build_object(
        'specialty', COALESCE(sm.specialty, u.raw_user_meta_data->>'specialty'),
        'license', COALESCE(sm.license, u.raw_user_meta_data->>'license'),
        'contact', COALESCE(sm.contact, u.raw_user_meta_data->>'contact'),
        'notes', COALESCE(sm.notes, u.raw_user_meta_data->>'notes')
    )
    INTO result
    FROM auth.users u
    LEFT JOIN public.staff_metadata sm ON u.id = sm.user_id
    WHERE u.id = p_user_id;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 