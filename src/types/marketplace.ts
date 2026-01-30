export type ListingStatus = 'draft' | 'pending_review' | 'active' | 'sold' | 'cancelled';
export type OrderStatus = 'pending' | 'completed' | 'cancelled';
export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';
export type PickupMethod = 'meetup' | 'delivery' | 'pickup_point';

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  sellerName?: string;
  scanId?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category: string;
  pricePoints: number;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  condition?: ItemCondition;
  pickupMethod?: PickupMethod;
  riskScore?: number;
}

export interface Message {
  id: string;
  listingId: string;
  senderId: string;
  receiverId: string;
  senderName?: string;
  content: string;
  read: boolean;
  createdAt: Date;
}

export interface Order {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  pricePoints: number;
  status: OrderStatus;
  createdAt: Date;
  listing?: MarketplaceListing;
}

export interface Conversation {
  listingId: string;
  listing: MarketplaceListing;
  otherUserId: string;
  otherUserName: string;
  lastMessage?: Message;
  unreadCount: number;
}
