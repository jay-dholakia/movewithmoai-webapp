declare module 'react-simple-maps' {
  import { ReactNode } from 'react'

  export interface ProjectionConfig {
    scale?: number
    center?: [number, number]
    rotate?: [number, number, number]
  }

  export type Projection = 'geoMercator' | 'geoEqualEarth' | 'geoOrthographic' | 'geoStereographic' | 'geoEquirectangular' | 'geoNaturalEarth1' | 'geoAzimuthalEqualArea' | 'geoAzimuthalEquidistant' | 'geoConicConformal' | 'geoConicEqualArea' | 'geoConicEquidistant' | 'geoCylindricalEqualArea' | 'geoMollweide' | 'geoSinusoidal' | 'geoTransverseMercator'

  export interface Geography {
    rsmKey: string
    properties: any
  }

  export interface ComposableMapProps {
    projection?: Projection
    projectionConfig?: ProjectionConfig
    className?: string
    style?: React.CSSProperties
    children?: ReactNode
  }

  export interface GeographiesProps {
    geography: string | object
    children: (args: { geographies: Geography[] }) => ReactNode
  }

  export interface GeographyProps {
    geography: Geography
    fill?: string
    stroke?: string
    strokeWidth?: number
    style?: {
      default?: React.CSSProperties
      hover?: React.CSSProperties
      pressed?: React.CSSProperties
    }
  }

  export interface MarkerProps {
    coordinates: [number, number]
    children?: ReactNode
  }

  export const ComposableMap: React.FC<ComposableMapProps>
  export const Geographies: React.FC<GeographiesProps>
  export const Geography: React.FC<GeographyProps>
  export const Marker: React.FC<MarkerProps>
}
