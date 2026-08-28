import { useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
  const [params] = useSearchParams();
  const error = params.get('error');

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto mb-8 w-20 h-20 rounded-full border-4 border-label relative animate-spin-slow">
          <span className="absolute inset-[26px] rounded-full bg-label" />
          <span className="absolute inset-0 rounded-full border border-groove m-2" />
        </div>

        <h1 className="font-display text-3xl mb-2">Welcome to Vinylist</h1>
        <p className="text-dim mb-8">
          Log every album you spin, rate it, and watch your all-time ranking take shape.
        </p>

        {error && (
          <p className="text-sm text-red-400 mb-4">
            Something went wrong signing you in. Please try again.
          </p>
        )}

        <a
          href={api.loginUrl()}
          className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-full bg-[#1DB954] text-ink font-semibold hover:brightness-110 transition"
        >
          Continue with Spotify
        </a>

        <p className="text-xs text-dim mt-6">
          We only ever read your public Spotify profile to sign you in.
        </p>
      </div>
    </div>
  );
}
