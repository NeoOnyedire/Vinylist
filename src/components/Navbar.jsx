import { Link, useNavigate } from 'react-router-dom';
import { clearToken, isLoggedIn } from '../api';

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  function handleLogout() {
    clearToken();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-groove/80 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Vinylist home">
          <span className="relative h-7 w-7 flex-shrink-0 rounded-full border-2 border-label bg-surface">
            <span className="absolute inset-[6px] rounded-full bg-label" />
          </span>
          <span className="font-display text-xl tracking-tight text-cream">Vinylist</span>
        </Link>

        {loggedIn ? (
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/"
              className="rounded-full border border-groove bg-surface/80 px-3 py-1.5 text-xs font-medium text-dim transition hover:border-label hover:text-cream sm:text-sm"
            >
              Search
            </Link>
            <Link
              to="/profile"
              className="rounded-full border border-groove bg-surface/80 px-3 py-1.5 text-xs font-medium text-dim transition hover:border-label hover:text-cream sm:text-sm"
            >
              My rankings
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-groove bg-transparent px-3 py-1.5 text-xs font-medium text-dim transition hover:border-label hover:text-label sm:text-sm"
            >
              Log out
            </button>
          </nav>
        ) : (
          <Link
            to="/login"
            className="rounded-full bg-label px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
