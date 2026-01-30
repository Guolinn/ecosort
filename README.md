# EcoSort - Smart Waste Classification System

<p align="center">
  <img src="src/assets/logo.png" alt="EcoSort Logo" width="120" />
</p>

<p align="center">
  <strong>"Fixing the System, Not the Student."</strong><br/>
  A Scan-and-Reward AI Solution for Waste Classification
</p>

---

## The Problem

> "Sorting correctly brings no visible reward; throwing things away casually is easier."

Waste sorting systems often fail not because users don't care, but because they place too much burden on individuals:

- **Cognitive Burden** – "Is this recyclable?" Even with signs, every decision requires mental effort.
- **Misaligned Incentives** – Correct sorting costs time with zero reward; random tossing is effortless with zero penalty.
- **The Rational Choice** – When effort yields nothing, tossing randomly becomes the default.

---

## The Solution

EcoSort flips the behavioral equation by making the _right_ action the _easy_ action:

- **Instant Reward** – Points are awarded the moment you scan, not after you sort.
- **Zero Cognitive Load** – AI identifies the item and tells you exactly where it goes.
- **Gamified Delight** – The "NanoBanana AI" adds surprise and creativity, turning waste into collectible moments.

**The Logic**: Anticipation & Delight > Behavioral Cost.

---

## Demo

🎥 **Demo Video**: [Coming Soon]  
📱 **Live App**: https://ecosort.site

---

## How It Works

1. **Scan** – User opens the app and takes a photo of a waste item
2. **AI Classification** – The image is analyzed by AI (GPT-4o-mini or Gemini 2.0 Flash)
3. **Result** – System returns the waste category with disposal instructions
4. **Action** – User chooses to sell, donate, recycle, or discard
5. **Reward** – Points are awarded based on the eco-friendliness of the choice

## ✨ Core Features

### 🔍 AI-Powered Recognition

- **Real-time Camera Scanning** - Take photos of items and get instant AI classification
- **Dual AI Engine** - Supports GPT-4o-mini and Gemini 2.0 Flash
- **Six Categories** - Following China's waste classification standards:
  - Recyclable (Blue)
  - Compost/Food Waste (Green)
  - Hazardous (Red)
  - Other Waste (Grey)
  - Clothing (Purple)
  - Electronics (Orange)

### 🎮 Points & Level System

- **Point Rewards** - Earn points based on disposal method with different multipliers:
  - Clothing: Donate (2x), Trade (1.8x), Discard (1x)
  - Electronics: Trade (2x), Recycle (1.5x), Discard (0.5x)
  - Recyclable/Compost: Recycle/Compost (1.5x), Discard (1x)
  - Hazardous: Specialized Disposal (fixed 20 points)
- **Level Progression** - Accumulate points to unlock new levels with animated effects

### 🛒 Points Marketplace

- **Points-Based Trading** - Buy and sell second-hand items using reward points
- **Real-time Chat** - Peer-to-peer messaging between buyers and sellers
- **Quick Listing** - Publish items directly from scan results
- **Transaction History** - View purchased and sold items

### 🍌 NanoBanana Creative Workshop

- **AI Creative Ideas** - Generate DIY upcycling suggestions for recyclable items
- **Creative Images** - Use Gemini to generate upcycling concept images
- **Eco-Friendly Philosophy** - Encourage item reuse and reduce waste

### 📬 Inbox

- **System Notifications** - Transaction success, review results, and system messages
- **Chat History** - Marketplace conversation threads

### 👤 User System

- **Authentication** - Email and password registration/login
- **Guest Mode** - Try basic features without registration
- **Personal Stats** - Scan count, points, level, and more

### 🔧 Admin Dashboard

- **User Management** - View and manage registered users
- **Listing Records** - View all marketplace listings
- **Scan History** - View all user scan records
- **Notification Management** - Send system notifications

## 🛠️ Tech Stack

| Category             | Technology                                              |
| -------------------- | ------------------------------------------------------- |
| **Frontend**         | React 18 + TypeScript                                   |
| **Build Tool**       | Vite                                                    |
| **Styling**          | Tailwind CSS + shadcn/ui                                |
| **State Management** | TanStack Query                                          |
| **Routing**          | React Router v6                                         |
| **Animation**        | Framer Motion                                           |
| **Backend**          | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| **AI Services**      | OpenAI GPT-4o-mini / Google Gemini 2.0 Flash            |

## 📁 Project Structure

```
src/
├── assets/              # Static assets (Logo, etc.)
├── components/          # Reusable components
│   ├── ui/              # shadcn/ui base components
│   ├── admin/           # Admin dashboard components
│   ├── inbox/           # Inbox components
│   └── marketplace/     # Marketplace components
├── contexts/            # React Context (AuthContext)
├── hooks/               # Custom hooks
│   ├── useChat.ts       # Chat functionality
│   ├── useMarketplace.ts # Marketplace functionality
│   ├── useWasteScanner.ts # Scanning functionality
│   └── useUserRole.ts   # User role management
├── pages/               # Page components
│   ├── Index.tsx        # Home page
│   ├── Marketplace.tsx  # Marketplace page
│   ├── Inbox.tsx        # Inbox page
│   ├── Admin.tsx        # Admin dashboard
│   └── Auth.tsx         # Login/Register
├── services/            # Service layer
│   ├── wasteClassifier.ts # Waste classification service
│   └── imageStorage.ts  # Image storage service
├── types/               # TypeScript type definitions
└── integrations/        # Third-party integrations (Supabase)

supabase/
└── functions/           # Edge Functions
    ├── classify-waste/  # AI classification API
    ├── classify-waste-binary/ # Binary image classification
    ├── check-listing-compliance/ # Listing compliance check
    └── generate-craft-image/ # Creative image generation
```

## 🚀 Local Development

### Requirements

- Node.js 18+
- npm or bun

### Installation

```bash
# 1. Clone the repository
git clone <github.com/Guolinn>
cd <ecosort>

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Environment Variables

Configure the following secrets in Supabase:

- `OPENAI_API_KEY` - OpenAI API key (for GPT-4o-mini)
- `GEMINI_API_KEY` - Google AI API key (for Gemini 2.0 Flash)

## 📱 User Guide

1. **Scan Items** - Tap the scan button on the home page and photograph the item
2. **View Results** - AI identifies the item and shows classification with disposal suggestions
3. **Choose Disposal** - Select sell/donate/discard to earn points
4. **Trade in Marketplace** - Browse or list items, trade using points
5. **Check Inbox** - View transaction notifications and chat messages

## 🎨 Design Style

- **Theme** - Natural green palette reflecting eco-friendly values
- **Dark Mode** - Supported with deep green gradient background
- **Mobile-First** - Compact layout optimized for mobile devices
- **Gamification** - Level badges, point animations, and game-like elements

## 📄 License

This project is for learning and demonstration purposes only.

---

<p align="center">
  Built by guolinn
</p>
