import { useState } from 'react';
import { api } from '../api';
import AlbumCard from '../components/AlbumCard';

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const albums = await api.searchAlbums(query);
      setResults(albums || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-1">Find an album</h1>
      <p className="text-dim mb-6">Search the Spotify catalog and log what you've heard.</p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Album or artist name…"
          className="flex-1 bg-surface border border-groove rounded-lg px-4 py-3 text-cream placeholder:text-dim focus:border-label outline-none transition-colors"
        />
        <button
          type="submit"
          className="px-5 py-3 rounded-lg bg-label text-ink font-medium hover:brightness-110 transition"
        >
          Search
        </button>
      </form>

      {loading && <p className="text-dim text-sm">Searching…</p>}

      {!loading && searched && results.length === 0 && (
        <p className="text-dim text-sm">No albums found for "{query}".</p>
      )}

      <div className="flex flex-col gap-1">
        {results.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </div>
  );
}
