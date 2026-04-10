import { Calendar } from "lucide-react";
import PageHeader from "../components/PageHeader";

export default function MySessions() {
  return (
    <div>
      <PageHeader
        title="My Sessions"
        subtitle="All your scheduled and completed training sessions"
      />
      <div className="card p-12 text-center">
        <Calendar className="mx-auto text-electric mb-4" size={48} />
        <h3 className="font-display text-xl font-bold mb-2">Coming in Phase 3</h3>
        <p className="text-sm text-white/50 max-w-md mx-auto">
          Your session history will live here — past, upcoming, and saved templates.
        </p>
      </div>
    </div>
  );
}
