import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Loader2, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WasteCategory } from '@/types/waste';
import logoImage from '@/assets/logo-with-text.png';


const GUEST_STATS_KEY = 'ecoscan_guest_stats';
const GUEST_HISTORY_KEY = 'ecoscan_guest_history';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, enterAsGuest, deviceId, isGuest } = useAuth();
  const navigate = useNavigate();

  const migrateGuestData = async (userId: string) => {
    try {
      const savedStats = localStorage.getItem(`${GUEST_STATS_KEY}_${deviceId}`);
      const savedHistory = localStorage.getItem(`${GUEST_HISTORY_KEY}_${deviceId}`);

      if (savedStats) {
        const stats = JSON.parse(savedStats);
        await supabase
          .from('profiles')
          .update({
            total_points: stats.totalPoints || 0,
            level: stats.level || 1,
            streak: stats.streak || 0,
            items_recycled: stats.itemsRecycled || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }

      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        const historyToInsert = history.map((item: any) => ({
          user_id: userId,
          item_name: item.name,
          category: item.category as WasteCategory,
          points: item.points,
          scanned_at: item.scannedAt,
        }));

        if (historyToInsert.length > 0) {
          await supabase.from('scan_history').insert(historyToInsert);
        }
      }

      // Clear guest data after migration
      localStorage.removeItem(`${GUEST_STATS_KEY}_${deviceId}`);
      localStorage.removeItem(`${GUEST_HISTORY_KEY}_${deviceId}`);

      return true;
    } catch (error) {
      console.error('Error migrating guest data:', error);
      return false;
    }
  };

  const checkAdminAndRedirect = async (userId: string) => {
    try {
      const { data: isAdmin } = await supabase
        .rpc('has_role', { _user_id: userId, _role: 'admin' });
      
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;

        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        // Migrate guest data if user was in guest mode
        if (isGuest && authUser) {
          const migrated = await migrateGuestData(authUser.id);
          if (migrated) {
            toast.success('Logged in! Guest data synced to your account.');
          } else {
            toast.success('Logged in successfully!');
          }
        } else {
          toast.success('Logged in successfully!');
        }
        
        // Check if admin and redirect accordingly
        if (authUser) {
          await checkAdminAndRedirect(authUser.id);
        } else {
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, username);
        if (error) throw error;

        // For new signups, we need to wait for the session
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isGuest) {
          const migrated = await migrateGuestData(user.id);
          if (migrated) {
            toast.success('Account created! Guest data synced.');
          } else {
            toast.success('Account created successfully!');
          }
        } else {
          toast.success('Account created successfully!');
        }
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestEntry = () => {
    enterAsGuest();
    toast.success('Welcome! Using guest mode.');
    navigate('/');
  };

  return (
    <div className="min-h-screen gradient-nature flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* App Logo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-8 flex flex-col items-center"
        >
          <img src={logoImage} alt="EcoSort Logo" className="w-20 h-20 object-contain" />
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card/80 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-border/50"
        >
          <h2 className="text-xl font-bold text-center mb-6">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-eco text-white font-semibold"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Sign Up'
              )}
            </Button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
          </div>

          {/* Guest Entry Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGuestEntry}
            className="w-full mt-4 border-eco/30 hover:bg-eco/10"
          >
            <UserCircle className="w-5 h-5 mr-2" />
            Continue as Guest
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-2">
            Guest data is stored locally on this device
          </p>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-eco hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
