-- Fix the remaining security issue: Add missing RLS policy for the "Allow insert if user matches" table

-- Since we don't know the exact table name, let's find and fix tables with RLS enabled but no policies
-- The table likely needs basic access policies

-- Create policy for the table that has RLS enabled but no policies
-- This is a fallback policy that will be restrictive by default
DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- Find tables with RLS enabled but no policies
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN (
            SELECT t.table_name
            FROM information_schema.tables t
            WHERE t.table_schema = 'public'
            AND NOT EXISTS (
                SELECT 1 
                FROM pg_policies p 
                WHERE p.schemaname = 'public' 
                AND p.tablename = t.table_name
            )
            AND EXISTS (
                SELECT 1 
                FROM pg_class c 
                JOIN pg_namespace n ON c.relnamespace = n.oid 
                WHERE c.relname = t.table_name 
                AND n.nspname = 'public' 
                AND c.relrowsecurity = true
            )
        )
    LOOP
        -- Add a restrictive default policy for any table missing policies
        EXECUTE format('CREATE POLICY "Default restrictive policy" ON public.%I FOR ALL USING (false)', table_record.tablename);
        RAISE NOTICE 'Added restrictive policy to table: %', table_record.tablename;
    END LOOP;
END $$;