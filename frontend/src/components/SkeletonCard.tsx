import React from 'react';
import './SkeletonCard.css';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-image pulse"></div>
      <div className="skeleton-content">
        <div className="skeleton-row top-row pulse"></div>
        <div className="skeleton-row title-row pulse"></div>
        <div className="skeleton-buttons">
          <div className="skeleton-btn pulse"></div>
        </div>
      </div>
    </div>
  );
};
