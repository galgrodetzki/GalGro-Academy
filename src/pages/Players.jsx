import { Users } from "lucide-react";
import PageHeader from "../components/PageHeader";

export default function Players() {
  return (
    <div>
      <PageHeader
        title="Players"
        subtitle="Your goalkeeper roster and assigned sessions"
      />
      <div className="card p-12 text-center">
        <Users className="mx-auto text-orange mb-4" size={48} />
        <h3 className="font-display text-xl font-bold mb-2">Coming in Phase 4</h3>
        <p className="text-sm text-white/50 max-w-md mx-auto">
          Add your goalkeepers, track their training history, and assign sessions to individual players.
        </p>
      </div>
    </div>
  );
}
