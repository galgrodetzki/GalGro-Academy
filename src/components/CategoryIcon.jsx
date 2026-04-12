import {
  Brain,
  Crosshair,
  Dumbbell,
  Flag,
  Footprints,
  Megaphone,
  MoveUpRight,
  RefreshCw,
  Send,
  ShieldCheck,
  Target,
  Waves,
  Zap,
} from "lucide-react";

const ICONS = {
  "shot-stopping": ShieldCheck,
  diving: Waves,
  reflexes: Zap,
  footwork: Footprints,
  positioning: Crosshair,
  distribution: Send,
  crosses: MoveUpRight,
  "1v1": Target,
  "set-pieces": Flag,
  communication: Megaphone,
  physical: Dumbbell,
  mental: Brain,
  recovery: RefreshCw,
};

export default function CategoryIcon({ category, size = 14, className = "" }) {
  const Icon = ICONS[category] ?? Target;
  return <Icon size={size} strokeWidth={2.2} className={className} aria-hidden="true" />;
}
