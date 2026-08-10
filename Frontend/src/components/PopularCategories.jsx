import React from 'react';
import { Code, Database, Palette, BarChart3, Megaphone, UserRound } from 'lucide-react';
import './PopularCategories.css';

export const PopularCategories = () => {
  const categories = [
    {
      id: 1,
      name: 'Development',
      courses: '1,250 Courses',
      icon: <Code size={32} />
    },
    {
      id: 2,
      name: 'Data Science',
      courses: '850 Courses',
      icon: <Database size={32} />
    },
    {
      id: 3,
      name: 'Design',
      courses: '980 Courses',
      icon: <Palette size={32} />
    },
    {
      id: 4,
      name: 'Business',
      courses: '760 Courses',
      icon: <BarChart3 size={32} />
    },
    {
      id: 5,
      name: 'Marketing',
      courses: '620 Courses',
      icon: <Megaphone size={32} />
    },
    {
      id: 6,
      name: 'Personal Growth',
      courses: '540 Courses',
      icon: <UserRound size={32} />
    }
  ];

  return (
    <section className="categories-section section">
      <div className="container">
        <div className="section-header text-center">
          <h2 className="section-title">Popular Categories</h2>
          <p className="section-subtitle">Explore top skills and start learning today</p>
        </div>

        <div className="categories-grid">
          {categories.map((cat) => (
            <div key={cat.id} className="category-card">
              <div className="category-icon-wrapper">
                {cat.icon}
              </div>
              <h3 className="category-name">{cat.name}</h3>
              <span className="category-courses">{cat.courses}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
