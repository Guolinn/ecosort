import { LogOut, UserCircle, Moon, Sun, Shield, FileText, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LegalDrawer } from '@/components/LegalDrawer';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDrawer = ({ isOpen, onClose }: SettingsDrawerProps) => {
  const { signOut, user, isGuest, exitGuestMode } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [legalDrawer, setLegalDrawer] = useState<'tos' | 'privacy' | 'contact' | null>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    if (newValue) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSignOut = async () => {
    onClose();
    if (isGuest) {
      exitGuestMode();
    } else {
      await signOut();
    }
    navigate('/auth');
  };

  const handleAdminClick = () => {
    onClose();
    navigate('/admin');
  };

  const displayName = isGuest 
    ? 'Guest' 
    : user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';

  const userEmail = isGuest ? 'Guest Mode' : user?.email || '';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left">Settings</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            </div>

            {/* Settings Options */}
            <div className="space-y-1">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  <span className="text-sm font-medium">Dark Mode</span>
                </div>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>

              {/* Admin Panel - only for admins */}
              {isAdmin && (
                <button
                  onClick={handleAdminClick}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <Shield className="w-5 h-5" />
                  <span className="text-sm font-medium">Admin Panel</span>
                </button>
              )}

              {/* Terms of Service */}
              <button
                onClick={() => setLegalDrawer('tos')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm font-medium">Terms of Service</span>
              </button>

              {/* Privacy Policy */}
              <button
                onClick={() => setLegalDrawer('privacy')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
              >
                <Lock className="w-5 h-5" />
                <span className="text-sm font-medium">Privacy Policy</span>
              </button>

              {/* Contact */}
              <button
                onClick={() => setLegalDrawer('contact')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
              >
                <Mail className="w-5 h-5" />
                <span className="text-sm font-medium">Contact Us</span>
              </button>
            </div>

            {/* Sign Out Button */}
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Legal Drawers */}
      {legalDrawer && (
        <LegalDrawer
          isOpen={!!legalDrawer}
          onClose={() => setLegalDrawer(null)}
          type={legalDrawer}
        />
      )}
    </>
  );
};
