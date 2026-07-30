import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import api from "../../services/api";
import EntryCard from "../../components/competition/EntryCard";
import { Card } from "../../components/competition/ui";
import "./challenge.css";

const MyCompetitions = () => {
  const [items, setItems] = useState([]);
  const [serverNow, setServerNow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/competitions/mine");
        if (!alive) return;
        setItems(data.items || []);
        setServerNow(data.serverNow || null);
      } catch (err) {
        if (alive) setError(err?.response?.data?.message || "Failed to load your competitions.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="ckc" style={{ minHeight: "100vh" }}>
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Your own record is finished business, so the eyebrow stays in the slug-line voice — the
            coral on this page belongs to whichever entry is still running, and EntryCard owns that. */}
        <header className="ckc-masthead">
          <p className="ckc-meta inline-flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Your entries
          </p>
          <h1 className="ckc-title ckc-h1">My competitions</h1>
          <p className="ckc-lede">Every challenge you've entered, and how it went.</p>
        </header>

        {loading ? (
          <p className="ckc-meta" style={{ padding: "56px 0", textAlign: "center" }}>Loading…</p>
        ) : error ? (
          <Card className="mt-10 text-center">
            <p className="ckc-lede" style={{ margin: "0 auto", color: "var(--ckc-accent-text)" }}>{error}</p>
          </Card>
        ) : items.length === 0 ? (
          <Card className="mt-10 text-center">
            <Trophy className="mx-auto h-10 w-10" style={{ color: "var(--ckc-faint)" }} aria-hidden="true" />
            <p className="ckc-title ckc-h3" style={{ marginTop: 16 }}>You haven't entered a competition yet</p>
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: "var(--ckc-muted)" }}>
              Ckript runs 48-hour scriptwriting challenges with real prizes.
            </p>
            <Link to="/challenge" className="ckc-btn mt-6">
              See the current challenge
            </Link>
          </Card>
        ) : (
          <div className="mt-8 space-y-5">
            {items.map((item) => <EntryCard key={item.entry._id} item={item} serverNow={serverNow} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCompetitions;
