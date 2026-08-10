import React from 'react';
import { HeroSection } from '../../components/home/Hero/HeroSection';
import { StatsSection } from '../../components/home/Stats/StatsSection';
import { TrustedBy } from '../../components/home/TrustedBy/TrustedBy';
import { PopularCategories } from '../../components/home/PopularCategories/PopularCategories';
import { LearnerInstructor } from '../../components/home/LearnerInstructor/LearnerInstructor';
import { WhyUpSkillr } from '../../components/home/WhyUpSkillr/WhyUpSkillr';
import { FAQSection } from '../../components/home/FAQ/FAQSection';
import { CTASection } from '../../components/home/CTA/CTASection';

export const HomePage = () => {
  return (
    <main>
      <HeroSection />
      <StatsSection />
      <TrustedBy />
      <PopularCategories />
      <LearnerInstructor />
      <WhyUpSkillr />
      <FAQSection />
      <CTASection />
    </main>
  );
};

export default HomePage;
