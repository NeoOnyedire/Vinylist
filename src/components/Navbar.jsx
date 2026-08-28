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
    <header className="border-b border-groove">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full border-2 border-label relative flex-shrink-0">
            <span className="absolute inset-[6px] rounded-full bg-label" />
          </span>
          <span className="font-display text-xl tracking-tight text-cream">
            Vinylist
          </span>
        </Link>

        {loggedIn ? (
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/" className="text-dim hover:text-cream transition-colors">
              Search
            </Link>
            <Link to="/profile" className="text-dim hover:text-cream transition-colors">
              My rankings
            </Link>
            <button
              onClick={handleLogout}
              className="text-dim hover:text-label transition-colors"
            >
              Log out
            </button>
          </nav>
        ) : (
          <Link
            to="/login"
            className="text-sm px-4 py-2 rounded-full bg-label text-ink font-medium hover:brightness-110 transition"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
