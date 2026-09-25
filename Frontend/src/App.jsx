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
import { ExploreCourses } from './components/home/ExploreCourses/ExploreCourses';
import { ExploreInstructors } from './components/home/ExploreInstructors/ExploreInstructors';
import { CourseOverviewPage } from './pages/CourseOverview/CourseOverviewPage';
import { NotFound } from './components/common/NotFound/NotFound';
import { InstructorApplication } from './components/instructor/application/InstructorApplication';
import { InstructorExploreCourses } from './components/home/InstructorExploreCourses/InstructorExploreCourses';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('upskillr_user');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { return null; }
    }
    return null;
  });
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      // 1. Support legacy / direct URL params if present
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const userParam = urlParams.get('user');

      if (token && userParam) {
        try {
          let user;
          try {
            user = JSON.parse(decodeURIComponent(userParam));
          } catch (e1) {
            user = JSON.parse(userParam);
          }
          localStorage.setItem('upskillr_token', token);
          localStorage.setItem('upskillr_user', JSON.stringify(user));
          setCurrentUser(user);
          const targetPath = user.role === 'instructor'
            ? (user.applicationStatus === 'submitted' ? '/instructor/dashboard' : '/instructor/application')
            : '/learner';
          window.history.replaceState({}, document.title, targetPath);
          setCurrentPath(targetPath);
          setAuthChecking(false);
          return;
        } catch (e) {
          console.error('Failed to parse user data from OAuth callback URL', e);
        }
      }

      // 2. Obtain authenticated user through the existing /me profile API
      const storedToken = localStorage.getItem('upskillr_token');
      try {
        const headers = {};
        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }
        const res = await fetch('http://localhost:5000/api/auth/me', {
          headers,
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('upskillr_user', JSON.stringify(data.user));
          if (data.token) {
            localStorage.setItem('upskillr_token', data.token);
          }
          if (window.location.pathname === '/dashboard' || window.location.pathname === '/login') {
            const targetPath = data.user.role === 'instructor'
              ? (data.user.applicationStatus === 'submitted' ? '/instructor/dashboard' : '/instructor/application')
              : '/learner';
            window.history.replaceState({}, document.title, targetPath);
            setCurrentPath(targetPath);
          }
        } else {
          if (!storedToken) {
            setCurrentUser(null);
            localStorage.removeItem('upskillr_user');
          }
        }
      } catch (err) {
        // Backend not reachable or network error
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuthStatus();

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
        } catch (e) { }
      } else {
        setCurrentUser(null);
      }
    };

    // Custom event listener for when the user profile or avatar is updated
    const handleUserUpdate = () => {
      const stored = localStorage.getItem('upskillr_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch (e) { }
      } else {
        setCurrentUser(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('upskillr_navigate', handleNavigate);
    window.addEventListener('upskillr_user_updated', handleUserUpdate);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('upskillr_navigate', handleNavigate);
      window.removeEventListener('upskillr_user_updated', handleUserUpdate);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) { }
    localStorage.removeItem('upskillr_token');
    localStorage.removeItem('upskillr_user');
    setCurrentUser(null);
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/' } }));
  };

  const renderContent = () => {
    const path = currentPath.toLowerCase();

    // 0. General Dashboard Route
    if (path === '/dashboard') {
      if (currentUser) {
        const targetPath = currentUser.role === 'instructor'
          ? (currentUser.applicationStatus === 'submitted' ? '/instructor/dashboard' : '/instructor/application')
          : '/learner';
        if (currentPath !== targetPath) {
          window.history.replaceState({}, '', targetPath);
        }
        return currentUser.role === 'instructor' ? (
          <InstructorDashboard user={currentUser} onLogout={handleLogout} />
        ) : (
          <LearnerDashboard user={currentUser} />
        );
      }
      if (authChecking) {
        return (
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0f172a)', color: '#6366f1', fontWeight: 600 }}>
            <div>Loading dashboard...</div>
          </div>
        );
      }
      return <Login />;
    }

    // 1. Auth Routing
    if (path === '/login' || path === '/signin') {
      if (currentUser) {
        const targetPath = currentUser.role === 'instructor'
          ? (currentUser.applicationStatus === 'submitted' ? '/instructor/dashboard' : '/instructor/application')
          : '/learner';
        if (currentPath !== targetPath) {
          window.history.replaceState({}, '', targetPath);
        }
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
        const targetPath = currentUser.role === 'instructor'
          ? (currentUser.applicationStatus === 'submitted' ? '/instructor/dashboard' : '/instructor/application')
          : '/learner';
        if (currentPath !== targetPath) {
          window.history.replaceState({}, '', targetPath);
        }
        return currentUser.role === 'instructor' ? (
          <InstructorDashboard user={currentUser} onLogout={handleLogout} />
        ) : (
          <LearnerDashboard user={currentUser} />
        );
      }
      return <SignUp />;
    }
    // 2. Protected Role-based Routing
    if (path.startsWith('/instructor/') || path === '/instructor') {
      if (!currentUser) {
        if (authChecking) {
          return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0f172a)', color: '#6366f1', fontWeight: 600 }}>
              <div>Loading dashboard...</div>
            </div>
          );
        }
        return <Login />;
      }
      if (currentUser.role !== 'instructor') {
        return <NotFound />;
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
        return <InstructorDashboard user={currentUser} onLogout={handleLogout} />;
      }

      return <InstructorDashboard user={currentUser} onLogout={handleLogout} />;
    }
    if (path.startsWith('/learner/') || path === '/learner') {
      if (!currentUser) {
        if (authChecking) {
          return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0f172a)', color: '#6366f1', fontWeight: 600 }}>
              <div>Loading dashboard...</div>
            </div>
          );
        }
        return <Login />;
      }
      if (currentUser.role !== 'learner') {
        return <NotFound />;
      }
      return <LearnerDashboard user={currentUser} />;
    }

    // 3. Public Routing
    const instructorExploreMatch = currentPath.match(/^\/(?:explore-courses|explore)\/instructor\/([^/?#]+)/i);
    if (instructorExploreMatch) {
      const instructorId = instructorExploreMatch[1];
      return (
        <div className="app-main">
          <Navbar />
          <InstructorExploreCourses instructorId={instructorId} user={currentUser} />
          <Footer />
        </div>
      );
    }

    if (path === '/instructors') {
      return (
        <div className="app-main">
          <Navbar />
          <ExploreInstructors />
          <Footer />
        </div>
      );
    }
    // Course Overview Route: /courses/:courseId or /course/:courseId
    const courseOverviewMatch = currentPath.match(/^\/(?:courses|course)\/([^/?#]+)/i);
    if (courseOverviewMatch) {
      const courseId = courseOverviewMatch[1];
      return (
        <div className="app-main">
          <Navbar />
          <CourseOverviewPage courseId={courseId} user={currentUser} />
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
