import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const AdminSetup = () => {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  const grantSelfAdminPrivileges = async () => {
    if (!currentUser) {
      toast.error('You need to be logged in');
      return;
    }

    // Only allow marc.bernard@ece-france.com to grant themselves admin
    if (currentUser.email !== 'marc.bernard@ece-france.com') {
      toast.error('This setup page is only for marc.bernard@ece-france.com');
      return;
    }

    setLoading(true);
    
    try {
      // Try to update the profile directly
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: currentUser.id,
          is_admin: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // If the trigger prevents us, we need a different approach
        console.error('Direct update failed:', error);
        
        // Create a SQL script that can be run manually
        const sqlScript = `
-- Manual SQL to grant admin privileges to ${currentUser.email}
-- Run this in the Supabase SQL editor

BEGIN;

-- Temporarily disable the admin escalation trigger
ALTER TABLE public.profiles DISABLE TRIGGER trigger_prevent_admin_escalation;

-- Grant admin privileges
UPDATE public.profiles 
SET is_admin = true, updated_at = now() 
WHERE id = '${currentUser.id}';

-- Insert if profile doesn't exist
INSERT INTO public.profiles (id, is_admin, created_at, updated_at) 
VALUES ('${currentUser.id}', true, now(), now()) 
ON CONFLICT (id) DO NOTHING;

-- Re-enable the trigger
ALTER TABLE public.profiles ENABLE TRIGGER trigger_prevent_admin_escalation;

-- Verify the change
SELECT p.id, u.email, p.is_admin 
FROM public.profiles p 
JOIN auth.users u ON p.id = u.id 
WHERE u.email = '${currentUser.email}';

COMMIT;
        `;

        toast.error(
          'Direct update blocked by security trigger. Manual SQL execution required.',
          {
            duration: 10000,
            description: 'Check browser console for SQL script to run manually.'
          }
        );
        
        console.log('=== MANUAL SQL SCRIPT ===');
        console.log(sqlScript);
        console.log('=== END SCRIPT ===');
        
        return;
      }

      console.log('Admin privileges granted:', data);
      toast.success('Admin privileges granted successfully!');
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error granting admin privileges:', error);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p>Please log in first</p>
            <Button onClick={() => navigate('/auth')} className="mt-4">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Current user: <strong>{currentUser.email}</strong></p>
          <p>User ID: <code className="text-xs">{currentUser.id}</code></p>
          
          {currentUser.email === 'marc.bernard@ece-france.com' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You are authorized to grant yourself admin privileges.
              </p>
              <Button 
                onClick={grantSelfAdminPrivileges}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Granting Admin Privileges...' : 'Grant Admin Privileges'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-red-600">
                Only marc.bernard@ece-france.com can use this setup page.
              </p>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                Go to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup;