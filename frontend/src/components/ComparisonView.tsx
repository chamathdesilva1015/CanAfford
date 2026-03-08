import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VerifiedListing } from '../services/geminiService';
import type { UserLifestyle } from '../hooks/useBackboard';
import { cld } from '../cloudinary/config';
import { AdvancedImage, placeholder, lazyload } from '@cloudinary/react';
import { Scale, Trophy, Bot } from 'lucide-react';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { format, quality } from '@cloudinary/url-gen/actions/delivery';
import { auto } from '@cloudinary/url-gen/qualifiers/format';
import { auto as autoQuality } from '@cloudinary/url-gen/qualifiers/quality';
import './ComparisonView.css';

interface ComparisonViewProps {
  listings: VerifiedListing[];
  budget: number;
  lifestyle: UserLifestyle;
  onClose: () => void;
  // External True Cost calculations from standard engine
  trueCosts: Record<string, number>; 
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ listings, budget, lifestyle, onClose, trueCosts }) => {
  const [decisionSummary, setDecisionSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDecision = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
          throw new Error('VITE_GEMINI_API_KEY is missing or invalid.');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const comparisonData = listings?.map(l => ({
          id: l.id,
          address: l.address,
          rent: l.verifiedRent,
          trueCost: trueCosts[l.id] || 'Unknown',
          trustScore: l.trustScore,
          communityNotes: l.communityNotes
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
  }, [listings?.map(l => l.id).join(','), budget, lifestyle, trueCosts]);

  return (
    <div className="comparison-overlay">
      <div className="comparison-modal">
        <header className="comparison-header">
          <h2><Scale size={18} style={{display:'inline', marginRight:6}} />AI Comparison Studio</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
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
                {listings?.map(l => (
                  <th key={l.id}>{l.address}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Photo</strong></td>
                {listings?.map(l => {
                  const displayImage = cld
                    .image(l.imageId)
                    .resize(fill().width(200).height(120))
                    .delivery(format(auto()))
                    .delivery(quality(autoQuality()));
                  return (
                    <td key={l.id}>
                       <AdvancedImage
                          cldImg={displayImage}
                          plugins={[placeholder({ mode: 'blur' }), lazyload()]}
                          alt={l.address}
                          className="comparison-img"
                        />
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td><strong>Base Rent</strong></td>
                {listings?.map(l => (
                  <td key={l.id}>${l.verifiedRent}/mo</td>
                ))}
              </tr>
              <tr>
                <td><strong>True Cost</strong></td>
                {listings?.map(l => (
                  <td key={l.id} className="true-cost-cell">
                    ${trueCosts[l.id] || '--'}/mo
                  </td>
                ))}
              </tr>
                <td><strong>Regional Analysis</strong></td>
                {listings?.map(l => (
                  <td key={l.id}>Strict Audit</td>
                ))}
              <tr>
                <td><strong>Trust Score</strong></td>
                {listings?.map(l => (
                  <td key={l.id} className={`trust-score score-${l.trustScore > 80 ? 'high' : l.trustScore > 60 ? 'med' : 'low'}`}>
                    {l.trustScore}/100
                  </td>
                ))}
              </tr>
              <tr>
                <td><strong>Community Notes</strong></td>
                {listings?.map(l => (
                  <td key={l.id} className="notes-list">
                    <ul>
                      {l.communityNotes?.map((note, i) => <li key={i}>{note}</li>)}
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
