/**
 * Static content for the storefront sections that don't come from the product
 * catalog: reviews, events, stores, community boards, and TikTok "shorts".
 * Sample/representative content replicating the live site's sections.
 */

export interface Review {
  id: string;
  author: string;
  rating: number;
  product?: string;
  title?: string;
  body: string;
  date: string;
  /** Review photo shown in the card's square image area. */
  image: string;
}

export const reviews: Review[] = [
  {
    id: "r1",
    author: "Ananya",
    rating: 5,
    product: "NOWATER set",
    title: "Beautiful packaging, lovely textures",
    body: "I'd been seeing Nowater everywhere lately, so I finally decided to get the full set. Honest, opening everything at once felt like such a treat! The packaging is beautiful, and the textures feel really nice and not too heavy on my skin.",
    date: "2026-07-28",
    image: "/review/7dd5cfdd7496e34f24f17386637d41d7.png",
  },
  {
    id: "r2",
    author: "Priya",
    rating: 5,
    product: "Brightening Vitamin Serum",
    title: "Skin looks brighter",
    body: "The cleansing oil and vitamin serum are the ones I keep reaching for the most. Hoping to come back with clearer, healthier-looking skin soon.",
    date: "2026-07-19",
    image: "/product/big/202607/897d56d4173f800b07d425659cd53f54.jpg",
  },
  {
    id: "r3",
    author: "Sara",
    rating: 4,
    product: "Prestige73 Teatree Mask",
    title: "Soothing and cooling",
    body: "Very soothing on breakout-prone skin. Leaves a nice clean feel without being drying.",
    date: "2026-07-10",
    image: "/product/big/202607/d1537ec89bdd366be8532aa8cfd88af5.jpg",
  },
];

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  badge?: string;
}

export const events: EventItem[] = [
  {
    id: "e1",
    title: "Welcome Gift — +3,000P",
    description:
      "Join OUR:NARA and receive mileage points to spend on your first order.",
    date: "Ongoing",
    badge: "New",
  },
  {
    id: "e2",
    title: "Pre-Order Early Bird",
    description:
      "Order now, ships later. Lock in launch pricing on new arrivals.",
    date: "Ongoing",
  },
];

export interface Store {
  id: string;
  name: string;
  city: string;
  address: string;
  hours: string;
}

export const stores: Store[] = [
  {
    id: "st1",
    name: "OUR:NARA Mumbai",
    city: "Mumbai, IN",
    address: "One World, S.V. Road, Malad West, Mumbai, Maharashtra 400064",
    hours: "Mon–Fri 09:00–18:00",
  },
  {
    id: "st2",
    name: "OUR:NARA Incheon",
    city: "Incheon, KR",
    address:
      "Room 1816, Building B, Incheon Techno Valley U1 Center, 94, Galsan-dong, Bupyeong-gu",
    hours: "Mon–Fri 09:00–18:00",
  },
];

export interface CommunityPost {
  id: string;
  title: string;
  date: string;
  author?: string;
  body: string;
  status?: "Answered" | "Pending";
}

export const notices: CommunityPost[] = [
  {
    id: "n1",
    title: "Shipping schedule update",
    date: "2026-07-25",
    body: "Please note the updated shipping schedule for pre-orders this month.",
    author: "OUR:NARA",
  },
  {
    id: "n2",
    title: "Holiday closure notice",
    date: "2026-07-15",
    body: "Our support team will be offline on national holidays.",
    author: "OUR:NARA",
  },
];

export const qaPosts: CommunityPost[] = [
  {
    id: "q1",
    title: "Do you ship internationally?",
    date: "2026-07-20",
    body: "We ship worldwide. Choose your destination at checkout.",
    status: "Answered",
  },
  {
    id: "q2",
    title: "When will pre-orders arrive?",
    date: "2026-07-18",
    body: "Pre-orders ship once stock arrives at our warehouse.",
    status: "Answered",
  },
];

export const faqs: { q: string; a: string }[] = [
  {
    q: "What payment methods do you accept?",
    a: "Cards, UPI, netbanking and wallets via Razorpay.",
  },
  {
    q: "How long does shipping take?",
    a: "Domestic (India) 3–7 business days; international 7–14 business days.",
  },
  {
    q: "What is a pre-order?",
    a: "Order now, ships later. Your order ships when stock arrives.",
  },
  {
    q: "How do I use mileage points?",
    a: "Earn points on paid orders and use them as a discount at checkout.",
  },
];
