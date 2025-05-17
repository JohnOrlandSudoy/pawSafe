import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if .env variables are loaded
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Error: Missing Supabase configuration in .env file');
  console.log('Please make sure you have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY defined');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Read the SQL file
const sqlFilePath = path.join(__dirname, 'src', 'sql', 'fix_sensor_data_table.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function runSql() {
  try {
    console.log('Running SQL to fix sensor_data table...');
    
    // Try directly running the queries
    console.log('Checking if sensor_data table exists...');
    const { error: tableCheckError } = await supabase.from('sensor_data').select('*').limit(1);
    
    if (tableCheckError && tableCheckError.code === '42P01') {
      console.error('Table does not exist yet. You need to create it using the SQL script.');
      console.log('Please follow the manual steps below.');
    } else {
      console.log('Table exists, checking for location column...');
      
      try {
        // Try to select the location column
        const { error: columnCheckError } = await supabase.from('sensor_data').select('location').limit(1);
        
        if (columnCheckError && columnCheckError.code === '42703') {
          console.log('Location column is missing. You need to add it using the SQL script.');
          console.log('Please follow the manual steps below.');
        } else {
          console.log('Location column seems to exist or there was a different error.');
        }
      } catch (err) {
        console.error('Error checking column:', err);
      }
    }
    
    console.log('\nManual SQL Instructions:');
    console.log('1. Go to the Supabase dashboard (https://app.supabase.com)');
    console.log('2. Open your project and navigate to the SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the following SQL:');
    console.log('\n-------------------- SQL SCRIPT --------------------');
    console.log(sqlContent);
    console.log('---------------------------------------------------\n');
    console.log('5. Run the SQL script');
    console.log('6. This will:');
    console.log('   - Add the location column if it\'s missing');
    console.log('   - Create the get_sensor_history function');
    console.log('   - Add sample data if the table is empty');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

runSql(); 