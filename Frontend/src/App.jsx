import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/common/Navbar/Navbar';
import { HomePage } from './pages/Home/HomePage';
import { Footer } from './components/common/Footer/Footer';
import SignUp from './components/authentication/signup';
import Login from './components/authentication/login';
import { InstructorLayout } from './components/instructor/InstructorLayout';
import { InstructorApplication } from './components/instructor/application/InstructorApplication';
import { LearnerDashboard } from './components/learner/LearnerDashboard';
import { ExploreCourses } from './components/learner/ExploreCourses';

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
    setCurrentPath('/');
  };

  const renderContent = () => {
    const path = currentPath.toLowerCase();

    if (path === '/login' || path === '/signin') {
      return <Login />;
    }
    if (path === '/signup' || path === '/register') {
      return <SignUp />;
    }
    if (path.startsWith('/instructor')) {
      if (!currentUser || currentUser.role !== 'instructor') {
        return <Login />;
      }

      const appStatus = currentUser.applicationStatus || 'not_started';
      const isApplicationPath = path.startsWith('/instructor/application');

      // Application not submitted -> Force /instructor/application
      if (appStatus !== 'submitted') {
        if (!isApplicationPath) {
          window.history.replaceState({}, '', '/instructor/application');
        }
        return <InstructorApplication user={currentUser} onLogout={handleLogout} />;
      }

      // Application submitted -> Force /instructor/dashboard if attempting /instructor/application
      if (isApplicationPath && appStatus === 'submitted') {
        window.history.replaceState({}, '', '/instructor/dashboard');
        return <InstructorLayout user={currentUser} onLogout={handleLogout} />;
      }

      return <InstructorLayout user={currentUser} onLogout={handleLogout} />;
    }
    if (path.startsWith('/learner')) {
      return <LearnerDashboard user={currentUser} />;
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
