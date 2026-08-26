import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/common/Navbar/Navbar';
import { HomePage } from './pages/Home/HomePage';
import { Footer } from './components/common/Footer/Footer';
import SignUp from './components/authentication/signup';
import Login from './components/authentication/login';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    // Parse OAuth redirect query parameters if present
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('upskillr_token', token);
        localStorage.setItem('upskillr_user', JSON.stringify(user));
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('Failed to parse user data from OAuth callback URL');
      }
    }

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    // Custom event listener for seamless internal SPA navigation
    const handleNavigate = (e) => {
      if (e.detail && e.detail.path) {
        setCurrentPath(e.detail.path);
      } else {
        setCurrentPath(window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('upskillr_navigate', handleNavigate);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('upskillr_navigate', handleNavigate);
    };
  }, []);

  const renderContent = () => {
    const path = currentPath.toLowerCase();
    if (path === '/login' || path === '/signin') {
      return <Login />;
    }
    if (path === '/signup' || path === '/register') {
      return <SignUp />;
    }
    return (
      <div className="app-main">
        <Navbar />
        <HomePage />
        <Footer />
      </div>
    );
  };

  return (
    <ThemeProvider>
      {renderContent()}
    </ThemeProvider>
  );
}

export default App;
