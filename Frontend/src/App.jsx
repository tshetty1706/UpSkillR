import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar/Navbar';
import { HomePage } from './pages/Home/HomePage';
import { Footer } from './components/common/Footer/Footer';
import SignUp from './components/authentication/signup';
import Login from './components/authentication/login';
import ForgotPassword from './components/authentication/ForgotPassword';
import { InstructorDashboard } from './pages/Instructor/InstructorDashboard';
import { LearnerDashboard } from './pages/Learner/LearnerDashboard';
import { ExploreCourses } from './components/home/ExploreCourses/ExploreCourses';
import { ExploreInstructors } from './components/home/ExploreInstructors/ExploreInstructors';
import { CourseOverviewPage } from './pages/CourseOverview/CourseOverviewPage';
import { CourseLearningPage } from './pages/CourseLearning/CourseLearningPage';
import { CourseWorkspacePage } from './pages/CourseWorkspace/CourseWorkspacePage.jsx';
import { QuizTakingPage } from './pages/QuizTaking/QuizTakingPage.jsx';
import { NotFound } from './components/common/NotFound/NotFound';
import { InstructorApplication } from './components/instructor/application/InstructorApplication';
import { InstructorExploreCourses } from './components/home/InstructorExploreCourses/InstructorExploreCourses';
import { CertificateVerificationPage } from './pages/CertificateVerification/CertificateVerificationPage';
import { isCourseInternalUrl, recordCourseReturnUrl } from './utils/navigationHelper';
import { AnnouncementDetailsView } from './components/learner/trending/AnnouncementDetailsView';
import { getAnnouncementBySlug, MOCK_TRENDING_ANNOUNCEMENTS } from './data/trendingAnnouncements';

function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname + window.location.search);
  // Session-only: do NOT initialize from persistent localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    const sessionStored = sessionStorage.getItem('upskillr_user');
    if (sessionStored) {
      try { return JSON.parse(sessionStored); } catch (e) { return null; }
    }
    return null;
  });
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    // Purge any lingering persistent auth in localStorage
    localStorage.removeItem('upskillr_token');
    localStorage.removeItem('upskillr_user');

    const checkAuthStatus = async () => {
      // 1. Support legacy / direct URL params if present (session-only)
      const urlParams = new URLSearchParams(window.location.search);

      // If an error query parameter is present (e.g. no_account, invalid_oauth_state),
      // strictly clear any stale session tokens and do NOT auto-redirect to dashboard.
      if (urlParams.has('error')) {
        sessionStorage.removeItem('upskillr_token');
        sessionStorage.removeItem('upskillr_user');
        setCurrentUser(null);
        setAuthChecking(false);
        return;
      }

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
          sessionStorage.setItem('upskillr_token', token);
          sessionStorage.setItem('upskillr_user', JSON.stringify(user));
          setCurrentUser(user);
          const targetPath = user.role === 'instructor'
            ? (user.applicationStatus === 'submitted' ? '/instructor/dashboard' : '/instructor/application')
            : '/learner/dashboard';
          window.history.replaceState({}, document.title, targetPath);
          setCurrentPath(targetPath);
          setAuthChecking(false);
          return;
        } catch (e) {
          console.error('Failed to parse user data from OAuth callback URL', e);
        }
      }

      // 2. Validate session via backend /api/auth/me (sends HttpOnly session cookie)
      const sessionToken = sessionStorage.getItem('upskillr_token');
      try {
        const headers = {};
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        const res = await fetch('http://localhost:5000/api/auth/me', {
          headers,
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          sessionStorage.setItem('upskillr_user', JSON.stringify(data.user));
          if (data.token) {
            sessionStorage.setItem('upskillr_token', data.token);
          }
          if (window.location.pathname === '/dashboard' || window.location.pathname === '/login') {
            const targetPath = data.user.role === 'instructor'
              ? (data.user.applicationStatus === 'submitted' ? '/instructor/dashboard' : '/instructor/application')
              : '/learner/dashboard';
            window.history.replaceState({}, document.title, targetPath);
            setCurrentPath(targetPath);
          }
        } else {
          // Unauthenticated in current session -> clear session state
          setCurrentUser(null);
          sessionStorage.removeItem('upskillr_user');
          sessionStorage.removeItem('upskillr_token');
        }
      } catch (err) {
        // Backend not reachable or network error
        setCurrentUser(null);
        sessionStorage.removeItem('upskillr_user');
        sessionStorage.removeItem('upskillr_token');
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuthStatus();

    const handlePopState = () => {
      setCurrentPath(window.location.pathname + window.location.search);
    };

    // Custom event listener for seamless internal SPA navigation
    const handleNavigate = (e) => {
      const nextPath = e?.detail?.path || (window.location.pathname + window.location.search);
      
      // Auto-record return URL when transitioning from an outside view into a course or workspace
      try {
        const isTargetCourse = isCourseInternalUrl(nextPath);
        const currentUrl = window.location.pathname + window.location.search;
        const isCurrentCourse = isCourseInternalUrl(currentUrl);
        if (isTargetCourse && !isCurrentCourse) {
          recordCourseReturnUrl(currentUrl);
        }
      } catch (err) {}

      setCurrentPath(nextPath);
      const stored = sessionStorage.getItem('upskillr_user');
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
      const stored = sessionStorage.getItem('upskillr_user');
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
    sessionStorage.removeItem('upskillr_token');
    sessionStorage.removeItem('upskillr_user');
    localStorage.removeItem('upskillr_token');
    localStorage.removeItem('upskillr_user');
    setCurrentUser(null);
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/' } }));
  };

  const renderContent = () => {
    const rawPath = (currentPath || '').toLowerCase();
    const path = rawPath.split('?')[0].split('#')[0];

    // 0. General Dashboard Route
    if (path === '/dashboard') {
      if (currentUser) {
        const targetPath = currentUser.role === 'instructor'
          ? (currentUser.applicationStatus === 'submitted' ? '/instructor/dashboard' : '/instructor/application')
          : '/learner/dashboard';
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
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', color: 'var(--brand-primary)', fontWeight: 600 }}>
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
          : '/learner/dashboard';
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
          : '/learner/dashboard';
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
    if (path === '/forgot-password' || path === '/reset-password') {
      if (currentUser) {
        const targetPath = currentUser.role === 'instructor'
          ? (currentUser.applicationStatus === 'submitted' ? '/instructor/dashboard' : '/instructor/application')
          : '/learner/dashboard';
        if (currentPath !== targetPath) {
          window.history.replaceState({}, '', targetPath);
        }
        return currentUser.role === 'instructor' ? (
          <InstructorDashboard user={currentUser} onLogout={handleLogout} />
        ) : (
          <LearnerDashboard user={currentUser} />
        );
      }
      return <ForgotPassword />;
    }
    // 2. Protected Role-based Routing
    if (path.startsWith('/instructor/') || path === '/instructor') {
      if (!currentUser) {
        if (authChecking) {
          return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', color: 'var(--brand-primary)', fontWeight: 600 }}>
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
    if (path.startsWith('/learner/') || path === '/learner' || (currentUser?.role === 'learner' && (path === '/profile' || path === '/settings'))) {
      if (path === '/profile') window.history.replaceState({}, '', '/learner/profile');
      if (path === '/settings') window.history.replaceState({}, '', '/learner/settings');
      if (path === '/learner') window.history.replaceState({}, '', '/learner/dashboard');
      if (!currentUser) {
        if (authChecking) {
          return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', color: 'var(--brand-primary)', fontWeight: 600 }}>
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

    // Public / Learner Trending Announcement Details Route: /trending/:slug or /learner/trending/:slug
    const trendingSlugMatch = currentPath.match(/^\/(?:learner\/)?trending\/([^/?#]+)/i);
    if (trendingSlugMatch) {
      const slug = trendingSlugMatch[1];
      if (currentUser?.role === 'learner') {
        const targetPath = `/learner/trending/${slug}`;
        if (currentPath !== targetPath) {
          window.history.replaceState({}, '', targetPath);
        }
        return <LearnerDashboard user={currentUser} />;
      }
      const ann = getAnnouncementBySlug(slug) || MOCK_TRENDING_ANNOUNCEMENTS[0];
      return (
        <div className="app-main">
          <Navbar user={currentUser} />
          <div style={{ padding: '32px 16px', minHeight: 'calc(100vh - 160px)' }}>
            <AnnouncementDetailsView
              announcement={ann}
              onBack={() => {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/' } }));
              }}
              onSelectAnnouncement={(a) => {
                const p = `/trending/${a.slug}`;
                window.history.pushState({}, '', p);
                window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: p } }));
              }}
              onExploreCourses={() => {
                window.history.pushState({}, '', '/explore');
                window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/explore' } }));
              }}
            />
          </div>
          <Footer />
        </div>
      );
    }

    // 3. Public Routing
    const instructorExploreMatch = currentPath.match(/^\/(?:explore-courses|explore)\/instructor\/([^/?#]+)/i);
    if (instructorExploreMatch) {
      const instructorId = instructorExploreMatch[1];
      return (
        <div className="app-main">
          <Navbar user={currentUser} />
          <InstructorExploreCourses instructorId={instructorId} user={currentUser} />
          <Footer />
        </div>
      );
    }

    // Public Certificate Verification Route: /verify-certificate/:certificateId or /verify/:certificateId
    const certVerifyMatch = currentPath.match(/^\/(?:verify-certificate|verify)(?:\/([^/?#]+))?/i);
    if (certVerifyMatch) {
      const certificateId = certVerifyMatch[1] || '';
      return (
        <div className="app-main">
          <Navbar user={currentUser} />
          <CertificateVerificationPage certificateId={certificateId} user={currentUser} />
          <Footer />
        </div>
      );
    }

    if (path === '/instructors') {
      return (
        <div className="app-main">
          <Navbar user={currentUser} />
          <ExploreInstructors />
          <Footer />
        </div>
      );
    }
    
    // Dedicated Standalone Distraction-Free Quiz Taking Page
    const quizAttemptMatch = currentPath.match(/^\/quiz\/([^/?#]+)\/([^/?#]+)\/attempt\/([^/?#]+)/i);
    if (quizAttemptMatch) {
      const courseId = quizAttemptMatch[1];
      const quizId = quizAttemptMatch[2];
      const attemptId = quizAttemptMatch[3];
      if (!currentUser) {
        if (authChecking) {
          return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', color: 'var(--brand-primary)', fontWeight: 600 }}>
              <div>Loading quiz attempt...</div>
            </div>
          );
        }
        sessionStorage.setItem('upskillr_redirect_after_login', currentPath);
        return <Login />;
      }
      return <QuizTakingPage courseId={courseId} quizId={quizId} attemptId={attemptId} user={currentUser} />;
    }

    // Dedicated Course Learning Workspace: /learn/:courseId (3-Panel Focused Workspace)
    const courseLearnMatch = currentPath.match(/^\/learn\/([^/?#]+)/i);
    if (courseLearnMatch) {
      const courseId = courseLearnMatch[1];
      if (!currentUser) {
        if (authChecking) {
          return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', color: 'var(--brand-primary)', fontWeight: 600 }}>
              <div>Loading learning workspace...</div>
            </div>
          );
        }
        sessionStorage.setItem('upskillr_redirect_after_login', `/learn/${courseId}`);
        return <Login />;
      }
      return <CourseWorkspacePage courseId={courseId} user={currentUser} />;
    }

    // Course Overview Route: /courses/:courseId or /course/:courseId
    const courseOverviewMatch = currentPath.match(/^\/(?:courses|course)\/([^/?#]+)/i);
    if (courseOverviewMatch) {
      const courseId = courseOverviewMatch[1];
      return (
        <div className="app-main">
          <Navbar user={currentUser} />
          <CourseLearningPage courseId={courseId} user={currentUser} />
          {currentUser?.role !== 'learner' && <Footer />}
        </div>
      );
    }

    if (path === '/explore' || path === '/courses') {
      return (
        <div className="app-main">
          <Navbar user={currentUser} />
          <ExploreCourses />
          <Footer />
        </div>
      );
    }
    if (path === '/') {
      return (
        <div className="app-main">
          <Navbar user={currentUser} />
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
