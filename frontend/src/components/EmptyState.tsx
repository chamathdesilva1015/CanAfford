import React from 'react';
import { Inbox } from 'lucide-react';
import './EmptyState.css';

interface EmptyStateProps {
  message?: string;
  subMessage?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  message = "No listings match your strict survival criteria.", 
  subMessage = "Try expanding your commute tolerance, adjusting your budget, or viewing other cities." 
}) => {
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon"><Inbox size={48} strokeWidth={1.5} /></div>
      <h3>{message}</h3>
      <p>{subMessage}</p>
    </div>
  );
};
