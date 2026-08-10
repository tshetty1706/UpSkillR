import React from 'react';
import { User, GraduationCap, BookOpen, LayoutGrid } from 'lucide-react';
import './StatsSection.css';

export const StatsSection = () => {
  const stats = [
    {
      id: 1,
      icon: <User size={28} className="stat-icon" aria-hidden="true" />,
      value: '84,000+',
      label: 'Active Learners'
    },
    {
      id: 2,
      icon: <GraduationCap size={28} className="stat-icon" aria-hidden="true" />,
      value: '1,200+',
      label: 'Expert Instructors'
    },
    {
      id: 3,
      icon: <BookOpen size={28} className="stat-icon" aria-hidden="true" />,
      value: '3,500+',
      label: 'Courses Available'
    },
    {
      id: 4,
      icon: <LayoutGrid size={28} className="stat-icon" aria-hidden="true" />,
      value: '50+',
      label: 'Skill Categories'
    }
  ];

  return (
    <section className="stats-section" aria-label="Key Platform Statistics">
      <div className="container">
        <div className="stats-bar">
          {stats.map((stat) => (
            <div key={stat.id} className="stat-item">
              <div className="stat-icon-wrapper">
                {stat.icon}
              </div>
              <div className="stat-info">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
