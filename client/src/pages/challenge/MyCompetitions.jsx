import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import api from "../../services/api";
import EntryCard from "../../components/competition/EntryCard";

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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Competitions</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">Every challenge you've entered, and how it went.</p>

      {loading ? (
        <p className="mt-10 text-gray-500 dark:text-gray-400">Loading…</p>
      ) : error ? (
        <p className="mt-10 text-[#D14D37]">{error}</p>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Trophy className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
          <p className="mt-4 font-semibold text-gray-900 dark:text-white">You haven't entered a competition yet</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Ckript runs 48-hour scriptwriting challenges with real prizes.
          </p>
          <Link to="/challenge" className="mt-6 inline-block rounded-lg bg-[#D14D37] px-5 py-2.5 font-medium text-white hover:bg-[#b8402d]">
            See the current challenge
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {items.map((item) => <EntryCard key={item.entry._id} item={item} serverNow={serverNow} />)}
        </div>
      )}
    </div>
  );
};

export default MyCompetitions;
