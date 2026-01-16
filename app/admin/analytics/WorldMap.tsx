'use client'

import { useState, useRef } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

// Country name to coordinates mapping (approximate center of each country)
const countryCoordinates: Record<string, [number, number]> = {
  'United States': [-95.7129, 37.0902],
  'USA': [-95.7129, 37.0902],
  'US': [-95.7129, 37.0902],
  'Canada': [-106.3468, 56.1304],
  'CA': [-106.3468, 56.1304],
  'United Kingdom': [-3.4360, 55.3781],
  'UK': [-3.4360, 55.3781],
  'Germany': [10.4515, 51.1657],
  'France': [2.2137, 46.2276],
  'Italy': [12.5674, 41.8719],
  'Spain': [-3.7492, 40.4637],
  'Australia': [133.7751, -25.2744],
  'AU': [133.7751, -25.2744],
  'Japan': [138.2529, 36.2048],
  'China': [104.1954, 35.8617],
  'India': [78.9629, 20.5937],
  'Brazil': [-51.9253, -14.2350],
  'Mexico': [-102.5528, 23.6345],
  'Argentina': [-63.6167, -38.4161],
  'South Africa': [22.9375, -30.5595],
  'Nigeria': [8.6753, 9.0820],
  'Egypt': [30.8025, 26.8206],
  'Russia': [105.3188, 61.5240],
  'South Korea': [127.7669, 35.9078],
  'Singapore': [103.8198, 1.3521],
  'Netherlands': [5.2913, 52.1326],
  'Belgium': [4.4699, 50.5039],
  'Switzerland': [8.2275, 46.8182],
  'Sweden': [18.6435, 60.1282],
  'Norway': [8.4689, 60.4720],
  'Denmark': [9.5018, 56.2639],
  'Finland': [25.7482, 61.9241],
  'Poland': [19.1451, 51.9194],
  'Portugal': [-8.2245, 39.3999],
  'Greece': [21.8243, 39.0742],
  'Turkey': [35.2433, 38.9637],
  'Israel': [34.8516, 31.0461],
  'UAE': [53.8478, 23.4241],
  'United Arab Emirates': [53.8478, 23.4241],
  'Saudi Arabia': [45.0792, 23.8859],
  'New Zealand': [174.8860, -40.9006],
  'NZ': [174.8860, -40.9006],
  'Ireland': [-8.2439, 53.4129],
  'Chile': [-71.5430, -35.6751],
  'Colombia': [-74.2973, 4.5709],
  'Peru': [-75.0152, -9.1900],
  'Venezuela': [-66.5897, 6.4238],
  'Philippines': [121.7740, 12.8797],
  'Indonesia': [113.9213, -0.7893],
  'Thailand': [100.9925, 15.8700],
  'Vietnam': [108.2772, 14.0583],
  'Malaysia': [101.9758, 4.2105],
}

// Get coordinates for a country (with fallback)
const getCountryCoordinates = (countryName: string): [number, number] | null => {
  const normalized = countryName.trim()
  return countryCoordinates[normalized] || 
         countryCoordinates[normalized.toUpperCase()] || 
         countryCoordinates[normalized.toLowerCase()] ||
         null
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

  // Filter locations that have coordinates
  const locationsWithCoords = locations
    .map(loc => {
      const coords = getCountryCoordinates(loc.country)
      return coords ? { ...loc, coordinates: coords } : null
    })
    .filter((loc): loc is typeof locations[0] & { coordinates: [number, number] } => loc !== null)

  // Get max count for sizing dots
  const maxCount = Math.max(...locationsWithCoords.map(l => l.userCount), 1)

  return (
    <div className="relative w-full h-full" ref={mapRef}>
      <ComposableMap
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
                onClick={() => {
                  const cityList = location.cities.length > 0 
                    ? `\n\nTop cities: ${location.cities.slice(0, 5).join(', ')}${location.cities.length > 5 ? ` +${location.cities.length - 5} more` : ''}`
                    : ''
                  alert(`${location.country}\n${location.userCount} ${location.userCount === 1 ? 'user' : 'users'}${cityList}`)
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
    </div>
  )
}
