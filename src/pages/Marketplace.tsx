import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Package, FileEdit, Sparkles, History, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { ListingDetail } from '@/components/marketplace/ListingDetail';
import { ListingForm } from '@/components/marketplace/ListingForm';
import { ChatDrawer } from '@/components/marketplace/ChatDrawer';
import { CheckoutModal } from '@/components/marketplace/CheckoutModal';
import { DraftListingEditor } from '@/components/marketplace/DraftListingEditor';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import { MarketplaceListing } from '@/types/marketplace';
import { supabase } from '@/integrations/supabase/client';

const Marketplace = () => {
  const { user, isGuest } = useAuth();
  const {
    listings,
    myListings,
    orders,
    loading,
    createListing,
    updateListing,
    cancelListing,
    purchaseListing,
    refreshListings,
  } = useMarketplace();

  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showDraftEditor, setShowDraftEditor] = useState(false);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  const [userPoints, setUserPoints] = useState(0);

  // Separate drafts, active, pending, and sold listings
  const draftListings = myListings.filter(l => l.status === 'draft');
  const pendingListings = myListings.filter(l => l.status === 'pending_review');
  const activeMyListings = myListings.filter(l => l.status === 'active');
  const soldListings = myListings.filter(l => l.status === 'sold');

  // Fetch user points
  useEffect(() => {
    const fetchPoints = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('id', user.id)
        .single();
      if (data) setUserPoints(data.total_points || 0);
    };
    fetchPoints();
  }, [user]);

  const handleListingClick = (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setShowDetail(true);
  };

  const handleBuy = (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setShowDetail(false);
    setShowCheckout(true);
  };

  const handleChat = (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setShowDetail(false);
    setShowChat(true);
  };

  const handleEdit = (listing: MarketplaceListing) => {
    setEditingListing(listing);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleCancel = async (listing: MarketplaceListing) => {
    await cancelListing(listing.id);
    setShowDetail(false);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedListing) return false;
    const success = await purchaseListing(selectedListing, userPoints);
    if (success) {
      setUserPoints((prev) => prev - selectedListing.pricePoints);
      // Refresh listings after purchase
      await refreshListings();
    }
    return success;
  };

  const handleFormSubmit = async (data: {
    title: string;
    description?: string;
    category: string;
    pricePoints: number;
    imageUrl?: string;
    scanId?: string;
  }) => {
    if (editingListing) {
      await updateListing(editingListing.id, {
        title: data.title,
        description: data.description,
        pricePoints: data.pricePoints,
      });
    } else {
      await createListing(data);
    }
    setEditingListing(null);
  };

  if (isGuest) {
    return (
      <div className="min-h-screen gradient-nature">
        <div className="max-w-md mx-auto px-4 py-8">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-bold text-foreground mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">
              Create an account to access the marketplace
            </p>
            <Link to="/auth">
              <Button>Sign Up / Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-nature">
      <div className="max-w-4xl mx-auto px-3 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          
          <div className="flex items-center gap-1.5 text-sm">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span className="font-medium">{userPoints} pts</span>
          </div>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Marketplace
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Buy and sell items with points</p>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-9 mb-4">
            <TabsTrigger value="browse" className="text-xs flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="my-listings" className="text-xs flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              My Items
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs flex items-center gap-1">
              <History className="w-3.5 h-3.5" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                <h3 className="text-sm font-medium text-foreground mb-1">No listings yet</h3>
                <p className="text-xs text-muted-foreground">Be the first to list an item!</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
              >
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onClick={() => handleListingClick(listing)}
                  />
                ))}
              </motion.div>
            )}
          </TabsContent>

          {/* My Listings Tab */}
          <TabsContent value="my-listings">
            {/* Draft listings alert */}
            {draftListings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-sm text-amber-800">
                    {draftListings.length} draft(s)
                  </span>
                </div>
                <p className="text-xs text-amber-700 mb-2">
                  Edit and submit for approval.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {draftListings.map((draft) => (
                    <Button
                      key={draft.id}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs bg-white border-amber-300 text-amber-800 hover:bg-amber-100"
                      onClick={() => {
                        setSelectedListing(draft);
                        setShowDraftEditor(true);
                      }}
                    >
                      <FileEdit className="w-3 h-3 mr-1" />
                      {draft.title}
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Info about creating listings */}
            <div className="mb-3 p-2.5 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Scan items marked for Trade to create listings
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : activeMyListings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                <h3 className="text-sm font-medium text-foreground mb-1">No active listings</h3>
                <p className="text-xs text-muted-foreground">
                  {draftListings.length > 0 
                    ? 'Publish your drafts above' 
                    : 'Create your first listing'}
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
              >
                {activeMyListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onClick={() => handleListingClick(listing)}
                    isOwn
                  />
                ))}
              </motion.div>
            )}
          </TabsContent>

          {/* History Tab - Sold and Purchased */}
          <TabsContent value="history">
            <div className="space-y-4">
              {/* Purchased items */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  Purchased ({orders.filter(o => o.buyerId === user?.id).length})
                </h3>
                {orders.filter(o => o.buyerId === user?.id).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center bg-muted/30 rounded-lg">
                    No purchases yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orders.filter(o => o.buyerId === user?.id).map((order) => (
                      <div
                        key={order.id}
                        onClick={() => {
                          if (order.listing) {
                            setSelectedListing(order.listing as MarketplaceListing);
                            setShowChat(true);
                          }
                        }}
                        className="flex items-center gap-2.5 p-2.5 bg-card/80 rounded-lg border border-border/40 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                          {order.listing?.imageUrl ? (
                            <img src={order.listing.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{order.listing?.title || 'Unknown Item'}</p>
                          <p className="text-xs text-muted-foreground">
                            Bought for {order.pricePoints} pts
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Purchased</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sold items */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-primary" />
                  Sold ({soldListings.length})
                </h3>
                {soldListings.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center bg-muted/30 rounded-lg">
                    No items sold yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {soldListings.map((listing) => (
                      <div
                        key={listing.id}
                        onClick={() => {
                          setSelectedListing(listing);
                          setShowChat(true);
                        }}
                        className="flex items-center gap-2.5 p-2.5 bg-card/80 rounded-lg border border-border/40 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                          {listing.imageUrl ? (
                            <img src={listing.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{listing.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Sold for {listing.pricePoints} pts
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Sold</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <ListingDetail
        listing={selectedListing}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onBuy={handleBuy}
        onChat={handleChat}
        onEdit={handleEdit}
        onCancel={handleCancel}
        userPoints={userPoints}
      />

      <ListingForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingListing(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingListing || undefined}
      />

      <ChatDrawer
        listing={selectedListing}
        isOpen={showChat}
        onClose={() => setShowChat(false)}
      />

      <CheckoutModal
        listing={selectedListing}
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onConfirm={handleConfirmPurchase}
        onOpenChat={() => {
          setShowCheckout(false);
          setShowChat(true);
        }}
        userPoints={userPoints}
      />

      {/* Draft Editor */}
      {selectedListing && (
        <DraftListingEditor
          listing={selectedListing}
          isOpen={showDraftEditor}
          onClose={() => {
            setShowDraftEditor(false);
            refreshListings();
          }}
          onPublish={refreshListings}
        />
      )}
    </div>
  );
};

export default Marketplace;
