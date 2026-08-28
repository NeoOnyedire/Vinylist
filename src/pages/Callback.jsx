import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '../api';

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const token = params.get('token');

    if (token) {
      setToken(token);
      navigate('/', { replace: true });
    } else {
      navigate('/login?error=missing_token', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <p className="text-dim">Signing you in…</p>
    </div>
  );
}
