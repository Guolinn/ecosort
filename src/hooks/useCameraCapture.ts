import { useState, useRef, useCallback } from 'react';

export const useCameraCapture = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const downscaleToJpegDataUrl = (canvas: HTMLCanvasElement, maxLongEdge = 1024, quality = 0.7) => {
    const { width, height } = canvas;
    const longEdge = Math.max(width, height);
    const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1;

    if (scale === 1) {
      return canvas.toDataURL('image/jpeg', quality);
    }

    const target = document.createElement('canvas');
    target.width = Math.round(width * scale);
    target.height = Math.round(height * scale);

    const tctx = target.getContext('2d');
    if (!tctx) return canvas.toDataURL('image/jpeg', quality);

    tctx.drawImage(canvas, 0, 0, target.width, target.height);
    return target.toDataURL('image/jpeg', quality);
  };

  const startCamera = useCallback(async () => {
    setError(null);

    // Stop any existing stream first to avoid device conflicts
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          // Hard cap to keep base64 payload small enough for Edge Functions + mobile browsers
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video metadata to ensure stream is ready before playing
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          const onLoaded = () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            resolve();
          };
          video.addEventListener('loadedmetadata', onLoaded);

          // Fallback timeout in case loadedmetadata never fires
          setTimeout(() => {
            video.removeEventListener('loadedmetadata', onLoaded);
            resolve();
          }, 2000);
        });

        // play() can fail silently on iOS if not user-triggered; catch it gracefully
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play() failed, may need user gesture:', playErr);
        }
      }

      setIsCapturing(true);
      return true;
    } catch (err: any) {
      console.error('Camera access error:', err);
      const msg =
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Unable to access camera. Please grant camera permissions.';
      setError(msg);
      setIsCapturing(false);
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0);

    // IMPORTANT: Large base64 payloads can cause "failed to send a request to the edge function"
    // (browser aborts / request size limit). Downscale before sending.
    const imageData = downscaleToJpegDataUrl(canvas, 1024, 0.7);

    // Lightweight diagnostics (helps confirm size issues without changing backend)
    const approxKb = Math.round((imageData.length * 3) / 4 / 1024);
    console.log(`[camera] captured jpeg ~${approxKb}KB (${canvas.width}x${canvas.height})`);
    
    setCapturedImage(imageData);
    stopCamera();
    
    return imageData;
  }, [stopCamera]);

  const clearCapture = useCallback(() => {
    setCapturedImage(null);
    setError(null);
  }, []);

  return {
    isCapturing,
    capturedImage,
    error,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    clearCapture,
  };
};
