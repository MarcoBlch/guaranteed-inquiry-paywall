import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { FastPassLogo } from "@/components/ui/FastPassLogo";

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
      <div className="min-h-screen relative overflow-hidden">
        {/* StaticBackground component from App.tsx provides the background */}

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className="p-4 sm:p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <FastPassLogo size="lg" />
              <p className="text-white/80 text-xs sm:text-sm font-medium tracking-wider -mt-4 sm:-mt-5">
                GUARANTEED RESPONSES
              </p>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_20px_rgba(92,255,176,0.2)]">
              <CardContent className="p-6 text-center">
                <p className="text-[#B0B0B0] mb-4">Please log in first</p>
                <Button
                  onClick={() => navigate('/auth')}
                  className="bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold"
                >
                  Go to Login
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <footer className="text-center py-6 text-[#B0B0B0]/60 text-xs sm:text-sm px-4">
            <p>© 2025 FastPass • Guaranteed Response Platform</p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* StaticBackground component from App.tsx provides the background */}

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <FastPassLogo size="lg" />
            <p className="text-white/80 text-xs sm:text-sm font-medium tracking-wider -mt-4 sm:-mt-5">
              GUARANTEED RESPONSES
            </p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_20px_rgba(92,255,176,0.2)]">
            <CardHeader>
              <CardTitle className="text-[#5cffb0] text-2xl font-bold">Admin Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#5cffb0]/10 border border-[#5cffb0]/30 rounded-lg p-4">
                <p className="text-[#B0B0B0] text-sm mb-2">
                  <strong className="text-[#5cffb0]">Current user:</strong> {currentUser.email}
                </p>
                <p className="text-[#B0B0B0] text-xs">
                  <strong className="text-[#5cffb0]">User ID:</strong>
                  <code className="ml-2 text-xs">{currentUser.id}</code>
                </p>
              </div>

              {currentUser.email === 'marc.bernard@ece-france.com' ? (
                <div className="space-y-4">
                  <p className="text-sm text-[#B0B0B0]">
                    You are authorized to grant yourself admin privileges.
                  </p>
                  <Button
                    onClick={grantSelfAdminPrivileges}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-all duration-300"
                  >
                    {loading ? 'Granting Admin Privileges...' : 'Grant Admin Privileges'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-sm text-red-400">
                      Only marc.bernard@ece-france.com can use this setup page.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/')}
                    variant="outline"
                    className="w-full border-[#5cffb0]/50 text-[#5cffb0] hover:bg-[#5cffb0]/10"
                  >
                    Go to Home
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-[#B0B0B0]/60 text-xs sm:text-sm px-4">
          <p>© 2025 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminSetup;
