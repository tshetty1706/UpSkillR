import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './FAQSection.css';

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: 'Is UpSkillr free to start?',
      answer: 'Yes! UpSkillr offers free access to introductory courses and preview lessons across all categories so you can start learning without any upfront commitment.'
    },
    {
      question: 'Do I get a recognized certificate upon course completion?',
      answer: 'Yes! Upon completing all lessons, projects, and assessments in a course, you receive a shareable digital certificate to showcase on your resume and LinkedIn.'
    },
    {
      question: 'Can I become an instructor and teach on UpSkillr?',
      answer: 'Absolutely! We welcome industry professionals and passionate educators. Click "Teach on UpSkillr" in the navigation bar to apply and start building your course.'
    },
    {
      question: 'What if I miss a live lesson or assignment deadline?',
      answer: 'No worries! All UpSkillr courses feature lifetime access to recorded video sessions, resources, and flexible self-paced project submissions.'
    },
    {
      question: 'Are there any prerequisites before enrolling in a course?',
      answer: 'Most of our foundational courses require zero prior experience. Intermediate and advanced courses clearly specify any recommended background knowledge on their overview page.'
    }
  ];

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="faq-section section" aria-label="Frequently Asked Questions">
      <div className="container">
        <div className="section-header text-center">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">Everything you need to know about learning and teaching on UpSkillr</p>
        </div>

        <div className="faq-accordion-list">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className={`faq-item ${isOpen ? 'active' : ''}`}>
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => toggleAccordion(index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="faq-question-text">{faq.question}</span>
                  <ChevronDown size={20} className={`faq-chevron ${isOpen ? 'rotate' : ''}`} aria-hidden="true" />
                </button>

                <div 
                  id={`faq-answer-${index}`} 
                  className="faq-answer-wrapper"
                  role="region"
                  aria-hidden={!isOpen}
                >
                  <p className="faq-answer-text">{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
