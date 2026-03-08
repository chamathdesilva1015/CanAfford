import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VerifiedListing } from '../services/geminiService';
import type { UserLifestyle } from '../hooks/useBackboard';
import { Scale, Trophy, Bot, X, Trash2, Home } from 'lucide-react';
import './ComparisonView.css';

interface ComparisonViewProps {
  listings: VerifiedListing[];
  budget: number;
  lifestyle: UserLifestyle;
  onClose: () => void;
  trueCosts: Record<string, number>; 
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ listings, budget, lifestyle, onClose, trueCosts }) => {
  const [decisionSummary, setDecisionSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listings || listings.length < 2) return;

    const fetchDecision = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
          throw new Error('VITE_GEMINI_API_KEY is missing or invalid.');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const comparisonData = listings.map(l => ({
          id: l.id,
          address: l.address,
          rent: l.verifiedRent,
          trueCost: trueCosts[l.id] || 'Unknown',
          trustScore: l.trustScore,
          communityNotes: l.communityNotes,
          type: l.type || 'Unknown',
          beds: l.beds || 'Unknown'
        }));

        const prompt = `
          You are a Canadian financial advisor. Evaluate these specific rental properties side-by-side against the user's Lifestyle Profile:
          Budget: $${budget}/mo
          Commute Type: ${lifestyle.commuteType}
          Diet: ${lifestyle.dietaryFocus}
          Work Location: ${lifestyle.workLocation}

          Properties to compare:
          ${JSON.stringify(comparisonData, null, 2)}

          Analyze the trade-offs (e.g. rent vs commute vs trust score). 
          Determine which unit is the definitively better match based STRICTLY on their lifestyle priorities.
          
          Return EXACTLY this JSON format, no markdown wrapping:
          {
            "decisionSummary": "Your succinct, firm recommendation explaining why Unit X wins the head-to-head."
          }
        `;

        const result = await model.generateContent(prompt);
        const rawResponse = result.response.text();
        const jsonString = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
        const data = JSON.parse(jsonString);
        
        setDecisionSummary(data.decisionSummary);
      } catch (err: any) {
        setError(err.message || 'Failed to generate AI Decision.');
      } finally {
        setLoading(false);
      }
    };

    fetchDecision();
  }, [listings.map(l => l.id).join(','), budget, lifestyle, trueCosts]);

  if (!listings || listings.length < 2) return null;

  // Helper: determine best value for highlighting
  const lowestRent = Math.min(...listings.map(l => l.verifiedRent));
  const lowestTrueCost = Math.min(...listings.map(l => trueCosts[l.id] || Infinity));
  const highestTrust = Math.max(...listings.map(l => l.trustScore || 0));

  return (
    <div className="comparison-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="comparison-modal">
        <header className="comparison-header">
          <h2><Scale size={18} style={{display:'inline', marginRight:6}} />AI Comparison Matrix</h2>
          <div className="comparison-header-actions">
            <button className="comparison-clear-btn" onClick={onClose}>
              <Trash2 size={14} /> Clear Comparison
            </button>
            <button className="close-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </header>

        <section className="decision-section">
          {loading ? (
            <div className="decision-loading"><Bot size={15} style={{display:'inline', marginRight:6}} />Parsing Lifestyle Matrix for Final Decision...</div>
          ) : error ? (
            <div className="decision-error">{error}</div>
          ) : (
            <div className="decision-summary">
              <h3><Trophy size={16} style={{display:'inline', marginRight:6}} />AI Decision Summary</h3>
              <p>{decisionSummary}</p>
            </div>
          )}
        </section>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Feature</th>
                {listings.map(l => (
                  <th key={l.id} className="comparison-addr-header">{l.address}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Photo placeholder */}
              <tr>
                <td><strong>Photo</strong></td>
                {listings.map(l => (
                  <td key={l.id}>
                    <div className="comparison-img-placeholder">
                      <Home size={36} strokeWidth={1.2} />
                    </div>
                  </td>
                ))}
              </tr>

              {/* Base Rent */}
              <tr>
                <td><strong>Base Rent</strong></td>
                {listings.map(l => (
                  <td key={l.id} className={l.verifiedRent === lowestRent ? 'compare-best' : ''}>
                    ${l.verifiedRent}/mo
                    {l.verifiedRent === lowestRent && <span className="compare-winner">Best</span>}
                  </td>
                ))}
              </tr>

              {/* True Cost */}
              <tr>
                <td><strong>True Cost</strong></td>
                {listings.map(l => {
                  const tc = trueCosts[l.id];
                  return (
                    <td key={l.id} className={`true-cost-cell ${tc === lowestTrueCost ? 'compare-best' : ''}`}>
                      ${tc || '--'}/mo
                      {tc === lowestTrueCost && <span className="compare-winner">Best</span>}
                    </td>
                  );
                })}
              </tr>

              {/* Property Type */}
              <tr>
                <td><strong>Property Type</strong></td>
                {listings.map(l => (
                  <td key={l.id}>{l.type || l.beds || 'Standard'}</td>
                ))}
              </tr>

              {/* Commute Time (estimated) */}
              <tr>
                <td><strong>Est. Commute</strong></td>
                {listings.map(l => {
                  // Generate a deterministic commute estimate
                  const seedStr = l.lat.toString() + l.lng.toString() + (lifestyle.workLocation || 'Toronto');
                  let hash = 0;
                  for (let i = 0; i < seedStr.length; i++) {
                    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
                  }
                  const baseMinutes = 15 + (Math.abs(hash) % 45);
                  const commute = lifestyle.commuteType === 'Car' ? Math.max(10, Math.round(baseMinutes * 0.6)) : baseMinutes;
                  return (
                    <td key={l.id}>{commute} min ({lifestyle.commuteType})</td>
                  );
                })}
              </tr>

              {/* Trust Score */}
              <tr>
                <td><strong>Trust Score</strong></td>
                {listings.map(l => (
                  <td key={l.id} className={`trust-score score-${l.trustScore > 80 ? 'high' : l.trustScore > 60 ? 'med' : 'low'} ${l.trustScore === highestTrust ? 'compare-best' : ''}`}>
                    {l.trustScore}/100
                    {l.trustScore === highestTrust && <span className="compare-winner">Best</span>}
                  </td>
                ))}
              </tr>

              {/* Budget Status */}
              <tr>
                <td><strong>vs. Budget</strong></td>
                {listings.map(l => {
                  const tc = trueCosts[l.id] || l.verifiedRent;
                  const diff = tc - budget;
                  return (
                    <td key={l.id} className={diff <= 0 ? 'compare-under' : 'compare-over'}>
                      {diff <= 0 ? `$${Math.abs(diff)} under` : `$${diff} over`}
                    </td>
                  );
                })}
              </tr>

              {/* Community Notes */}
              <tr>
                <td><strong>Community Notes</strong></td>
                {listings.map(l => (
                  <td key={l.id} className="notes-list">
                    <ul>
                      {l.communityNotes?.length > 0 
                        ? l.communityNotes.map((note, i) => <li key={i}>{note}</li>)
                        : <li style={{color: '#475569'}}>No notes available</li>
                      }
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
