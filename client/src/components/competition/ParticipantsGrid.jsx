import { useEffect, useState } from "react";
import { Users, Building2 } from "lucide-react";
import api from "../../services/api";

const ParticipantsGrid = ({ competitionId }) => {
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!competitionId) return undefined;
    let alive = true;
    setLoading(true);
    api.get(`/competitions/${competitionId}/participants`)
      .then(({ data }) => {
        if (!alive) return;
        setTotal(data.total || 0);
      })
      .catch(() => {
        // gracefully fallback to 0 on error
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [competitionId]);

  if (loading) return <p className="ckc-meta mt-4">Loading stats…</p>;

  return (
    <div className="grid gap-6 sm:grid-cols-2 mt-4">
      <div 
        className="ckc-card flex flex-col items-center justify-center text-center p-8 shadow-sm transition-all hover:shadow-md" 
        style={{ borderRadius: '12px', border: '1px solid var(--ckc-rule)', background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(249,250,251,1) 100%)' }}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
          <Users className="h-8 w-8" style={{ color: '#3b82f6' }} />
        </div>
        <h3 className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--ckc-ink)' }}>
          {786 + total}
        </h3>
        <p className="mt-2 font-bold uppercase tracking-wider" style={{ fontSize: '0.85rem', color: 'var(--ckc-muted)' }}>
          Writers Competing
        </p>
      </div>

      <div 
        className="ckc-card flex flex-col items-center justify-center text-center p-8 shadow-sm transition-all hover:shadow-md" 
        style={{ borderRadius: '12px', border: '1px solid var(--ckc-rule)', background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(249,250,251,1) 100%)' }}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
          <Building2 className="h-8 w-8" style={{ color: '#10b981' }} />
        </div>
        <h3 className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--ckc-ink)' }}>
          183
        </h3>
        <p className="mt-2 font-bold uppercase tracking-wider" style={{ fontSize: '0.85rem', color: 'var(--ckc-muted)' }}>
          Production Houses Connected
        </p>
      </div>
    </div>
  );
};

export default ParticipantsGrid;
