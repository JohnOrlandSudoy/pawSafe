# How to Set Up Activities and Alerts in Your Supabase Database

Follow these steps to set up the real-time activities and alerts system for your PawSafe dashboard:

## Step 1: Open the Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on the "SQL Editor" tab in the left sidebar
3. Click "New Query" to create a new SQL script

## Step 2: Run the SQL Script

1. Copy the entire contents of the `src/sql/activities_alerts_tables.sql` file
2. Paste it into the SQL Editor
3. Click "Run" to execute the script
4. You should see a success message for each statement

## Step 3: Test the System

After setting up the tables and triggers, you can test the system by:

1. Adding a new pet through the UI - this should automatically generate an activity
2. Adding a temperature reading with values outside normal range (below 18°C or above 30°C) - this should generate an alert

## Step 4: Add the Script to Your Deployment Process

If you're deploying to a new environment, make sure to include this SQL script in your deployment process to ensure the activities and alerts tables are properly set up.

## Manual Activity and Alert Creation

You can also manually create activities and alerts using the following SQL:

```sql
-- Create a manual activity
INSERT INTO activities (action, user_name, details)
VALUES ('manual action', 'Your Name', 'This is a manual activity entry for testing');

-- Create a manual alert
INSERT INTO alerts (message, type)
VALUES ('This is a test alert', 'info'); -- type can be 'info', 'warning', or 'error'
```

## Using the Activity Logger in Your Application

The application includes utility functions in `src/utils/activityLogger.ts` that you can use to log activities and create alerts from any component:

```typescript
import { logActivity, createAlert } from '../utils/activityLogger';

// Log an activity
await logActivity('added medication', currentUser, 'Administered medication to Rex', 'pet', petId);

// Create an alert
await createAlert('Low supply of medication', 'warning', 'inventory', 'medication', medicationId);
```

These functions will automatically update the dashboard in real-time thanks to the Supabase subscriptions. 