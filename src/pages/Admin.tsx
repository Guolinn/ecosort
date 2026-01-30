import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldAlert, ClipboardList, Users, Bell, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { WasteCategory, ScanStatus, DisposalChoice } from '@/types/waste';
import { useToast } from '@/hooks/use-toast';
import { PendingScansTab } from '@/components/admin/PendingScansTab';
import { PendingListingsTab } from '@/components/admin/PendingListingsTab';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { NotificationsTab } from '@/components/admin/NotificationsTab';

interface PendingScan {
  id: string;
  user_id: string;
  item_name: string;
  category: WasteCategory;
  points: number;
  base_points: number;
  final_points: number;
  status: ScanStatus;
  disposal_choice?: DisposalChoice;
  scanned_at: string;
  image_url?: string;
  ai_suggestion?: string;
  username?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
  const [pendingListingsCount, setPendingListingsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Redirect non-admins
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [isAdmin, roleLoading, navigate, toast]);

  // Load pending scans and listings count
  useEffect(() => {
    if (!isAdmin) return;

    loadPendingScans();
    loadPendingListingsCount();

    // Real-time subscription for pending scans
    const scansChannel = supabase
      .channel('admin-pending-scans')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scan_history',
          filter: 'status=eq.pending',
        },
        () => loadPendingScans()
      )
      .subscribe();

    // Real-time subscription for pending listings
    const listingsChannel = supabase
      .channel('admin-pending-listings-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_listings',
        },
        () => loadPendingListingsCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(scansChannel);
      supabase.removeChannel(listingsChannel);
    };
  }, [isAdmin]);

  const loadPendingListingsCount = async () => {
    const { count } = await supabase
      .from('marketplace_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_review');
    setPendingListingsCount(count || 0);
  };

  const loadPendingScans = async () => {
    try {
      const { data: scans, error: scansError } = await supabase
        .from('scan_history')
        .select('*')
        .eq('status', 'pending')
        .order('scanned_at', { ascending: false });

      if (scansError) throw scansError;

      const userIds = [...new Set((scans || []).map(s => s.user_id))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p.username]));

        const mapped = (scans || []).map((item: any) => ({
          ...item,
          username: profileMap.get(item.user_id) || 'Guest',
        }));

        setPendingScans(mapped);
      } else {
        setPendingScans([]);
      }
    } catch (error) {
      console.error('Error loading pending scans:', error);
      toast({ title: "Load Failed", description: "Unable to load pending reviews", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <ShieldAlert className="w-12 h-12 mx-auto text-destructive mb-3" />
          <h1 className="text-lg font-bold text-foreground mb-1">Access Denied</h1>
          <p className="text-sm text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Compact Header */}
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Real-time updates enabled</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full max-w-3xl grid-cols-4 h-9">
            <TabsTrigger value="pending" className="text-sm gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              Scans ({pendingScans.length})
            </TabsTrigger>
            <TabsTrigger value="listings" className="text-sm gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              Listings ({pendingListingsCount})
            </TabsTrigger>
            <TabsTrigger value="users" className="text-sm gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Users
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-sm gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              Notify
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <PendingScansTab 
              pendingScans={pendingScans} 
              onUpdate={loadPendingScans} 
            />
          </TabsContent>

          <TabsContent value="listings" className="mt-4">
            <PendingListingsTab />
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <UserManagementTab />
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <NotificationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
