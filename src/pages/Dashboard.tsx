import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [stripeOnboarded, setStripeOnboarded] = useState(false);
  const [pendingFunds, setPendingFunds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuth();
    
    // Vérifier si retour de Stripe onboarding
    if (searchParams.get('setup') === 'complete') {
      toast.success('Configuration Stripe terminée !');
      checkAuth(); // Recharger les données
    }
  }, [navigate, searchParams]);

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
      .select('stripe_account_id, stripe_onboarding_completed, price')
      .eq('id', user.id)
      .single();
      
    if (profile) {
      setStripeAccountId(profile.stripe_account_id || '');
      setStripeOnboarded(profile.stripe_onboarding_completed || false);
      setPrice(profile.price || 10);
    }

    // Calculer fonds en attente
    const { data: pendingTransactions } = await supabase
      .from('escrow_transactions')
      .select('amount')
      .eq('recipient_user_id', user.id)
      .eq('status', 'pending_user_setup');

    if (pendingTransactions) {
      const total = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);
      setPendingFunds(total);
    }
  };

  const handleSaveSettings = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ price: price })
        .eq('id', userId);
        
      if (error) throw error;
      toast.success('Settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStripeOnboarding = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account', {
        body: { userId }
      });
      
      if (error) throw error;
      
      // Redirect to Stripe onboarding
      window.location.href = data.onboarding_url;
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
            <TabsTrigger value="stripe">Stripe Setup</TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Response Pricing</CardTitle>
                <CardDescription>
                  Configure your guaranteed response pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Base Price (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="5"
                    max="500"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• 24h response: €{(price * 1.5).toFixed(2)} (premium)</p>
                    <p>• 48h response: €{(price * 1.2).toFixed(2)} (standard)</p>
                    <p>• 72h response: €{price.toFixed(2)} (basic)</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-md text-sm">
                    <p><strong>Vos gains (75%):</strong> €{(price * 0.75).toFixed(2)} - €{(price * 1.5 * 0.75).toFixed(2)}</p>
                    <p><strong>Commission plateforme (25%):</strong> €{(price * 0.25).toFixed(2)} - €{(price * 1.5 * 0.25).toFixed(2)}</p>
                  </div>
                </div>
                
                <Button onClick={handleSaveSettings} disabled={loading}>
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
                  Share this link to receive guaranteed response requests
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
                
                {!stripeOnboarded && (
                  <div className="bg-yellow-50 p-3 rounded-md">
                    <p className="text-yellow-800">
                      <strong>⚠️ Setup Required:</strong> Complete Stripe setup to receive payments
                    </p>
                  </div>
                )}

                {pendingFunds > 0 && (
                  <div className="bg-green-50 p-3 rounded-md">
                    <p className="text-green-800">
                      <strong>💰 {pendingFunds.toFixed(2)}€ en attente</strong> de configuration Stripe
                    </p>
                    <Button 
                      onClick={handleStripeOnboarding} 
                      size="sm" 
                      className="mt-2"
                    >
                      Configurer Stripe pour recevoir vos fonds
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stripe">
            <Card>
              <CardHeader>
                <CardTitle>Stripe Payment Setup</CardTitle>
                <CardDescription>Configure your Stripe account to receive payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!stripeOnboarded ? (
                  <div className="space-y-3">
                    <div className="bg-yellow-50 p-3 rounded-md">
                      <p className="text-yellow-800">
                        ⚠️ Complete Stripe setup to receive 75% of payments immediately
                      </p>
                    </div>
                    <p className="text-sm">
                      Without Stripe setup, your earnings will be held until you complete the configuration.
                    </p>
                    <Button onClick={handleStripeOnboarding} disabled={loading} className="w-full">
                      {loading ? 'Setting up...' : 'Complete Stripe Setup'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-green-50 p-3 rounded-md">
                      <p className="text-green-800">✅ Stripe account configured successfully!</p>
                      <p className="text-sm text-green-600 mt-1">You can now receive payments immediately.</p>
                    </div>
                    <Button variant="outline" onClick={handleStripeOnboarding}>
                      Update Stripe Settings
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;