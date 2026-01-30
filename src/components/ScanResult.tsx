import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, Gift, Trash2, Recycle, Sparkles, ShoppingBag, AlertTriangle } from 'lucide-react';
import { WasteItem, categoryInfo, DisposalChoice, WasteCategory } from '@/types/waste';
import { Button } from '@/components/ui/button';
import { NanoBananaButton } from '@/components/NanoBananaButton';

// Fallback for old categories
const fallbackCategory = {
  label: 'Other',
  labelCn: '其他',
  color: 'hsl(30 30% 50%)',
  binColor: '#757575',
  icon: '🗑️',
  tip: 'Dispose properly',
  tipCn: '正确处理',
  needsChoice: false,
  choices: undefined,
};

const getCategoryInfo = (category: string) => {
  return categoryInfo[category as WasteCategory] || fallbackCategory;
};

interface ScanResultProps {
  item: WasteItem | null;
  showReward: boolean;
  onClose: () => void;
  onDisposalChoice?: (choice: DisposalChoice) => void;
}

export const ScanResult = ({ item, showReward, onClose, onDisposalChoice }: ScanResultProps) => {
  if (!item) return null;

  const category = getCategoryInfo(item.category);
  const needsChoice = category.needsChoice && !item.disposalChoice;
  const isRetry = item.isRetry === true;
  const isHazardous = item.category === 'hazardous';

  const handleChoice = (choice: DisposalChoice) => {
    if (onDisposalChoice) {
      onDisposalChoice(choice);
    }
  };

  const getChoiceIcon = (value: DisposalChoice) => {
    switch (value) {
      case 'donate':
        return <Gift className="w-5 h-5" />;
      case 'trade':
        return <ShoppingBag className="w-5 h-5" />;
      case 'recycle':
        return <Recycle className="w-5 h-5" />;
      case 'special':
        return <AlertTriangle className="w-5 h-5" />;
      case 'discard':
        return <Trash2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getChoiceStyle = (value: DisposalChoice) => {
    switch (value) {
      case 'donate':
        return 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white';
      case 'trade':
        return 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white';
      case 'recycle':
        return 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white';
      case 'special':
        return 'bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white';
      default:
        return '';
    }
  };

  // Separate primary and discard choices
  const primaryChoices = category.choices?.filter(c => c.isPrimary) || [];
  const discardChoice = category.choices?.find(c => c.value === 'discard');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-card p-6 pb-10"
      >
        {/* Bin color indicator bar - hide for humans and retry */}
        {!item.isHuman && !isRetry && (
          <div 
            className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl"
            style={{ backgroundColor: category.binColor }}
          />
        )}
        
        <div className="flex justify-between items-start mb-4 mt-1">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${category.color}20` }}
            >
              {item.isHuman ? '😊' : category.icon}
            </div>
            {/* Bin color hint */}
            {!item.isHuman && !isRetry && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Bin</span>
                <div 
                  className="w-6 h-6 rounded-md border-2"
                  style={{ backgroundColor: category.binColor, borderColor: category.binColor }}
                />
              </div>
            )}
          </motion.div>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Retry prompt for unidentified items */}
          {isRetry ? (
            <div className="text-center py-4">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Unable to Identify 🤔
              </h2>
              <p className="text-muted-foreground">
                {item.aiSuggestion || "Please try again with a clearer photo."}
              </p>
            </div>
          ) : item.isHuman ? (
            /* Fun message for humans */
            <div className="text-center py-4">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {item.humanGender === 'male' ? "You're so handsome! 😎" : "You're so beautiful! 💖"}
              </h2>
              <p className="text-muted-foreground">
                This is a waste scanner, not a mirror! 😄
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground">{item.name}</h2>
              
              <div 
                className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-sm font-semibold"
                style={{ backgroundColor: `${category.color}20`, color: category.color }}
              >
                <Check className="w-4 h-4" />
                {category.label}
              </div>

              {/* Pending status indicator */}
              {item.status === 'pending' && item.category !== 'other' && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                  ⏳ Pending Review
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Only show waste-related content if not a human and not a retry */}
        {!item.isHuman && !isRetry && (
          <>
            {/* AI suggestion - show for all items with suggestion */}
            {item.aiSuggestion && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl"
              >
                <p className="text-sm text-foreground font-medium">
                  💡 {item.aiSuggestion}
                </p>
              </motion.div>
            )}

            {/* Hazardous warning */}
            {isHazardous && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.42 }}
                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl"
              >
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-bold">⚠️ Do NOT discard in regular bins!</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  This item must be taken to a specialized hazardous waste collection point.
                </p>
              </motion.div>
            )}

            {/* Creative potential - NanoBanana generation */}
            {item.hasCreativePotential && item.creativeSuggestion && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-yellow-600" />
                  <span className="font-bold text-yellow-800">Creative Potential!</span>
                </div>
                <p className="text-sm text-yellow-700 mb-3">{item.creativeSuggestion}</p>
                <NanoBananaButton 
                  scanId={item.id}
                  itemName={item.name}
                  existingCraftImage={item.craftImageUrl}
                />
              </motion.div>
            )}

            {/* Quick Trade Button - show for tradeable items (canTrade flag) even if no choices needed */}
            {!needsChoice && item.canTrade && item.category !== 'hazardous' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.42 }}
                className="mt-4"
              >
                <Button
                  onClick={() => handleChoice('trade')}
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  List on Marketplace
                </Button>
              </motion.div>
            )}

            {/* Disposal choice buttons - NEW LAYOUT */}
            {needsChoice && primaryChoices.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-6"
              >
                <p className="text-sm font-medium text-muted-foreground mb-3">Choose disposal method:</p>
                
                {/* Primary buttons - max 2 in a row, horizontal layout */}
                <div className="grid grid-cols-2 gap-3">
                  {primaryChoices.map((choice) => (
                    <Button
                      key={choice.value}
                      onClick={() => handleChoice(choice.value)}
                      className={`h-12 flex items-center justify-center gap-2 ${getChoiceStyle(choice.value)}`}
                    >
                      {getChoiceIcon(choice.value)}
                      <span className="font-bold text-sm">{choice.label}</span>
                      {choice.pointsMultiplier !== 1 && (
                        <span className="text-[10px] opacity-80">
                          ({choice.pointsMultiplier}x)
                        </span>
                      )}
                    </Button>
                  ))}
                </div>

                {/* Discard as text link - only if available (not for hazardous) */}
                {discardChoice && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="link"
                      onClick={() => handleChoice('discard')}
                      className="text-muted-foreground text-sm h-auto py-1 hover:text-foreground"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Just discard
                      {discardChoice.pointsMultiplier !== 1 && (
                        <span className="ml-1 text-xs opacity-70">
                          ({discardChoice.pointsMultiplier}x)
                        </span>
                      )}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Tip section */}
            {!needsChoice && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 p-4 bg-secondary rounded-xl"
              >
                <p className="text-sm text-secondary-foreground font-medium">
                  💡 {category.tip}
                </p>
              </motion.div>
            )}
          </>
        )}

        {/* Points reward animation */}
        <AnimatePresence>
          {showReward && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute top-4 right-4 flex items-center gap-2"
            >
              <motion.div
                animate={{ 
                  y: [0, -20, 0],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="gradient-reward text-accent-foreground px-4 py-2 rounded-full font-bold shadow-reward"
              >
                +{item.finalPoints} pts 🎉
                {item.status === 'pending' && <span className="text-xs ml-1">(pending)</span>}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue button - show for retry, human, or when no choice needed */}
        {(isRetry || !needsChoice || item.disposalChoice || item.isHuman) && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Button onClick={onClose} className="w-full" size="lg" variant={(item.isHuman || isRetry) ? "default" : "outline"}>
              {(item.isHuman || isRetry) ? "Try Again 📸" : "Continue Scanning"}
              {!(item.isHuman || isRetry) && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
