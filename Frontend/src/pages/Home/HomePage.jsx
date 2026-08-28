import React from 'react';
import { HeroSection } from '../../components/home/Hero/HeroSection';
import { StatsSection } from '../../components/home/Stats/StatsSection';
import { PopularCategories } from '../../components/home/PopularCategories/PopularCategories';
import { WhyUpSkillr } from '../../components/home/WhyUpSkillr/WhyUpSkillr';
import { FAQSection } from '../../components/home/FAQ/FAQSection';
import { CTASection } from '../../components/home/CTA/CTASection';

export const HomePage = () => {
  return (
    <main>
      <HeroSection />
      <StatsSection />
      <PopularCategories />
      <WhyUpSkillr />
      <FAQSection />
      <CTASection />
    </main>
  );
};

export default HomePage;
