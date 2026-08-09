import React, { useState, useEffect } from 'react';
import SignUp from './authentication/signup';
import Login from './authentication/login';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="app-container">
      {currentPath === '/login' ? <Login /> : <SignUp />}
    </div>
  );
}

export default App;
