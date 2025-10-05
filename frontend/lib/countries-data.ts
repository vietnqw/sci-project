/**
 * Utility for fetching and managing countries and cities data
 * Data source: https://github.com/dr5hn/countries-states-cities-database
 */

import { fuzzyFilter, fuzzySort } from './fuzzy-search';

export interface Country {
  name: string;
  states: string[];
}

export interface LocationData {
  countries: Country[];
  loading: boolean;
  error: string | null;
}

// Cache for the countries data
let countriesCache: Country[] | null = null;
let cachePromise: Promise<Country[]> | null = null;

/**
 * Fetch countries and states data from GitHub repository
 */
export async function fetchCountriesData(): Promise<Country[]> {
  // Return cached data if available
  if (countriesCache) {
    return countriesCache;
  }

  // Return existing promise if already fetching
  if (cachePromise) {
    return cachePromise;
  }

  // Create new fetch promise
  cachePromise = (async () => {
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries%2Bstates.json'
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch countries data: ${response.status}`);
      }

      const data: Country[] = await response.json();
      countriesCache = data;
      return data;
    } catch (error) {
      console.error('Error fetching countries data:', error);
      // Return fallback data for common countries
      const fallbackData: Country[] = [
        { name: 'Vietnam', states: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Thừa Thiên-Huế', 'Khánh Hòa', 'Lâm Đồng'] },
        { name: 'United States', states: ['New York', 'California', 'Texas', 'Florida', 'Illinois', 'Pennsylvania', 'Ohio', 'Georgia'] },
        { name: 'Singapore', states: ['Singapore'] },
        { name: 'Online', states: ['Online'] }
      ];
      countriesCache = fallbackData;
      return fallbackData;
    }
  })();

  return cachePromise;
}

/**
 * Get cities/states for a specific country
 */
export function getCitiesForCountry(countries: Country[], countryName: string): string[] {
  const country = countries.find(c => c.name.toLowerCase() === countryName.toLowerCase());
  return country?.states || [];
}

/**
 * Search countries by name using fuzzy matching
 */
export function searchCountries(countries: Country[], query: string): Country[] {
  if (!query.trim()) return countries;

  const filtered = fuzzyFilter(countries, query, country => country.name);
  return fuzzySort(filtered, query, country => country.name);
}

/**
 * Search cities within a country using fuzzy matching
 */
export function searchCities(cities: string[], query: string): string[] {
  if (!query.trim()) return cities;

  const filtered = fuzzyFilter(cities, query, city => city);
  return fuzzySort(filtered, query, city => city);
}

/**
 * Clear the cache (useful for testing or data refresh)
 */
export function clearCountriesCache(): void {
  countriesCache = null;
  cachePromise = null;
}
