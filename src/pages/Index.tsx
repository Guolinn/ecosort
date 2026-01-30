import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { PointsBadge } from '@/components/PointsBadge';
import { StatsCard } from '@/components/StatsCard';
import { ScanButton } from '@/components/ScanButton';
import { ScanResult } from '@/components/ScanResult';
import { ScanHistory } from '@/components/ScanHistory';
import { ScanDetailDrawer } from '@/components/ScanDetailDrawer';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { CameraModal } from '@/components/CameraModal';
import { LevelUpAnimation } from '@/components/LevelUpAnimation';
import { useWasteScanner } from '@/hooks/useWasteScanner';
import { useToast } from '@/hooks/use-toast';
import { WasteItem, DisposalChoice } from '@/types/waste';

const Index = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<WasteItem | null>(null);
  const { toast } = useToast();
  const {
    isScanning,
    lastScannedItem,
    scanHistory,
    stats,
    showReward,
    showLevelUp,
    scanWithImage,
    clearLastScan,
    handleDisposalChoice,
  } = useWasteScanner();

  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  const handleCapture = async (imageBase64: string) => {
    try {
      const result = await scanWithImage(imageBase64);
      // Always close camera - result drawer will show (including retry prompts)
      setShowCamera(false);
    } catch (error) {
      console.error('Scan error:', error);
      setShowCamera(false);
      toast({
        title: "Network Error",
        description: error instanceof Error ? error.message : "Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisposalSelect = (choice: DisposalChoice) => {
    handleDisposalChoice(choice);
  };

  const handleHistoryItemClick = (item: WasteItem) => {
    setSelectedHistoryItem(item);
  };

  const handleHistoryItemFromDrawer = (item: WasteItem) => {
    setShowHistoryDrawer(false);
    setTimeout(() => setSelectedHistoryItem(item), 200);
  };

  return (
    <div className="min-h-screen gradient-nature">
      <div className="max-w-md mx-auto px-4 pb-8">
        <Header />
        
        <div className="space-y-3">
          {/* Points and Level */}
          <PointsBadge 
            points={stats.totalPoints} 
            level={stats.level} 
            pendingPoints={stats.pendingPoints}
          />
          
          {/* Quick Stats */}
          <StatsCard stats={stats} />
          
          {/* Scan Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="py-8 flex flex-col items-center"
          >
            <ScanButton onScan={handleOpenCamera} isScanning={isScanning} />
          </motion.div>
          
          {/* Recent Scans */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Recent Scans</h2>
              {scanHistory.length > 5 && (
                <button
                  onClick={() => setShowHistoryDrawer(true)}
                  className="flex items-center gap-1 text-sm text-primary font-medium hover:underline"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
            <ScanHistory 
              items={scanHistory} 
              onItemClick={handleHistoryItemClick}
            />
            {scanHistory.length > 0 && scanHistory.length <= 5 && (
              <button
                onClick={() => setShowHistoryDrawer(true)}
                className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View All History
              </button>
            )}
          </motion.div>
        </div>
      </div>
      
      {/* Scan Result Modal */}
      {lastScannedItem && (
        <ScanResult
          item={lastScannedItem}
          showReward={showReward}
          onClose={clearLastScan}
          onDisposalChoice={handleDisposalSelect}
        />
      )}

      {/* History Item Detail Drawer */}
      <ScanDetailDrawer
        item={selectedHistoryItem}
        isOpen={!!selectedHistoryItem}
        onClose={() => setSelectedHistoryItem(null)}
      />

      {/* Full History Drawer */}
      <HistoryDrawer
        items={scanHistory}
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        onItemClick={handleHistoryItemFromDrawer}
      />

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCapture}
        isProcessing={isScanning}
      />

      {/* Level Up Animation */}
      <LevelUpAnimation show={showLevelUp} level={stats.level} />
    </div>
  );
};

export default Index;
