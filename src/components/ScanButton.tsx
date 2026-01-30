import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScanButtonProps {
  onScan: () => void;
  isScanning: boolean;
}

export const ScanButton = ({ onScan, isScanning }: ScanButtonProps) => {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 gradient-eco rounded-full blur-xl opacity-30 scale-110" />
        
        <Button
          onClick={onScan}
          disabled={isScanning}
          variant="scan"
          size="icon-lg"
          className="relative w-24 h-24 rounded-full transition-transform active:scale-95"
        >
          {isScanning ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : (
            <Camera className="w-10 h-10" />
          )}
        </Button>
      </div>
      
      <p className="mt-4 text-sm font-semibold text-muted-foreground">
        {isScanning ? 'Analyzing...' : 'Tap to scan'}
      </p>
    </div>
  );
};
