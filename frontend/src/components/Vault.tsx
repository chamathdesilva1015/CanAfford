import React from 'react';
import { Lock, CheckCircle } from 'lucide-react';
import './Vault.css';

interface VaultProps {
  vaultStatus: Record<string, boolean>;
  onToggleDoc: (docId: string) => void;
}

const REQUIRED_DOCS = [
  { id: 'credit', label: 'Credit Report (Equifax/TransUnion)' },
  { id: 'employment', label: 'Letter of Employment' },
  { id: 'paystubs', label: 'Recent Pay Stubs (Last 3)' },
  { id: 'references', label: 'Past Landlord References' },
  { id: 'id', label: 'Government Photo ID' }
];

export const Vault: React.FC<VaultProps> = ({ vaultStatus, onToggleDoc }) => {
  const completedCount = REQUIRED_DOCS.filter(doc => vaultStatus[doc.id]).length;
  const progressPercent = Math.round((completedCount / REQUIRED_DOCS.length) * 100);

  return (
    <div className={`application-vault pro-theme`}>
      <header className="vault-header">
        <h3 className="text-slate-900"><Lock size={15} style={{display:'inline', marginRight:6}} />Application Vault</h3>
        <div className="vault-progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="progress-text">{progressPercent}% Ready</span>
      </header>
      
      <p className="vault-desc">Mandatory documents required for standard Ontario leases.</p>
      
      <div className="vault-checklist">
        {REQUIRED_DOCS.map(doc => (
          <label 
            key={doc.id} 
            className={`vault-item ${vaultStatus[doc.id] ? 'completed' : ''}`}
          >
            <input 
              type="checkbox" 
              checked={!!vaultStatus[doc.id]}
              onChange={() => onToggleDoc(doc.id)}
            />
            <span className="doc-label">{doc.label}</span>
            {vaultStatus[doc.id] && <span className="doc-check"><CheckCircle size={13} style={{display:'inline', marginRight:3}} />Secured</span>}
          </label>
        ))}
      </div>
    </div>
  );
};
