import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Loader2, Clock } from 'lucide-react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
}

const STATUS_MESSAGES = [
  "Scanning live rental markets...",
  "Grounding data with Google Search...",
  "Extracting 2026 economic indicators...",
  "Calculating transit and grocery costs...",
  "Verifying listing authenticity...",
  "Synthesizing AI survival tips...",
  "Finalizing market analysis..."
];

export const LoadingScreen: React.FC<LoadingScreenProps> = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  useEffect(() => {
    // Cycle through messages
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2500);

    // Progress bar simulation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return prev;
        // Slow down as it gets closer to 100
        const increment = prev < 60 ? 1.5 : prev < 85 ? 0.5 : 0.1;
        return Math.min(prev + increment, 99);
      });
    }, 150);

    // Countdown simulation
    const timerInterval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 2) return 2; // Stay at 2s if it takes longer
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
      clearInterval(timerInterval);
    };
  }, []);

  return (
    <div className="loading-screen-container">
      <div className="loading-content-card">
        <div className="loading-visual">
          <div className="glow-pulse"></div>
          <div className="icon-stack">
            <Search className="icon-main" size={40} />
            <Sparkles className="icon-sparkle" size={20} />
          </div>
        </div>

        <h2 className="loading-title">CanAfford AI</h2>
        <p className="loading-message">{STATUS_MESSAGES[messageIndex]}</p>

        <div className="progress-track">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="loading-meta">
          <div className="etc-info">
            <Clock size={14} />
            <span>Estimated: {secondsRemaining}s remaining</span>
          </div>
          <div className="loading-spinner-wrap">
            <Loader2 className="spinner-icon" size={14} />
            <span>Processing</span>
          </div>
        </div>
      </div>
      
      <div className="loading-background-elements">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
      </div>
    </div>
  );
};
