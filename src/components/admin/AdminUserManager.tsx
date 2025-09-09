import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminUserManager = () => {
  const [email, setEmail] = useState('marc.bernard@ece-france.com');
  const [loading, setLoading] = useState(false);

  const grantAdminPrivileges = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    
    try {
      // First, check if we can find any user data
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);
        
      console.log('Available profiles:', profiles);
      
      // For now, let's manually create/update the profile
      // Since we need the user ID, we'll use a different approach
      
      // Try to insert or update a profile directly
      // This assumes the user has already signed up
      const { data, error } = await supabase
        .from('profiles')
        .upsert([
          {
            email: email,
            is_admin: true,
            updated_at: new Date().toISOString()
          }
        ], {
          onConflict: 'email',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('Upsert error:', error);
        throw error;
      }

      console.log('Admin privileges granted:', data);
      toast.success(`Admin privileges granted to ${email}`);
      
    } catch (error) {
      console.error('Error granting admin privileges:', error);
      toast.error(`Failed to grant admin privileges: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Grant Admin Privileges</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="email"
          placeholder="Enter email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button 
          onClick={grantAdminPrivileges}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Granting...' : 'Grant Admin Privileges'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminUserManager;