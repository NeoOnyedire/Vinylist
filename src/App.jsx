import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Dashboard from './pages/Dashboard';
import AlbumDetail from './pages/AlbumDetail';
import Profile from './pages/Profile';
import { isLoggedIn } from './api';

function RequireAuth({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-ink text-cream font-body antialiased">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(232,163,61,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(79,168,160,0.10),_transparent_30%)]">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/callback" element={<Callback />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/album/:id"
              element={
                <RequireAuth>
                  <AlbumDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
