import { Construction } from "lucide-react";
import PageHeader from "../components/PageHeader";

export default function SessionBuilder() {
  return (
    <div>
      <PageHeader
        title="Session Builder"
        subtitle="Drag-and-drop your session from the drill library"
      />
      <div className="card p-12 text-center">
        <Construction className="mx-auto text-accent mb-4" size={48} />
        <h3 className="font-display text-xl font-bold mb-2">Coming in Phase 3</h3>
        <p className="text-sm text-white/50 max-w-md mx-auto">
          This is where the magic happens. A full drag-and-drop canvas with
          Warmup → Main Work → Cooldown blocks, pulling drills from your 95-drill library.
        </p>
      </div>
    </div>
  );
}
