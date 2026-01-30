import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { useEffect, useState } from 'react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageBase64: string) => Promise<void>;
  isProcessing: boolean;
}

export const CameraModal = ({ isOpen, onClose, onCapture, isProcessing }: CameraModalProps) => {
  const [localProcessing, setLocalProcessing] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const {
    isCapturing,
    capturedImage,
    error,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    clearCapture,
  } = useCameraCapture();

  const showProcessing = localProcessing || isProcessing;

  useEffect(() => {
    let hintTimer: ReturnType<typeof setTimeout>;

    if (isOpen && !capturedImage) {
      // Start camera asynchronously
      void startCamera();
      setShowHint(true);
      hintTimer = setTimeout(() => setShowHint(false), 3000);
    }

    return () => {
      clearTimeout(hintTimer);
      stopCamera();
    };
  }, [isOpen, capturedImage, startCamera, stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      setLocalProcessing(false);
      setShowHint(true);
    }
  }, [isOpen]);

  // Tap anywhere to capture and analyze
  const handleTapToScan = async () => {
    if (showProcessing || capturedImage || !isCapturing) return;
    
    const image = capturePhoto();
    if (image) {
      setLocalProcessing(true);
      try {
        await onCapture(image);
      } catch (error) {
        console.error('Analysis error:', error);
      } finally {
        setLocalProcessing(false);
      }
    }
  };

  const handleClose = () => {
    stopCamera();
    clearCapture();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col"
      >
        {/* Fullscreen Camera View - Tap to scan */}
        <div 
          className="flex-1 relative cursor-pointer"
          onClick={handleTapToScan}
        >
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-white mb-4">{error}</p>
              <button 
                onClick={(e) => { e.stopPropagation(); startCamera(); }}
                className="px-4 py-2 bg-white/20 rounded-lg text-white"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Fullscreen video */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Tap hint - always visible */}
              {!showProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none"
                >
                  <div className="bg-black/50 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/10">
                    <p className="text-white/90 text-sm font-medium">
                      👆 Tap anywhere to scan
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Processing overlay */}
              {showProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center"
                >
                  <Loader2 className="w-12 h-12 text-eco animate-spin mb-4" />
                  <p className="text-white font-medium">Analyzing...</p>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Close button - left side, minimal */}
        <button
          onClick={handleClose}
          className="absolute top-6 left-4 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-md px-3 py-2 rounded-full text-white transition-colors"
        >
          <X className="w-4 h-4" />
          <span className="text-sm font-medium">Close</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
