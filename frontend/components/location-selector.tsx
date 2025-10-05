'use client';

import React, { useState, useEffect } from 'react';
import SearchableDropdown from './searchable-dropdown';
import { fetchCountriesData, getCitiesForCountry, searchCountries, searchCities, Country } from '../lib/countries-data';

interface LocationSelectorProps {
  country: string;
  city: string;
  onCountryChange: (country: string) => void;
  onCityChange: (city: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function LocationSelector({
  country,
  city,
  onCountryChange,
  onCityChange,
  disabled = false,
  className = ''
}: LocationSelectorProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch countries data on component mount
  useEffect(() => {
    const loadCountriesData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCountriesData();
        setCountries(data);
      } catch (err) {
        console.error('Error loading countries data:', err);
        setError('Failed to load countries data');
      } finally {
        setLoading(false);
      }
    };

    loadCountriesData();
  }, []);

  // Update available cities when country changes
  useEffect(() => {
    if (country && countries.length > 0) {
      const cities = getCitiesForCountry(countries, country);
      setAvailableCities(cities);
      // Don't clear city on initial load - let it stay as is
    } else {
      setAvailableCities([]);
    }
  }, [country, countries]);

  const handleCountryChange = (newCountry: string) => {
    onCountryChange(newCountry);
    // Only clear city if the country actually changed (not on initial load)
    if (city && newCountry !== country) {
      onCityChange('');
    }
  };

  const handleCityChange = (newCity: string) => {
    onCityChange(newCity);
  };

  // Get filtered countries for dropdown
  const getFilteredCountries = (searchTerm: string) => {
    if (!searchTerm.trim()) return countries.map(c => c.name);
    return searchCountries(countries, searchTerm).map(c => c.name);
  };

  // Get filtered cities for dropdown
  const getFilteredCities = (searchTerm: string) => {
    if (!searchTerm.trim()) return availableCities;
    return searchCities(availableCities, searchTerm);
  };

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="text-red-600 text-sm mb-4">
          {error}. Please try refreshing the page.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="country-fallback" className="block text-sm font-medium text-gray-700 mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <input
              id="country-fallback"
              type="text"
              value={country}
              onChange={(e) => onCountryChange(e.target.value)}
              placeholder="Enter country name"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="city-fallback" className="block text-sm font-medium text-gray-700 mb-1">
              City/State <span className="text-red-500">*</span>
            </label>
            <input
              id="city-fallback"
              type="text"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              placeholder="Enter city/state name"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      <div>
        <label htmlFor="country-selector" className="block text-sm font-medium text-gray-700 mb-1">
          Country <span className="text-red-500">*</span>
        </label>
        <SearchableDropdown
          id="country-selector"
          options={getFilteredCountries('')}
          value={country}
          onChange={handleCountryChange}
          placeholder="Select or search for a country"
          disabled={disabled}
        />
      </div>

      <div>
        <label htmlFor="city-selector" className="block text-sm font-medium text-gray-700 mb-1">
          City/State <span className="text-red-500">*</span>
        </label>
        <SearchableDropdown
          id="city-selector"
          options={getFilteredCities('')}
          value={city}
          onChange={handleCityChange}
          placeholder={country ? "Select or search for a city/state" : "Please select a country first"}
          disabled={disabled || !country}
        />
        {!country && (
          <p className="mt-1 text-sm text-gray-500">
            Please select a country first to choose a city/state
          </p>
        )}
      </div>
    </div>
  );
}
