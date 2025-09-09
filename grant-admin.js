// Simple script to grant admin privileges via direct database operation
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://znncfayiwfamujvrprvf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubmNmYXlpd2ZhbXVqdnJwcnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3OTY5MDQsImV4cCI6MjA2MDM3MjkwNH0.NcM9yKGoQsttzE4cYfqhyV1aG7fvt-lQCHZKy5CPHCk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function grantAdminPrivileges(email) {
  try {
    console.log(`Attempting to grant admin privileges to: ${email}`)
    
    // First, let's find if this user exists in auth.users
    // Since we can't access auth.users directly with anon key, let's try to update the profile directly
    
    // Method 1: Try to update all profiles with matching email (if email is stored in profiles table)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
    
    if (profileError) {
      console.error('Error fetching profiles:', profileError)
      return
    }
    
    console.log('Found profiles:', profiles?.length)
    
    // For now, let's try a direct SQL approach using RPC function
    // We'll create an RPC function in the database
    
  } catch (error) {
    console.error('Error:', error)
  }
}

// Run the script
grantAdminPrivileges('marc.bernard@ece-france.com')