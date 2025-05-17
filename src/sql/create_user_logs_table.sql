-- SQL for creating user activity logs and audit tables

-- Create table to log user management activities
CREATE TABLE IF NOT EXISTS public.user_management_logs (
    id SERIAL PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'password_reset', 'login_attempt')),
    target_user_id UUID REFERENCES auth.users(id),
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_management_logs
ALTER TABLE public.user_management_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow administrators to insert logs
CREATE POLICY user_logs_insert_policy ON public.user_management_logs
    FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT id FROM public.owners));

-- Create policy to allow administrators to view logs
CREATE POLICY user_logs_select_policy ON public.user_management_logs
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM public.owners));

-- Create function to log user management actions
CREATE OR REPLACE FUNCTION public.log_user_management_action(
    action_type TEXT,
    target_user_id UUID,
    details JSONB DEFAULT '{}',
    ip_address TEXT DEFAULT NULL,
    user_agent TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_id UUID;
    log_id BIGINT;
BEGIN
    -- Get the current authenticated user
    admin_id := auth.uid();
    
    -- Check if the user is an administrator
    IF NOT EXISTS (SELECT 1 FROM public.owners WHERE id = admin_id) THEN
        RAISE EXCEPTION 'Only administrators can log user management actions';
    END IF;
    
    -- Insert the log entry
    INSERT INTO public.user_management_logs (
        admin_id,
        action_type,
        target_user_id,
        details,
        ip_address,
        user_agent
    )
    VALUES (
        admin_id,
        action_type,
        target_user_id,
        details,
        ip_address,
        user_agent
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Create trigger function to automatically log user creations
CREATE OR REPLACE FUNCTION public.log_user_creation()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
    user_details JSONB;
BEGIN
    -- Get current authenticated user
    admin_id := auth.uid();
    
    -- Only log if operation was performed by an authenticated user
    IF admin_id IS NOT NULL THEN
        -- Build user details JSON
        user_details := jsonb_build_object(
            'email', NEW.email,
            'role', NEW.raw_user_meta_data->>'role',
            'created_at', NEW.created_at
        );
        
        -- Log the user creation
        PERFORM public.log_user_management_action(
            'create',
            NEW.id,
            user_details
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create table to store form submissions for approval
CREATE TABLE IF NOT EXISTS public.user_form_submissions (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    submitted_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Enable RLS on user_form_submissions
ALTER TABLE public.user_form_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to submit forms
CREATE POLICY form_submissions_insert_policy ON public.user_form_submissions
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create policy to allow owners to view all form submissions
CREATE POLICY form_submissions_select_policy ON public.user_form_submissions
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM public.owners));

-- Create policy to allow form submitters to view their own submissions
CREATE POLICY form_submissions_select_own_policy ON public.user_form_submissions
    FOR SELECT
    USING (auth.uid() = submitted_by);

-- Create policy to allow owners to update form submissions
CREATE POLICY form_submissions_update_policy ON public.user_form_submissions
    FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM public.owners)); 