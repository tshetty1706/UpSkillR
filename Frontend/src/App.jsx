import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { StatsSection } from './components/StatsSection';
import { PopularCategories } from './components/PopularCategories';
import { WhyUpSkillr } from './components/WhyUpSkillr';
import { CTASection } from './components/CTASection';
import { Footer } from './components/Footer';

function App() {
  return (
    <ThemeProvider>
      <div className="app-main">
        <Navbar />
        <main>
          <HeroSection />
          <StatsSection />
          <PopularCategories />
          <WhyUpSkillr />
          <CTASection />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
