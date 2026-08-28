import React from 'react';
import './InstructorLayout.css';

export const InstructorLayout = ({ sidebar, loading, children }) => {
  return (
    <div className="instructor-studio-layout">
      <div className="instructor-studio-body">
        {/* Left Collapsible/Responsive Sidebar */}
        {sidebar}

        {/* Main Content Workspace */}
        <main className="instructor-main-workspace">
          <div className="container workspace-container">
            {loading ? (
              <div className="loading-workspace-spinner">
                <span>Loading Instructor Studio...</span>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
