import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MarketplaceListing, Message, Order, Conversation } from '@/types/marketplace';
import { useToast } from '@/hooks/use-toast';

export const useMarketplace = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all active listings
  const fetchListings = useCallback(async () => {
    try {
      // First get listings
      const { data: listingsData, error: listingsError } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;

      // Then get seller usernames
      const sellerIds = [...new Set((listingsData || []).map(l => l.seller_id))];
      let profileMap = new Map<string, string>();
      
      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', sellerIds);
        
        profileMap = new Map((profiles || []).map(p => [p.id, p.username]));
      }

      const mapped = (listingsData || []).map((item: any) => ({
        id: item.id,
        sellerId: item.seller_id,
        sellerName: profileMap.get(item.seller_id) || 'Anonymous',
        scanId: item.scan_id,
        title: item.title,
        description: item.description,
        imageUrl: item.image_url,
        category: item.category,
        pricePoints: item.price_points,
        status: item.status,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));

      setListings(mapped);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  }, []);

  // Fetch user's own listings (including drafts and pending_review)
  const fetchMyListings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('seller_id', user.id)
        .in('status', ['active', 'draft', 'pending_review', 'sold'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        sellerId: item.seller_id,
        scanId: item.scan_id,
        title: item.title,
        description: item.description,
        imageUrl: item.image_url,
        category: item.category,
        pricePoints: item.price_points,
        status: item.status,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        condition: item.condition,
        pickupMethod: item.pickup_method,
        riskScore: item.risk_score,
      }));

      setMyListings(mapped);
    } catch (error) {
      console.error('Error fetching my listings:', error);
    }
  }, [user]);

  // Fetch user's orders
  const fetchOrders = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          marketplace_listings (*)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        listingId: item.listing_id,
        buyerId: item.buyer_id,
        sellerId: item.seller_id,
        pricePoints: item.price_points,
        status: item.status,
        createdAt: new Date(item.created_at),
        listing: item.marketplace_listings ? {
          id: item.marketplace_listings.id,
          sellerId: item.marketplace_listings.seller_id,
          title: item.marketplace_listings.title,
          imageUrl: item.marketplace_listings.image_url,
          category: item.marketplace_listings.category,
          pricePoints: item.marketplace_listings.price_points,
          status: item.marketplace_listings.status,
          createdAt: new Date(item.marketplace_listings.created_at),
          updatedAt: new Date(item.marketplace_listings.updated_at),
        } : undefined,
      }));

      setOrders(mapped);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, [user]);

  // Create a new listing - directly publish without AI review
  const createListing = useCallback(async (listing: {
    title: string;
    description?: string;
    imageUrl?: string;
    category: string;
    pricePoints: number;
    scanId?: string;
  }) => {
    if (!user) {
      toast({ title: 'Error', description: 'Please login to create listings', variant: 'destructive' });
      return null;
    }

    try {
      // Directly publish as active - no AI review
      const { data, error } = await supabase
        .from('marketplace_listings')
        .insert({
          seller_id: user.id,
          scan_id: listing.scanId,
          title: listing.title,
          description: listing.description,
          image_url: listing.imageUrl,
          category: listing.category,
          price_points: listing.pricePoints,
          status: 'active', // Direct publish
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Listed!', description: 'Your item is now live on the marketplace' });
      
      await fetchMyListings();
      await fetchListings();
      return data;
    } catch (error) {
      console.error('Error creating listing:', error);
      toast({ title: 'Error', description: 'Failed to create listing', variant: 'destructive' });
      return null;
    }
  }, [user, toast, fetchMyListings, fetchListings]);

  // Update a listing
  const updateListing = useCallback(async (id: string, updates: Partial<MarketplaceListing>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .update({
          title: updates.title,
          description: updates.description,
          price_points: updates.pricePoints,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('seller_id', user.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Listing updated!' });
      await fetchMyListings();
      await fetchListings();
      return true;
    } catch (error) {
      console.error('Error updating listing:', error);
      toast({ title: 'Error', description: 'Failed to update listing', variant: 'destructive' });
      return false;
    }
  }, [user, toast, fetchMyListings, fetchListings]);

  // Cancel a listing
  const cancelListing = useCallback(async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('seller_id', user.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Listing cancelled' });
      await fetchMyListings();
      await fetchListings();
      return true;
    } catch (error) {
      console.error('Error cancelling listing:', error);
      toast({ title: 'Error', description: 'Failed to cancel listing', variant: 'destructive' });
      return false;
    }
  }, [user, toast, fetchMyListings, fetchListings]);

  // Purchase a listing
  const purchaseListing = useCallback(async (listing: MarketplaceListing, buyerPoints: number) => {
    if (!user) {
      toast({ title: 'Error', description: 'Please login to purchase', variant: 'destructive' });
      return false;
    }

    if (listing.sellerId === user.id) {
      toast({ title: 'Error', description: 'Cannot purchase your own listing', variant: 'destructive' });
      return false;
    }

    if (buyerPoints < listing.pricePoints) {
      toast({ title: 'Insufficient Points', description: `You need ${listing.pricePoints - buyerPoints} more points`, variant: 'destructive' });
      return false;
    }

    try {
      // Create order
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.sellerId,
          price_points: listing.pricePoints,
          status: 'pending',
        });

      if (orderError) throw orderError;

      // Update listing status to sold
      const { error: listingError } = await supabase
        .from('marketplace_listings')
        .update({ status: 'sold', updated_at: new Date().toISOString() })
        .eq('id', listing.id);

      if (listingError) throw listingError;

      // Deduct points from buyer
      const { error: buyerError } = await supabase
        .from('profiles')
        .update({ 
          total_points: buyerPoints - listing.pricePoints,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (buyerError) throw buyerError;

      // Add points to seller
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('id', listing.sellerId)
        .single();

      if (sellerProfile) {
        await supabase
          .from('profiles')
          .update({ 
            total_points: (sellerProfile.total_points || 0) + listing.pricePoints,
            updated_at: new Date().toISOString(),
          })
          .eq('id', listing.sellerId);
      }

      // Get buyer's username for the notification
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const buyerName = buyerProfile?.username || 'A buyer';

      // Send notification to seller about the sale
      await supabase.from('system_notifications').insert({
        target_user_id: listing.sellerId,
        title: '🎉 Your item sold!',
        message: `${buyerName} purchased "${listing.title}" for ${listing.pricePoints} points. Check your messages to coordinate pickup!`,
        type: 'reward',
      });

      // Send initial message from buyer to seller to start the conversation
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: listing.sellerId,
        listing_id: listing.id,
        content: `Hi! I just purchased "${listing.title}". Let's arrange the pickup!`,
      });

      toast({ title: 'Purchase Complete!', description: `You spent ${listing.pricePoints} points` });
      await fetchListings();
      await fetchOrders();
      return true;
    } catch (error) {
      console.error('Error purchasing listing:', error);
      toast({ title: 'Error', description: 'Purchase failed', variant: 'destructive' });
      return false;
    }
  }, [user, toast, fetchListings, fetchOrders]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchListings();
      if (user) {
        await fetchMyListings();
        await fetchOrders();
      }
      setLoading(false);
    };
    loadData();
  }, [user, fetchListings, fetchMyListings, fetchOrders]);

  return {
    listings,
    myListings,
    orders,
    loading,
    createListing,
    updateListing,
    cancelListing,
    purchaseListing,
    refreshListings: fetchListings,
  };
};
