# Applying Staff Metadata SQL to Supabase

Follow these steps to apply the staff metadata SQL schema to your Supabase project:

## Option 1: Using the Supabase SQL Editor

1. Log in to your Supabase account and select your project
2. Navigate to the "SQL Editor" section in the left sidebar
3. Click "New Query"
4. Open the file `src/sql/staff_metadata_extension.sql` from your local project
5. Copy the entire contents of the file
6. Paste the SQL into the Supabase SQL Editor window
7. Click "Run" to execute the SQL commands

## Option 2: Using the Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Apply the SQL file to your Supabase project
supabase db push --db-url YOUR_SUPABASE_DB_URL --file src/sql/staff_metadata_extension.sql
```

## Verifying the Installation

After running the SQL script:

1. Go to the "Table Editor" in your Supabase dashboard
2. You should see a new table called `staff_metadata`
3. Check "SQL" section and you should see:
   - New view: `auth_users_view` (updated with metadata fields)
   - New functions: `update_staff_metadata` and `get_staff_metadata`
   
## Troubleshooting

If you encounter any errors:

1. Check if any objects already exist (like the `auth_users_view`)
2. If so, you may need to drop them first using: `DROP VIEW IF EXISTS auth_users_view;`
3. Ensure you have appropriate permissions on your Supabase project
4. Some functions may require additional extensions to be enabled

## Next Steps

After applying the SQL:

1. Use the enhanced UsersPage.tsx to add staff with their role-specific information
2. The metadata will be stored both in the auth.users metadata and in the staff_metadata table
3. You can query staff information using the `auth_users_view` view 