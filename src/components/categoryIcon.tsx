import {
  ShoppingCart,
  UtensilsCrossed,
  Bus,
  Repeat,
  ReceiptText,
  ShoppingBag,
  HeartPulse,
  Plane,
  Banknote,
  Landmark,
  ArrowLeftRight,
  CircleDollarSign,
  Tag,
  type LucideIcon,
} from 'lucide-react';

// One simple line icon per category. No emoji, no clip-art.
const ICONS: Record<string, LucideIcon> = {
  Groceries: ShoppingCart,
  'Dining/Takeaway': UtensilsCrossed,
  Transport: Bus,
  Subscriptions: Repeat,
  'Utilities/Bills': ReceiptText,
  Shopping: ShoppingBag,
  'Health & Fitness': HeartPulse,
  Travel: Plane,
  'Cash/ATM': Banknote,
  Fees: Landmark,
  Income: CircleDollarSign,
  Transfers: ArrowLeftRight,
  Other: Tag,
};

export function CategoryIcon({
  category,
  className = 'h-4 w-4',
}: {
  category: string;
  className?: string;
}) {
  const Icon = ICONS[category] ?? Tag;
  return <Icon className={className} aria-hidden />;
}
