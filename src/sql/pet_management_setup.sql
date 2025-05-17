-- Create tables for pet management

-- Dog breeds table
CREATE TABLE IF NOT EXISTS public.dog_breeds (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    normal_temp_min NUMERIC(4,1) NOT NULL,
    normal_temp_max NUMERIC(4,1) NOT NULL,
    critical_temp NUMERIC(4,1) NOT NULL,
    is_custom BOOLEAN DEFAULT false
);

-- Cat breeds table
CREATE TABLE IF NOT EXISTS public.cat_breeds (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    normal_temp_min NUMERIC(4,1) NOT NULL,
    normal_temp_max NUMERIC(4,1) NOT NULL,
    critical_temp NUMERIC(4,1) NOT NULL,
    is_custom BOOLEAN DEFAULT false
);

-- Pets table
CREATE TABLE IF NOT EXISTS public.pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Dog', 'Cat')),
    breed TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
    is_pregnant BOOLEAN DEFAULT false,
    image_url TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply Row Level Security
ALTER TABLE public.dog_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Create policies for dog_breeds
CREATE POLICY dog_breeds_select ON public.dog_breeds
    FOR SELECT USING (true); -- Everyone can view breeds

CREATE POLICY dog_breeds_insert ON public.dog_breeds
    FOR INSERT WITH CHECK (
        is_custom = true OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'Administrator'
        )
    );

CREATE POLICY dog_breeds_update ON public.dog_breeds
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'Administrator'
        )
    );

-- Create policies for cat_breeds
CREATE POLICY cat_breeds_select ON public.cat_breeds
    FOR SELECT USING (true); -- Everyone can view breeds

CREATE POLICY cat_breeds_insert ON public.cat_breeds
    FOR INSERT WITH CHECK (
        is_custom = true OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'Administrator'
        )
    );

CREATE POLICY cat_breeds_update ON public.cat_breeds
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'Administrator'
        )
    );

-- Create policies for pets
CREATE POLICY pets_select ON public.pets
    FOR SELECT USING (true); -- Everyone can view pets

CREATE POLICY pets_insert ON public.pets
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); -- Only authenticated users can add pets

CREATE POLICY pets_update ON public.pets
    FOR UPDATE USING (
        auth.uid() = owner_id OR -- Pet owner can update
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND (
                raw_user_meta_data->>'role' = 'Administrator' OR
                raw_user_meta_data->>'role' = 'Veterinarian'
            )
        )
    );

CREATE POLICY pets_delete ON public.pets
    FOR DELETE USING (
        auth.uid() = owner_id OR -- Pet owner can delete
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'Administrator'
        )
    );

-- Function to add a new pet
CREATE OR REPLACE FUNCTION public.add_pet(
    p_name TEXT,
    p_type TEXT,
    p_breed TEXT,
    p_gender TEXT,
    p_is_pregnant BOOLEAN DEFAULT false,
    p_image_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_pet_id UUID;
    breed_exists BOOLEAN;
BEGIN
    -- Check if pet type is valid
    IF p_type NOT IN ('Dog', 'Cat') THEN
        RAISE EXCEPTION 'Invalid pet type: %', p_type;
    END IF;
    
    -- Check if gender is valid
    IF p_gender NOT IN ('Male', 'Female') THEN
        RAISE EXCEPTION 'Invalid gender: %', p_gender;
    END IF;
    
    -- Check if breed exists, if not, add it as custom
    IF p_type = 'Dog' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.dog_breeds WHERE LOWER(name) = LOWER(p_breed)
        ) INTO breed_exists;
        
        IF NOT breed_exists THEN
            INSERT INTO public.dog_breeds (name, normal_temp_min, normal_temp_max, critical_temp, is_custom)
            VALUES (p_breed, 30.0, 35.0, 27.0, true);
        END IF;
    ELSE -- Cat
        SELECT EXISTS (
            SELECT 1 FROM public.cat_breeds WHERE LOWER(name) = LOWER(p_breed)
        ) INTO breed_exists;
        
        IF NOT breed_exists THEN
            INSERT INTO public.cat_breeds (name, normal_temp_min, normal_temp_max, critical_temp, is_custom)
            VALUES (p_breed, 34.0, 38.0, 22.0, true);
        END IF;
    END IF;
    
    -- Insert the new pet
    INSERT INTO public.pets (name, type, breed, gender, is_pregnant, image_url, owner_id)
    VALUES (p_name, p_type, p_breed, p_gender, 
            CASE WHEN p_gender = 'Female' THEN p_is_pregnant ELSE false END,
            p_image_url, auth.uid())
    RETURNING id INTO new_pet_id;
    
    RETURN new_pet_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error adding pet: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get breeds for a specific pet type
CREATE OR REPLACE FUNCTION public.get_pet_breeds(p_type TEXT) 
RETURNS TABLE (name TEXT, normal_temp_min NUMERIC, normal_temp_max NUMERIC, critical_temp NUMERIC, is_custom BOOLEAN) AS $$
BEGIN
    IF p_type = 'Dog' THEN
        RETURN QUERY SELECT 
            db.name, 
            db.normal_temp_min, 
            db.normal_temp_max, 
            db.critical_temp, 
            db.is_custom
        FROM public.dog_breeds db
        ORDER BY db.is_custom ASC, db.name ASC;
    ELSIF p_type = 'Cat' THEN
        RETURN QUERY SELECT 
            cb.name, 
            cb.normal_temp_min, 
            cb.normal_temp_max, 
            cb.critical_temp, 
            cb.is_custom
        FROM public.cat_breeds cb
        ORDER BY cb.is_custom ASC, cb.name ASC;
    ELSE
        RAISE EXCEPTION 'Invalid pet type: %', p_type;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default dog breeds
INSERT INTO public.dog_breeds (name, normal_temp_min, normal_temp_max, critical_temp, is_custom)
VALUES 
    ('aspin', 30.0, 35.0, 27.0, false),
    ('corgi', 30.0, 35.0, 27.0, false),
    ('chihuahua', 30.0, 35.0, 27.0, false),
    ('dachshund', 30.0, 35.0, 27.0, false),
    ('pomeranian', 30.0, 35.0, 27.0, false),
    ('poodle', 30.0, 35.0, 27.0, false),
    ('beagle', 30.0, 35.0, 27.0, false),
    ('yorkshire terrier', 30.0, 35.0, 27.0, false),
    ('french bulldog', 29.0, 33.0, 27.0, false),
    ('english bulldog', 29.0, 33.0, 27.0, false),
    ('american bulldog', 29.0, 33.0, 27.0, false),
    ('shih tzu', 29.0, 33.0, 27.0, false),
    ('pug', 29.0, 33.0, 27.0, false)
ON CONFLICT (name) DO NOTHING;

-- Insert default cat breeds
INSERT INTO public.cat_breeds (name, normal_temp_min, normal_temp_max, critical_temp, is_custom)
VALUES 
    ('puspin', 34.0, 38.0, 22.0, false),
    ('bengal', 34.0, 38.0, 22.0, false),
    ('siamese', 34.0, 38.0, 22.0, false),
    ('american shorthair', 34.0, 38.0, 22.0, false),
    ('russian blue', 34.0, 38.0, 22.0, false),
    ('american curl', 34.0, 38.0, 22.0, false),
    ('british shorthair', 34.0, 38.0, 22.0, false),
    ('exotic shorthair', 34.0, 38.0, 22.0, false),
    ('himalayan', 34.0, 38.0, 22.0, false),
    ('persian', 34.0, 38.0, 22.0, false)
ON CONFLICT (name) DO NOTHING; 