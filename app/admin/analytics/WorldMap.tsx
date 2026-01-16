'use client'

import { useState, useRef } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { X, Users, Mail, Calendar, MapPin, Dumbbell } from 'lucide-react'
import { AdminService } from '@/lib/services/adminService'

// Comprehensive country name to coordinates mapping
// Using ISO 3166-1 country names and common variations
const countryCoordinates: Record<string, [number, number]> = {
  // North America
  'united states': [-95.7129, 37.0902],
  'usa': [-95.7129, 37.0902],
  'us': [-95.7129, 37.0902],
  'united states of america': [-95.7129, 37.0902],
  'canada': [-106.3468, 56.1304],
  'ca': [-106.3468, 56.1304],
  'mexico': [-102.5528, 23.6345],
  
  // Europe
  'united kingdom': [-3.4360, 55.3781],
  'uk': [-3.4360, 55.3781],
  'great britain': [-3.4360, 55.3781],
  'germany': [10.4515, 51.1657],
  'deutschland': [10.4515, 51.1657],
  'france': [2.2137, 46.2276],
  'italy': [12.5674, 41.8719],
  'spain': [-3.7492, 40.4637],
  'netherlands': [5.2913, 52.1326],
  'holland': [5.2913, 52.1326],
  'belgium': [4.4699, 50.5039],
  'switzerland': [8.2275, 46.8182],
  'sweden': [18.6435, 60.1282],
  'norway': [8.4689, 60.4720],
  'denmark': [9.5018, 56.2639],
  'finland': [25.7482, 61.9241],
  'poland': [19.1451, 51.9194],
  'portugal': [-8.2245, 39.3999],
  'greece': [21.8243, 39.0742],
  'turkey': [35.2433, 38.9637],
  'türkiye': [35.2433, 38.9637],
  'ireland': [-8.2439, 53.4129],
  'austria': [14.5501, 47.5162],
  'czech republic': [15.4720, 49.8175],
  'hungary': [19.5033, 47.1625],
  'romania': [24.9668, 45.9432],
  'ukraine': [31.1656, 48.3794],
  'russia': [105.3188, 61.5240],
  'russian federation': [105.3188, 61.5240],
  
  // Asia
  'china': [104.1954, 35.8617],
  'japan': [138.2529, 36.2048],
  'india': [78.9629, 20.5937],
  'south korea': [127.7669, 35.9078],
  'korea': [127.7669, 35.9078],
  'singapore': [103.8198, 1.3521],
  'thailand': [100.9925, 15.8700],
  'vietnam': [108.2772, 14.0583],
  'malaysia': [101.9758, 4.2105],
  'indonesia': [113.9213, -0.7893],
  'philippines': [121.7740, 12.8797],
  'hong kong': [114.1694, 22.3193],
  'taiwan': [120.9605, 23.6978],
  'israel': [34.8516, 31.0461],
  'saudi arabia': [45.0792, 23.8859],
  'united arab emirates': [53.8478, 23.4241],
  'uae': [53.8478, 23.4241],
  'pakistan': [69.3451, 30.3753],
  'bangladesh': [90.3563, 23.6850],
  'sri lanka': [80.7718, 7.8731],
  
  // Oceania
  'australia': [133.7751, -25.2744],
  'au': [133.7751, -25.2744],
  'new zealand': [174.8860, -40.9006],
  'nz': [174.8860, -40.9006],
  
  // South America
  'brazil': [-51.9253, -14.2350],
  'argentina': [-63.6167, -38.4161],
  'chile': [-71.5430, -35.6751],
  'colombia': [-74.2973, 4.5709],
  'peru': [-75.0152, -9.1900],
  'venezuela': [-66.5897, 6.4238],
  
  // Africa
  'south africa': [22.9375, -30.5595],
  'nigeria': [8.6753, 9.0820],
  'egypt': [30.8025, 26.8206],
  'kenya': [37.9062, -0.0236],
  'ghana': [-1.0232, 7.9465],
  'morocco': [-7.0926, 31.7917],
}

// Normalize country name for matching
const normalizeCountryName = (countryName: string): string => {
  return countryName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\bof\b/g, '') // Remove "of" (e.g., "United States of America")
    .trim()
}

// Get coordinates for a country (with improved matching)
const getCountryCoordinates = (countryName: string): [number, number] | null => {
  const normalized = normalizeCountryName(countryName)
  
  // Try exact match first (case-insensitive)
  if (countryCoordinates[normalized]) {
    return countryCoordinates[normalized]
  }
  
  // Try matching against normalized keys
  for (const [key, coords] of Object.entries(countryCoordinates)) {
    const keyNormalized = normalizeCountryName(key)
    if (keyNormalized === normalized) {
      return coords
    }
  }
  
  // Try partial match (e.g., "United States" matches "US")
  for (const [key, coords] of Object.entries(countryCoordinates)) {
    const keyNormalized = normalizeCountryName(key)
    // Check if one contains the other (for abbreviations)
    if (normalized.includes(keyNormalized) || keyNormalized.includes(normalized)) {
      // Prefer longer matches
      if (keyNormalized.length >= 3 || normalized.length >= 3) {
        return coords
      }
    }
  }
  
  // Log unmapped countries for debugging
  console.warn(`Country not mapped: "${countryName}" (normalized: "${normalized}")`)
  return null
}

interface WorldMapProps {
  locations: Array<{
    country: string
    userCount: number
    cityCount: number
    cities: string[]
  }>
}

export default function WorldMap({ locations }: WorldMapProps) {
  const [tooltipContent, setTooltipContent] = useState<{
    country: string
    count: number
    cities: string[]
    x: number
    y: number
  } | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const [showUnmapped, setShowUnmapped] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<{
    country: string
    userCount: number
  } | null>(null)
  const [countryUsers, setCountryUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Filter locations that have coordinates
  const locationsWithCoords = locations
    .map(loc => {
      const coords = getCountryCoordinates(loc.country)
      return coords ? { ...loc, coordinates: coords } : null
    })
    .filter((loc): loc is typeof locations[0] & { coordinates: [number, number] } => loc !== null)

  // Get unmapped countries
  const unmappedCountries = locations.filter(loc => !getCountryCoordinates(loc.country))

  // Get max count for sizing dots
  const maxCount = Math.max(...locationsWithCoords.map(l => l.userCount), 1)

  return (
    <div className="relative w-full h-full" ref={mapRef}>
      <ComposableMap
        projection="geoEquirectangular"
        projectionConfig={{
          scale: 147,
          center: [0, 20],
        }}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#E5E7EB"
                stroke="#D1D5DB"
                strokeWidth={0.5}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none', fill: '#D1D5DB' },
                  pressed: { outline: 'none', fill: '#9CA3AF' },
                }}
              />
            ))
          }
        </Geographies>
        {locationsWithCoords.map((location) => {
          const [longitude, latitude] = location.coordinates
          const size = Math.max(6, Math.min(24, (location.userCount / maxCount) * 24))
          const intensity = location.userCount / maxCount

          return (
            <Marker
              key={location.country}
              coordinates={[longitude, latitude]}
            >
              <g
                onMouseEnter={(e) => {
                  if (mapRef.current) {
                    const rect = mapRef.current.getBoundingClientRect()
                    const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect()
                    if (svgRect) {
                      setTooltipContent({
                        country: location.country,
                        count: location.userCount,
                        cities: location.cities,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      })
                    }
                  }
                }}
                onMouseLeave={() => setTooltipContent(null)}
                onClick={async () => {
                  setSelectedCountry({
                    country: location.country,
                    userCount: location.userCount,
                  })
                  setLoadingUsers(true)
                  try {
                    const users = await AdminService.getUsersByCountry(location.country)
                    setCountryUsers(users)
                  } catch (error) {
                    console.error('Error fetching users:', error)
                    setCountryUsers([])
                  } finally {
                    setLoadingUsers(false)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  r={size}
                  fill={`rgba(59, 130, 246, ${Math.min(1, intensity * 0.8 + 0.3)})`}
                  stroke="#1E40AF"
                  strokeWidth={2}
                />
                {location.userCount > 0 && (
                  <text
                    textAnchor="middle"
                    y={4}
                    fontSize={size > 12 ? 10 : 8}
                    fill="white"
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                  >
                    {location.userCount}
                  </text>
                )}
              </g>
            </Marker>
          )
        })}
      </ComposableMap>

      {/* Tooltip */}
      {tooltipContent && (
        <div
          className="absolute z-10 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none"
          style={{
            left: `${tooltipContent.x + 10}px`,
            top: `${tooltipContent.y - 10}px`,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="font-semibold">{tooltipContent.country}</div>
          <div className="text-xs text-gray-300">
            {tooltipContent.count} {tooltipContent.count === 1 ? 'user' : 'users'}
          </div>
          {tooltipContent.cities && tooltipContent.cities.length > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              {tooltipContent.cities.slice(0, 2).join(', ')}
              {tooltipContent.cities.length > 2 && ` +${tooltipContent.cities.length - 2}`}
            </div>
          )}
        </div>
      )}

      {/* Unmapped countries warning */}
      {unmappedCountries.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <button
            onClick={() => setShowUnmapped(!showUnmapped)}
            className="text-sm text-yellow-800 font-medium hover:text-yellow-900"
          >
            {unmappedCountries.length} {unmappedCountries.length === 1 ? 'country' : 'countries'} not mapped (click to show)
          </button>
          {showUnmapped && (
            <div className="mt-2 text-xs text-yellow-700">
              {unmappedCountries.map(loc => (
                <div key={loc.country}>
                  {loc.country}: {loc.userCount} {loc.userCount === 1 ? 'user' : 'users'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Modal */}
      {selectedCountry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedCountry.country}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedCountry.userCount} {selectedCountry.userCount === 1 ? 'user' : 'users'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCountry(null)
                  setCountryUsers([])
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="ml-3 text-gray-600">Loading users...</p>
                </div>
              ) : countryUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No users found for this country
                </div>
              ) : (
                <div className="space-y-3">
                  {countryUsers.map((user) => (
                    <div
                      key={user.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {user.first_name || user.last_name
                                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                : user.username || 'Unknown User'}
                            </h3>
                            {user.username && (
                              <span className="text-sm text-gray-500">@{user.username}</span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                            {user.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                <span>{user.email}</span>
                              </div>
                            )}
                            {user.city && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{user.city}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Joined {new Date(user.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {user.total_workouts !== undefined && (
                              <div className="flex items-center gap-1">
                                <Dumbbell className="h-4 w-4" />
                                <span>{user.total_workouts} workouts</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
