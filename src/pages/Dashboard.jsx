import { useState } from 'react';
import { api } from '../api';
import AlbumCard from '../components/AlbumCard';

const SAMPLE_SEARCHES = ['Fleetwood Mac', 'Kendrick Lamar', 'Magdalena Bay'];

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      setError('Type an album or artist name first.');
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    setError('');

    try {
      const albums = await api.searchAlbums(trimmed);
      setResults(albums || []);
      if (!albums || albums.length === 0) {
        setError(`No albums found for “${trimmed}”.`);
      }
    } catch (err) {
      console.error(err);
      setError('Search failed. Please try again in a moment.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-10">
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-label/80">
          Your listening log
        </p>
        <h1 className="font-display text-3xl text-cream sm:text-4xl">Find an album</h1>
        <p className="mt-2 max-w-lg text-sm text-dim sm:text-base">
          Search the Spotify catalog and log the records you keep coming back to.
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-6 rounded-2xl border border-groove bg-surface/70 p-3 shadow-lg shadow-ink/30">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Album or artist name…"
            className="flex-1 rounded-xl border border-groove bg-surface2 px-4 py-3 text-base text-cream placeholder:text-dim focus:border-label focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-label px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLE_SEARCHES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setQuery(item)}
              className="rounded-full border border-groove bg-surface2 px-2.5 py-1 text-xs text-dim transition hover:border-label hover:text-cream"
            >
              {item}
            </button>
          ))}
        </div>
      </form>

      {loading && (
        <div className="rounded-2xl border border-groove bg-surface/60 p-4 text-sm text-dim">
          Searching the catalog…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !searched && !error && (
        <div className="rounded-2xl border border-dashed border-groove bg-surface/40 p-5 text-sm text-dim">
          Start by searching for an artist or album title to build your collection.
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {results.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </div>
  );
}
