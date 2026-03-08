import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Toaster } from 'react-hot-toast';
import { Home } from './components/Home';
import { Dashboard } from './components/Dashboard';
import { useBackboard } from './hooks/useBackboard';

import './App.css';

function App() {
  const { user, isAuthenticated } = useAuth0();
  const { initializeThread } = useBackboard();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    if (isAuthenticated && user?.sub) {
      initializeThread(user.sub);
    }
  }, [isAuthenticated, user?.sub, initializeThread]);

  return (
    <div className="app-container">
      {!isLanding && (
        <nav className="navbar">
          <h1 className="logo">CanAfford</h1>
        </nav>
      )}
      <Toaster position="bottom-right" />
      <main className={isLanding ? '' : 'main-content'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

