
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const Dashboard = () => {
  const [price, setPrice] = useState(10);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Please login first');
      navigate('/auth');
      return;
    }
    
    setUserId(user.id);
    
    // Load profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('price')
      .eq('id', user.id)
      .single();
      
    if (profile) {
      setPrice(profile.price || 10);
    }
  };

  const handleSaveSettings = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          price: price
        })
        .eq('id', userId);
        
      if (error) throw error;
      toast.success('Settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const generatePaymentLink = () => {
    if (!userId) return '';
    
    const baseUrl = window.location.origin;
    return `${baseUrl}/pay/${userId}`;
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button 
            variant="destructive" 
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
        
        <Tabs defaultValue="settings">
          <TabsList className="mb-4">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="payments">Payment Link</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>
                  Configure your response pricing and payment details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Response ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="5"
                    max="500"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Platform commission (20%): ${(price * 0.2).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You receive: ${(price * 0.8).toFixed(2)}
                  </p>
                </div>
                
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Your Payment Link</CardTitle>
                <CardDescription>
                  Share this link with others to receive paid messages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                  <code className="text-sm break-all">{generatePaymentLink()}</code>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigator.clipboard.writeText(generatePaymentLink());
                      toast.success('Link copied to clipboard!');
                    }}
                  >
                    Copy
                  </Button>
                </div>
                
                <p className="text-sm">
                  When someone uses this link, they'll be able to send you a message with payment.
                  You'll receive an email notification once payment is complete.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your Stripe payment details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Stripe payment integration is now active. Payment processing will be handled automatically.
                  </p>
                  <Button 
                    onClick={handleSaveSettings}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
