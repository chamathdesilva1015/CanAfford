import React from 'react';
import './SearchFilters.css';

export interface FilterState {
  city: string;
  commuteTolerance: number;
  trueCostOnly: boolean;
}

interface SearchFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({ filters, setFilters }) => {
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
    </div>
  );
};
