// src/components/quiz/QuizFilter.tsx
import React, { useState } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';
import Button from '../ui/Button';
import { QuizFilter as QuizFilterType } from '../../types';

interface QuizFilterProps {
  onFilterChange: (filter: QuizFilterType) => void;
  // Optional: Add a prop to hide certain filters if this component is reused in different contexts
  hideVisibilityFilter?: boolean;
  hideCreatedByFilter?: boolean;
}

const categories = [
  'All Categories', 'Football', 'Basketball', 'Tennis',
  'Formula 1', 'Cricket', 'Golf', 'Rugby'
];

const countries = [
  'All Countries', 'United States', 'United Kingdom', 'Spain',
  'Germany', 'France', 'Italy', 'Brazil', 'Argentina'
];

const events = [
  'All Events', 'FIFA World Cup', 'Champions League', 'Olympics',
  'NBA Finals', 'Super Bowl', 'Wimbledon', 'Grand Prix'
];

const difficulties = ['All Difficulties', 'easy', 'medium', 'hard'];

const QuizFilter: React.FC<QuizFilterProps> = ({ onFilterChange, hideVisibilityFilter, hideCreatedByFilter }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<QuizFilterType>({});

  const handleFilterChange = (
    key: keyof QuizFilterType,
    value: string
  ) => {
    const updatedFilter = { ...filter }; // No need to cast here initially

    if (value.startsWith('All')) {
      delete updatedFilter[key];
    } else {
      // ⭐ Refined type handling for specific keys ⭐
      if (key === 'difficulty') {
        updatedFilter[key] = value as 'easy' | 'medium' | 'hard';
      } else if (key === 'visibility') {
        // This 'if' block would only be relevant if 'visibility' filter was exposed
        updatedFilter[key] = value as 'global' | 'private';
      } else if (key === 'createdBy') {
        // This 'if' block would only be relevant if 'createdBy' filter was exposed
        updatedFilter[key] = value;
      }
      else {
        // For other string-based filters like category, team, country, event, title
        // TypeScript infers 'key' is safe because all other possible types have been handled or are string.
        updatedFilter[key as 'title' | 'category' | 'team' | 'country' | 'event'] = value;
      }
    }

    setFilter(updatedFilter);
  };

  const applyFilter = () => {
    onFilterChange(filter);
    setIsOpen(false);
  };

  const resetFilter = () => {
    setFilter({});
    onFilterChange({});
    setIsOpen(false);
  };

  const activeFilterCount = Object.keys(filter).length;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          leftIcon={<Filter className="h-4 w-4" />}
          rightIcon={<ChevronDown className="h-4 w-4" />}
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-600"
        >
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<X className="h-4 w-4" />}
            onClick={resetFilter}
            className="text-slate-500"
          >
            Clear
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-lg border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                className="w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                value={filter.category || 'All Categories'}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Country
              </label>
              <select
                className="w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                value={filter.country || 'All Countries'}
                onChange={(e) => handleFilterChange('country', e.target.value)}
              >
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Event
              </label>
              <select
                className="w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                value={filter.event || 'All Events'}
                onChange={(e) => handleFilterChange('event', e.target.value)}
              >
                {events.map((event) => (
                  <option key={event} value={event}>
                    {event}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Difficulty
              </label>
              <select
                className="w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                value={filter.difficulty || 'All Difficulties'}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
              >
                {difficulties.map((level) => (
                  <option key={level} value={level}>
                    {level === 'All Difficulties'
                      ? level
                      : level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* These filters are hidden by default for GenerateQuizPage based on props,
                but included for future potential reuse in other contexts if desired. */}
            {!hideVisibilityFilter && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Visibility
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                  value={filter.visibility || 'All'}
                  onChange={(e) => handleFilterChange('visibility', e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="global">Global</option>
                  <option value="private">Private</option>
                </select>
              </div>
            )}

            {!hideCreatedByFilter && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Created By
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                  placeholder="User ID"
                  value={filter.createdBy || ''}
                  onChange={(e) => handleFilterChange('createdBy', e.target.value)}
                />
              </div>
            )}

          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={applyFilter}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizFilter;