import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar/Navbar';
import { HomePage } from './pages/Home/HomePage';
import { Footer } from './components/common/Footer/Footer';
import SignUp from './components/authentication/signup';
import Login from './components/authentication/login';
import { InstructorDashboard } from './pages/Instructor/InstructorDashboard';
import { LearnerDashboard } from './pages/Learner/LearnerDashboard';
import { ExploreCourses } from './components/learner/courses/ExploreCourses/ExploreCourses';
import { ExploreInstructors } from './components/learner/instructors/ExploreInstructors/ExploreInstructors';
import { NotFound } from './components/common/NotFound/NotFound';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentUser, setCurrentUser] = useState(null);

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
        setCurrentUser(user);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('Failed to parse user data from OAuth callback URL');
      }
    } else {
      const stored = localStorage.getItem('upskillr_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch (e) {}
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
      const stored = localStorage.getItem('upskillr_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch (e) {}
      } else {
        setCurrentUser(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('upskillr_navigate', handleNavigate);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('upskillr_navigate', handleNavigate);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('upskillr_token');
    localStorage.removeItem('upskillr_user');
    setCurrentUser(null);
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/' } }));
  };

  const renderContent = () => {
    const path = currentPath.toLowerCase();

    // 1. Auth Routing
    if (path === '/login' || path === '/signin') {
      if (currentUser) {
        return currentUser.role === 'instructor' ? (
          <InstructorDashboard user={currentUser} onLogout={handleLogout} />
        ) : (
          <LearnerDashboard user={currentUser} />
        );
      }
      return <Login />;
    }
    if (path === '/signup' || path === '/register') {
      if (currentUser) {
        return currentUser.role === 'instructor' ? (
          <InstructorDashboard user={currentUser} onLogout={handleLogout} />
        ) : (
          <LearnerDashboard user={currentUser} />
        );
      }
      return <SignUp />;
    }

    // 2. Protected Role-based Routing
    if (path.startsWith('/instructor')) {
      if (!currentUser) {
        return <Login />;
      }
      if (currentUser.role !== 'instructor') {
        return <NotFound />;
      }
      return <InstructorDashboard user={currentUser} onLogout={handleLogout} />;
    }
    if (path.startsWith('/learner')) {
      if (!currentUser) {
        return <Login />;
      }
      if (currentUser.role !== 'learner') {
        return <NotFound />;
      }
      return <LearnerDashboard user={currentUser} />;
    }

    // 3. Public Routing
    if (path === '/instructors') {
      return (
        <div className="app-main">
          <Navbar />
          <ExploreInstructors />
          <Footer />
        </div>
      );
    }
    if (path === '/explore' || path === '/courses') {
      return (
        <div className="app-main">
          <Navbar />
          <ExploreCourses />
          <Footer />
        </div>
      );
    }
    if (path === '/') {
      return (
        <div className="app-main">
          <Navbar />
          <HomePage />
          <Footer />
        </div>
      );
    }

    // 4. Fallback 404
    return <NotFound />;
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        {renderContent()}
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
