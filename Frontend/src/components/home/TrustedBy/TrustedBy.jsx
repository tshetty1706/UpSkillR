import React from 'react';
import './TrustedBy.css';

export const TrustedBy = () => {
  const partners = [
    { name: 'TechCorp', symbol: '❖ TechCorp' },
    { name: 'SkillLab', symbol: '⬡ SkillLab' },
    { name: 'EduPulse', symbol: '◈ EduPulse' },
    { name: 'AcademyX', symbol: '▲ AcademyX' },
    { name: 'DevStudio', symbol: '⬢ DevStudio' },
    { name: 'CloudScale', symbol: '☁ CloudScale' }
  ];

  return (
    <section className="trusted-section" aria-label="Trusted by top organizations">
      <div className="container">
        <p className="trusted-label">Trusted by learners from</p>
        <div className="trusted-logos-row">
          {partners.map((partner, index) => (
            <div key={index} className="partner-logo-item" title={partner.name}>
              <span className="partner-logo-text">{partner.symbol}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
