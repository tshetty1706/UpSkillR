import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/common/Navbar/Navbar';
import { HomePage } from './pages/Home/HomePage';
import { Footer } from './components/common/Footer/Footer';

function App() {
  return (
    <ThemeProvider>
      <div className="app-main">
        <Navbar />
        <HomePage />
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
