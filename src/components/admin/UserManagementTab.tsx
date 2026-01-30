import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldOff, User, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface UserWithRole {
  id: string;
  username: string;
  total_points: number;
  level: number;
  items_recycled: number;
  isAdmin: boolean;
  created_at: string;
}

export const UserManagementTab = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set((adminRoles || []).map(r => r.user_id));

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        id: profile.id,
        username: profile.username || 'Unknown',
        total_points: profile.total_points || 0,
        level: profile.level || 1,
        items_recycled: profile.items_recycled || 0,
        isAdmin: adminUserIds.has(profile.id),
        created_at: profile.created_at,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({ title: "Load Failed", description: "Unable to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentlyAdmin: boolean) => {
    if (userId === currentUser?.id) {
      toast({ title: "Cannot modify", description: "You cannot change your own admin status", variant: "destructive" });
      return;
    }

    setUpdatingUserId(userId);
    try {
      if (currentlyAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
        toast({ title: "Role Removed", description: "Admin role has been revoked" });
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;
        toast({ title: "Role Assigned", description: "Admin role has been granted" });
      }

      // Refresh users list
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isAdmin: !currentlyAdmin } : u
      ));
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ title: "Update Failed", description: "Unable to update user role", variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Users Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-2 px-3 font-medium">User</th>
              <th className="text-center py-2 px-3 font-medium hidden sm:table-cell">Level</th>
              <th className="text-center py-2 px-3 font-medium hidden md:table-cell">Points</th>
              <th className="text-center py-2 px-3 font-medium hidden lg:table-cell">Items</th>
              <th className="text-center py-2 px-3 font-medium">Role</th>
              <th className="text-right py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredUsers.map((user, index) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{user.username}</p>
                      <p className="text-[11px] text-muted-foreground truncate">ID: {user.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="text-center py-2 px-3 hidden sm:table-cell">
                  <span className="font-medium">{user.level}</span>
                </td>
                <td className="text-center py-2 px-3 hidden md:table-cell">
                  <span className="text-primary font-medium">{user.total_points}</span>
                </td>
                <td className="text-center py-2 px-3 hidden lg:table-cell">
                  {user.items_recycled}
                </td>
                <td className="text-center py-2 px-3">
                  {user.isAdmin ? (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-primary">
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      User
                    </Badge>
                  )}
                </td>
                <td className="text-right py-2 px-3">
                  <Button
                    variant={user.isAdmin ? "outline" : "default"}
                    size="sm"
                    className="h-7 text-xs px-2"
                    disabled={user.id === currentUser?.id || updatingUserId === user.id}
                    onClick={() => toggleAdminRole(user.id, user.isAdmin)}
                  >
                    {updatingUserId === user.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : user.isAdmin ? (
                      <>
                        <ShieldOff className="w-3 h-3 mr-1" />
                        Revoke
                      </>
                    ) : (
                      <>
                        <Shield className="w-3 h-3 mr-1" />
                        Grant
                      </>
                    )}
                  </Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No users found
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {users.length} total users • {users.filter(u => u.isAdmin).length} admins
      </p>
    </div>
  );
};
