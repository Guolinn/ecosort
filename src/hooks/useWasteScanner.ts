import { useState, useCallback, useEffect } from 'react';
import { WasteItem, WasteCategory, UserStats, DisposalChoice, categoryInfo, ScanStatus } from '@/types/waste';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { classifyWasteImageBinary as classifyWasteImage } from '@/services/wasteClassifierBinary';
import { uploadScanImage } from '@/services/imageStorage';

// Local storage keys for guest mode
const GUEST_STATS_KEY = 'ecoscan_guest_stats';
const GUEST_HISTORY_KEY = 'ecoscan_guest_history';

const calculateLevel = (points: number): number => {
  return Math.floor(points / 100) + 1;
};

const defaultStats: UserStats = {
  totalPoints: 0,
  level: 1,
  scansToday: 0,
  streak: 0,
  itemsRecycled: 0,
  pendingPoints: 0,
};

export const useWasteScanner = () => {
  const { user, isGuest, deviceId } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState<WasteItem | null>(null);
  const [scanHistory, setScanHistory] = useState<WasteItem[]>([]);
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [showReward, setShowReward] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load data based on auth mode
  useEffect(() => {
    if (isGuest) {
      loadGuestData();
    } else if (user) {
      loadAuthenticatedData();
    } else {
      setLoading(false);
    }
  }, [user, isGuest, deviceId]);

  const loadGuestData = () => {
    try {
      const savedStats = localStorage.getItem(`${GUEST_STATS_KEY}_${deviceId}`);
      const savedHistory = localStorage.getItem(`${GUEST_HISTORY_KEY}_${deviceId}`);

      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        const today = new Date().toDateString();
        if (parsed.lastScanDate !== today) {
          parsed.scansToday = 0;
        }
        setStats({ ...defaultStats, ...parsed });
      }

      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setScanHistory(
          parsed.map((item: any) => ({
            ...item,
            scannedAt: new Date(item.scannedAt),
            status: item.status || 'pending',
            basePoints: item.basePoints || item.points,
            finalPoints: item.finalPoints || item.points,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading guest data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveGuestData = (newStats: UserStats, newHistory: WasteItem[]) => {
    try {
      localStorage.setItem(
        `${GUEST_STATS_KEY}_${deviceId}`,
        JSON.stringify({ ...newStats, lastScanDate: new Date().toDateString() })
      );
      localStorage.setItem(`${GUEST_HISTORY_KEY}_${deviceId}`, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving guest data:', error);
    }
  };

  const loadAuthenticatedData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setStats({
          totalPoints: profile.total_points || 0,
          level: profile.level || 1,
          scansToday: 0,
          streak: profile.streak || 0,
          itemsRecycled: profile.items_recycled || 0,
          pendingPoints: 0,
        });
      }

      const { data: history } = await supabase
        .from('scan_history')
        .select('*')
        .eq('user_id', user.id)
        .order('scanned_at', { ascending: false })
        .limit(20);

      if (history) {
        const mappedHistory = history.map((item) => ({
          id: item.id,
          name: item.item_name,
          category: item.category as WasteCategory,
          points: item.points,
          scannedAt: new Date(item.scanned_at),
          status: (item.status as ScanStatus) || 'pending',
          basePoints: item.base_points || item.points,
          finalPoints: item.final_points || item.points,
          disposalChoice: item.disposal_choice as DisposalChoice | undefined,
          aiSuggestion: item.ai_suggestion,
          imageUrl: item.image_url,
        }));
        setScanHistory(mappedHistory);

        // Calculate scans today and pending points
        const today = new Date().toDateString();
        const scansToday = history.filter(
          (item) => new Date(item.scanned_at).toDateString() === today
        ).length;
        const pendingPoints = mappedHistory
          .filter(item => item.status === 'pending')
          .reduce((sum, item) => sum + item.finalPoints, 0);
        
        setStats((prev) => ({ ...prev, scansToday, pendingPoints }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check for level up and trigger animation
  const checkLevelUp = (oldLevel: number, newLevel: number) => {
    if (newLevel > oldLevel) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }
  };

  const scanWithImage = useCallback(async (imageBase64: string) => {
    setIsScanning(true);
    setShowReward(false);
    
    try {
      const result = await classifyWasteImage(imageBase64);
      
      const category = categoryInfo[result.category];
      const needsChoice = category.needsChoice;
      
      // Upload image to Supabase Storage (for authenticated users)
      let storedImageUrl: string | undefined;
      if (user) {
        const uploadedUrl = await uploadScanImage(imageBase64, user.id);
        if (uploadedUrl) {
          storedImageUrl = uploadedUrl;
        }
      }
      
      // Determine initial status
      // Hazardous must have user choice (special disposal), other goes directly to approved
      const initialStatus: ScanStatus = 
        result.category === 'other' ? 'approved' : // Other goes directly to approved
        'pending'; // All recyclables need user choice first
      
      const newItem: WasteItem = {
        id: Date.now().toString(),
        name: result.name,
        category: result.category,
        points: result.points,
        scannedAt: new Date(),
        imageUrl: storedImageUrl || undefined,
        status: initialStatus,
        basePoints: result.points,
        finalPoints: result.points,
        aiSuggestion: result.aiSuggestion,
        disposalChoice: needsChoice ? undefined : 'discard',
        hasCreativePotential: result.hasCreativePotential,
        creativeSuggestion: result.creativeSuggestion,
        isHuman: result.isHuman,
        humanGender: result.humanGender,
        isRetry: result.isRetry,
      };

      // If retry (unidentified), just show the result without saving
      if (result.isRetry) {
        setLastScannedItem(newItem);
        return result;
      }

      // For non-choice categories, process immediately
      if (!needsChoice) {
        if (result.category === 'other') {
          // Other waste goes directly to approved with base points
          const newPoints = stats.totalPoints + result.points;
          const newLevel = calculateLevel(newPoints);
          const oldLevel = stats.level;

          const newStats: UserStats = {
            ...stats,
            totalPoints: newPoints,
            level: newLevel,
            scansToday: stats.scansToday + 1,
            itemsRecycled: stats.itemsRecycled + 1,
          };
          const newHistory = [newItem, ...scanHistory];

          if (isGuest) {
            saveGuestData(newStats, newHistory);
          } else if (user) {
            await supabase.from('scan_history').insert({
              user_id: user.id,
              item_name: result.name,
              category: result.category,
              points: result.points,
              base_points: result.points,
              final_points: result.points,
              status: 'approved',
              ai_suggestion: result.aiSuggestion,
              image_url: storedImageUrl,
            });

            await supabase
              .from('profiles')
              .update({
                total_points: newPoints,
                level: newLevel,
                items_recycled: stats.itemsRecycled + 1,
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id);
          }

          setScanHistory(newHistory);
          setStats(newStats);
          checkLevelUp(oldLevel, newLevel);
        } else {
          // Creative material - pending status
          const newStats: UserStats = {
            ...stats,
            scansToday: stats.scansToday + 1,
            pendingPoints: stats.pendingPoints + result.points,
          };
          const newHistory = [newItem, ...scanHistory];

          if (isGuest) {
            saveGuestData(newStats, newHistory);
          } else if (user) {
            await supabase.from('scan_history').insert({
              user_id: user.id,
              item_name: result.name,
              category: result.category,
              points: result.points,
              base_points: result.points,
              final_points: result.points,
              status: 'pending',
              image_url: storedImageUrl,
            });
          }

          setScanHistory(newHistory);
          setStats(newStats);
        }
      }

      setLastScannedItem(newItem);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 2500);
      
      return result;
    } finally {
      setIsScanning(false);
    }
  }, [user, isGuest, stats, scanHistory, deviceId]);

  const handleDisposalChoice = useCallback(async (choice: DisposalChoice) => {
    if (!lastScannedItem) return;

    const category = categoryInfo[lastScannedItem.category];
    const choiceConfig = category.choices?.find(c => c.value === choice);
    const multiplier = choiceConfig?.pointsMultiplier || 1;
    const finalPoints = Math.round(lastScannedItem.basePoints * multiplier);

    // DISCARD = auto-approved, add points immediately
    // DONATE/RECYCLE/TRADE = pending (donate/recycle need admin approval, trade creates draft listing)
    const isDiscard = choice === 'discard';
    const isTrade = choice === 'trade';
    const status: ScanStatus = isDiscard ? 'approved' : 'pending';

    const updatedItem: WasteItem = {
      ...lastScannedItem,
      disposalChoice: choice,
      finalPoints,
      status,
    };

    let newStats: UserStats;
    const oldLevel = stats.level;
    
    if (isDiscard) {
      // Discard: auto-approve and add points immediately
      const newPoints = stats.totalPoints + finalPoints;
      const newLevel = calculateLevel(newPoints);
      newStats = {
        ...stats,
        totalPoints: newPoints,
        level: newLevel,
        scansToday: stats.scansToday + 1,
        itemsRecycled: stats.itemsRecycled + 1,
      };
      checkLevelUp(oldLevel, newLevel);
    } else {
      // Donate/Recycle/Trade: pending
      newStats = {
        ...stats,
        scansToday: stats.scansToday + 1,
        pendingPoints: stats.pendingPoints + finalPoints,
      };
    }

    const newHistory = [updatedItem, ...scanHistory];

    if (isGuest) {
      saveGuestData(newStats, newHistory);
    } else if (user) {
      // Insert scan history record
      const { data: scanRecord } = await supabase.from('scan_history').insert({
        user_id: user.id,
        item_name: updatedItem.name,
        category: updatedItem.category,
        points: updatedItem.points,
        base_points: updatedItem.basePoints,
        final_points: finalPoints,
        status: status,
        disposal_choice: choice,
        image_url: updatedItem.imageUrl,
        ai_suggestion: updatedItem.aiSuggestion,
      }).select('id').single();

      if (isDiscard) {
        // Update profile points immediately for discard
        await supabase
          .from('profiles')
          .update({
            total_points: newStats.totalPoints,
            level: newStats.level,
            items_recycled: newStats.itemsRecycled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }

      // TRADE: Create draft listing immediately for user to edit
      if (isTrade && scanRecord) {
        await supabase.from('marketplace_listings').insert({
          seller_id: user.id,
          scan_id: scanRecord.id,
          title: updatedItem.name,
          description: updatedItem.aiSuggestion || `A ${updatedItem.category} item in good condition.`,
          image_url: updatedItem.imageUrl,
          category: updatedItem.category,
          price_points: finalPoints * 2,
          status: 'draft', // User needs to edit before submitting for review
        });
      }
    }

    setLastScannedItem(updatedItem);
    setScanHistory(newHistory);
    setStats(newStats);

    // Return true if trade was selected (for UI to show draft editor prompt)
    return isTrade;
  }, [lastScannedItem, user, isGuest, stats, scanHistory, deviceId]);

  const clearLastScan = useCallback(() => {
    setLastScannedItem(null);
  }, []);

  return {
    isScanning,
    lastScannedItem,
    scanHistory,
    stats,
    showReward,
    showLevelUp,
    loading,
    scanWithImage,
    clearLastScan,
    handleDisposalChoice,
  };
};
