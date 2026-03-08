import React from 'react';
import { Loader2 } from 'lucide-react';
import './SearchFilters.css';

export interface FilterState {
  city: string;
  commuteTolerance: number;
  trueCostOnly: boolean;
}

interface SearchFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onExecuteSearch?: () => Promise<void>;
  isLoading?: boolean;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({ filters, setFilters, onExecuteSearch, isLoading }) => {
  return (
    <div className="search-filters">
      <h3>Refine Search</h3>

      <div className="filter-group">
        <label>
          City:
          <select 
            value={filters.city} 
            onChange={e => setFilters(prev => ({ ...prev, city: e.target.value }))}
          >
            <option value="All">All Cities</option>
            <option value="Toronto">Toronto</option>
            <option value="Hamilton">Hamilton</option>
            <option value="Guelph">Guelph</option>
            <option value="Ottawa">Ottawa</option>
            <option value="Mississauga">Mississauga</option>
          </select>
        </label>
      </div>

      <div className="filter-group">
        <label>
          Commute Tolerance: {filters.commuteTolerance} mins
          <input 
            type="range" 
            min="0" 
            max="120" 
            step="5" 
            value={filters.commuteTolerance} 
            onChange={e => setFilters(prev => ({ ...prev, commuteTolerance: Number(e.target.value) }))} 
          />
        </label>
      </div>

      <div className="filter-group toggle-group">
        <label className="toggle-label">
          <input 
            type="checkbox" 
            checked={filters.trueCostOnly} 
            onChange={e => setFilters(prev => ({ ...prev, trueCostOnly: e.target.checked }))} 
          />
          Show Only Affordable / Stretch (Hide Unavailable)
        </label>
      </div>

      {onExecuteSearch && (
        <div style={{marginTop: '24px'}}>
          <button 
            className="adb-execute-search-btn"
            onClick={onExecuteSearch}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Searching Live Market...
              </>
            ) : (
              'Scan Live Market'
            )}
          </button>
        </div>
      )}
    </div>
  );
};
