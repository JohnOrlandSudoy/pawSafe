# Supabase Setup for PawSafeUI

This document provides instructions for setting up Supabase authentication for the PawSafeUI project.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in or create an account
2. Create a new project and note your project URL and anon key

## 2. Configure Environment Variables

1. Create a `.env` file in the root of your project with the following content:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. Set Up the Database Schema

1. In the Supabase dashboard, navigate to the SQL Editor
2. Copy the contents of the `supabase_schema.sql` file in this project
3. Paste and run the SQL commands to create the necessary tables and functions
4. The SQL schema includes:
   - Profile table structure and permissions
   - Automatic email verification via a database trigger
   - Auto-creation of user profiles when users sign up

## 4. Authentication Features

**Note: Email verification is handled automatically.**

1. Users can sign up with email/password
2. Email verification is automatically completed by a database trigger
3. Upon successful login or signup, users are automatically redirected to the Dashboard
4. No manual email confirmation is required

If you want to enable manual email confirmation for production:
1. Remove the `auto_verify_email` function and trigger from the SQL schema
2. In the Supabase dashboard, go to Authentication > Settings > Email
3. Enable "Confirm email"
4. Customize email templates if desired
5. Update the code in `src/contexts/AuthContext.tsx` to remove auto sign-in after registration

## 5. Testing the Setup

1. Run your application with `npm run dev`
2. Try signing up with a test email and password
3. You should be automatically logged in and redirected to the Dashboard
4. Verify that:
   - A new record is created in the `profiles` table
   - The user's email is automatically verified in the `auth.users` table

## 6. Troubleshooting

- If users aren't automatically redirected to Dashboard, check the login/signup functions in AuthContext
- If user profiles aren't being created automatically, check that the trigger functions are working properly
- If authentication is failing, verify your environment variables are correctly set
- For more advanced Row Level Security, you may need to modify the policies in the schema file

## 7. Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Database Triggers](https://supabase.com/docs/guides/database/triggers) 