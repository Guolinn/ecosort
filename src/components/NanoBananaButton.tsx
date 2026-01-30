import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NanoBananaButtonProps {
  scanId: string;
  itemName: string;
  existingCraftImage?: string;
  onImageGenerated?: (imageUrl: string) => void;
  compact?: boolean;
}

export const NanoBananaButton = ({ 
  scanId, 
  itemName, 
  existingCraftImage,
  onImageGenerated,
  compact = false
}: NanoBananaButtonProps) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [craftImage, setCraftImage] = useState<string | undefined>(existingCraftImage);
  const { toast } = useToast();

  const generateCraftImage = async () => {
    setGenerating(true);
    setError(null);

    try {
      console.log('[NanoBanana] Starting generation for:', itemName);
      
      const { data, error: fnError } = await supabase.functions.invoke('generate-craft-image', {
        body: { scanId, itemName }
      });

      console.log('[NanoBanana] Response:', { data, fnError });

      if (fnError) {
        // Check if it's a network/deployment error
        const errMsg = fnError.message || String(fnError);
        if (errMsg.includes('Failed to fetch') || errMsg.includes('FunctionsHttpError')) {
          setError('Edge function not deployed. Please deploy generate-craft-image to Supabase.');
          toast({
            title: "Function Not Available",
            description: "The craft image generator needs to be deployed to Supabase first.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(errMsg);
      }

      if (data?.error) {
        // Handle specific errors
        if (data.retryAfter) {
          setError(`API quota exceeded. Try again in ${data.retryAfter}s`);
        } else {
          setError(data.error + (data.details ? `: ${data.details}` : ''));
        }
        return;
      }

      if (data?.craftImageUrl) {
        setCraftImage(data.craftImageUrl);
        onImageGenerated?.(data.craftImageUrl);
        toast({
          title: "🎨 Craft Idea Ready!",
          description: "NanoBanana created a craft idea for you!",
        });
      } else {
        setError('No image returned from API');
      }
    } catch (err) {
      console.error('[NanoBanana] Generation error:', err);
      const errMsg = err instanceof Error ? err.message : 'Generation failed';
      setError(errMsg);
      toast({
        title: "Generation Failed",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // If already has image, show it with regenerate option
  if (craftImage) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg overflow-hidden border border-yellow-200">
          <img 
            src={craftImage} 
            alt="Craft idea by NanoBanana"
            className="w-full h-32 object-cover"
          />
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={generateCraftImage}
          disabled={generating}
          className="w-full text-xs gap-1 text-yellow-700 hover:text-yellow-800"
        >
          {generating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              Generate New Idea
            </>
          )}
        </Button>
      </div>
    );
  }

  // Show generate button
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={generateCraftImage}
        disabled={generating}
        className={`w-full gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white ${
          compact ? 'h-10' : 'h-12'
        }`}
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating Craft Idea...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>🍌 Generate with NanoBanana</span>
          </>
        )}
      </Button>
      
      {!compact && (
        <p className="text-[10px] text-center text-muted-foreground">
          AI will create a unique craft idea for this material
        </p>
      )}
    </div>
  );
};
