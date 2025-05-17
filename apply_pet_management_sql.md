# Applying Pet Management SQL to Supabase

Follow these steps to apply the pet management SQL schema to your Supabase project:

## Step 1: Enable UUID Extension

First, make sure the UUID extension is enabled in your Supabase project:

1. Log in to your Supabase account and select your project
2. Navigate to the "SQL Editor" section in the left sidebar
3. Click "New Query"
4. Enter the following SQL command and run it:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## Step 2: Apply the Pet Management SQL

1. Open the SQL Editor in your Supabase dashboard
2. Create a new query
3. Open the file `src/sql/pet_management_setup.sql` from your local project
4. Copy the entire contents of the file
5. Paste the SQL into the Supabase SQL Editor window
6. Click "Run" to execute the SQL commands

## Step 3: Verify the Installation

After running the SQL script:

1. Go to the "Table Editor" in your Supabase dashboard
2. You should see the following new tables:
   - `pets`
   - `dog_breeds`
   - `cat_breeds`
3. Check the "Functions" section and you should see:
   - `add_pet` function
   - `get_pet_breeds` function
4. Each table should be populated with the default breed data

## Step 4: Troubleshooting

If you encounter any errors:

1. The script uses "IF NOT EXISTS" clauses, so it should be safe to run multiple times
2. Make sure your Supabase instance has the required permissions
3. If you see errors about the UUID extension, make sure you completed Step 1
4. For row-level security errors, make sure the policies have been created correctly

## Step 5: Using the Pet Management Features

After applying the SQL:

1. The enhanced PetsPage.tsx now integrates with these tables
2. The `add_pet` function automatically handles custom breeds
3. The `get_pet_breeds` function retrieves breed lists
4. Row-level security ensures users can only manipulate their own pets (unless they're administrators)

## Breed Management

The system includes:

1. Pre-defined breeds for dogs and cats with temperature thresholds
2. Support for adding custom breeds when needed
3. Automatic breed verification to avoid duplicates

The temperature thresholds (normal_temp_min, normal_temp_max, critical_temp) are used for monitoring the health of pets and can be adjusted as needed through the Supabase dashboard. 