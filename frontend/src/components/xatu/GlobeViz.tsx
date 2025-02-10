import { useEffect, useRef, useMemo } from 'react'
import Globe from 'globe.gl'

interface Props {
  data: any
  width?: number
  height?: number 
}

interface Arc {
  startLat: number
  startLng: number 
  endLat: number
  endLng: number
  color: string
}

interface Point {
  lat: number
  lng: number
  size: number
  color: string
  name: string
  nodes: number
}

// Mapping of some countries to their coordinates
const COUNTRY_COORDS: Record<string, [number, number]> = {
  'Afghanistan': [33.9391, 67.7100],
  'Albania': [41.1533, 20.1683],
  'Algeria': [28.0339, 1.6596],
  'Andorra': [42.5063, 1.5218],
  'Angola': [-11.2027, 17.8739],
  'Antigua and Barbuda': [17.0608, -61.7964],
  'Argentina': [-38.4161, -63.6167],
  'Armenia': [40.0691, 45.0382],
  'Australia': [-25.2744, 133.7751],
  'Austria': [47.5162, 14.5501],
  'Azerbaijan': [40.1431, 47.5769],
  'Bahamas': [25.0343, -77.3963],
  'Bahrain': [26.0667, 50.5577],
  'Bangladesh': [23.6850, 90.3563],
  'Barbados': [13.1939, -59.5432],
  'Belarus': [53.7098, 27.9534],
  'Belgium': [50.8503, 4.3517],
  'Belize': [17.1899, -88.4976],
  'Benin': [9.3077, 2.3158],
  'Bhutan': [27.5142, 90.4336],
  'Bolivia': [-16.2902, -63.5887],
  'Bosnia and Herzegovina': [43.9159, 17.6791],
  'Botswana': [-22.3285, 24.6849],
  'Brazil': [-14.2350, -51.9253],
  'Brunei': [4.5353, 114.7277],
  'Bulgaria': [42.7339, 25.4858],
  'Burkina Faso': [12.2383, -1.5616],
  'Burundi': [-3.3731, 29.9189],
  'Cambodia': [12.5657, 104.9910],
  'Cameroon': [7.3697, 12.3547],
  'Canada': [56.1304, -106.3468],
  'Cape Verde': [16.5388, -23.0418],
  'Central African Republic': [6.6111, 20.9394],
  'Chad': [15.4542, 18.7322],
  'Chile': [-35.6751, -71.5430],
  'China': [35.8617, 104.1954],
  'Colombia': [4.5709, -74.2973],
  'Comoros': [-11.6455, 43.3333],
  'Congo': [-0.2280, 15.8277],
  'Costa Rica': [9.7489, -83.7534],
  'Croatia': [45.1000, 15.2000],
  'Cuba': [21.5218, -77.7812],
  'Cyprus': [35.1264, 33.4299],
  'Czech Republic': [49.8175, 15.4730],
  'Denmark': [56.2639, 9.5018],
  'Djibouti': [11.8251, 42.5903],
  'Dominica': [15.4150, -61.3710],
  'Dominican Republic': [18.7357, -70.1627],
  'DR Congo': [-4.0383, 21.7587],
  'Ecuador': [-1.8312, -78.1834],
  'Egypt': [26.8206, 30.8025],
  'El Salvador': [13.7942, -88.8965],
  'Equatorial Guinea': [1.6508, 10.2679],
  'Eritrea': [15.1794, 39.7823],
  'Estonia': [58.5953, 25.0136],
  'Eswatini': [-26.5225, 31.4659],
  'Ethiopia': [9.1450, 40.4897],
  'Fiji': [-17.7134, 178.0650],
  'Finland': [61.9241, 25.7482],
  'France': [46.2276, 2.2137],
  'Gabon': [-0.8037, 11.6094],
  'Gambia': [13.4432, -15.3101],
  'Georgia': [42.3154, 43.3569],
  'Germany': [51.1657, 10.4515],
  'Ghana': [7.9465, -1.0232],
  'Greece': [39.0742, 21.8243],
  'Grenada': [12.1165, -61.6790],
  'Guatemala': [15.7835, -90.2308],
  'Guinea': [9.9456, -9.6966],
  'Guinea-Bissau': [11.8037, -15.1804],
  'Guyana': [4.8604, -58.9302],
  'Haiti': [18.9712, -72.2852],
  'Honduras': [15.2000, -86.2419],
  'Hungary': [47.1625, 19.5033],
  'Iceland': [64.9631, -19.0208],
  'India': [20.5937, 78.9629],
  'Indonesia': [-0.7893, 113.9213],
  'Iran': [32.4279, 53.6880],
  'Iraq': [33.2232, 43.6793],
  'Ireland': [53.1424, -7.6921],
  'Israel': [31.0461, 34.8516],
  'Italy': [41.8719, 12.5674],
  'Ivory Coast': [7.5400, -5.5471],
  'Jamaica': [18.1096, -77.2975],
  'Japan': [36.2048, 138.2529],
  'Jordan': [30.5852, 36.2384],
  'Kazakhstan': [48.0196, 66.9237],
  'Kenya': [-0.0236, 37.9062],
  'Kiribati': [-3.3704, -168.7340],
  'Kuwait': [29.3117, 47.4818],
  'Kyrgyzstan': [41.2044, 74.7661],
  'Laos': [19.8563, 102.4955],
  'Latvia': [56.8796, 24.6032],
  'Lebanon': [33.8547, 35.8623],
  'Lesotho': [-29.6099, 28.2336],
  'Liberia': [6.4281, -9.4295],
  'Libya': [26.3351, 17.2283],
  'Liechtenstein': [47.1660, 9.5554],
  'Lithuania': [55.1694, 23.8813],
  'Luxembourg': [49.8153, 6.1296],
  'Madagascar': [-18.7669, 46.8691],
  'Malawi': [-13.2543, 34.3015],
  'Malaysia': [4.2105, 101.9758],
  'Maldives': [3.2028, 73.2207],
  'Mali': [17.5707, -3.9962],
  'Malta': [35.9375, 14.3754],
  'Marshall Islands': [7.1315, 171.1845],
  'Mauritania': [21.0079, -10.9408],
  'Mauritius': [-20.3484, 57.5522],
  'Mexico': [23.6345, -102.5528],
  'Micronesia': [7.4256, 150.5508],
  'Moldova': [47.4116, 28.3699],
  'Monaco': [43.7384, 7.4246],
  'Mongolia': [46.8625, 103.8467],
  'Montenegro': [42.7087, 19.3744],
  'Morocco': [31.7917, -7.0926],
  'Mozambique': [-18.6657, 35.5296],
  'Myanmar': [21.9162, 95.9560],
  'Namibia': [-22.9576, 18.4904],
  'Nauru': [-0.5228, 166.9315],
  'Nepal': [28.3949, 84.1240],
  'Netherlands': [52.1326, 5.2913],
  'New Zealand': [-40.9006, 174.8860],
  'Nicaragua': [12.8654, -85.2072],
  'Niger': [17.6078, 8.0817],
  'Nigeria': [9.0820, 8.6753],
  'North Korea': [40.3399, 127.5101],
  'North Macedonia': [41.6086, 21.7453],
  'Norway': [60.4720, 8.4689],
  'Oman': [21.4735, 55.9754],
  'Pakistan': [30.3753, 69.3451],
  'Palau': [7.5150, 134.5825],
  'Palestine': [31.9522, 35.2332],
  'Panama': [8.5380, -80.7821],
  'Papua New Guinea': [-6.3150, 143.9555],
  'Paraguay': [-23.4425, -58.4438],
  'Peru': [-9.1900, -75.0152],
  'Philippines': [12.8797, 121.7740],
  'Poland': [51.9194, 19.1451],
  'Portugal': [39.3999, -8.2245],
  'Qatar': [25.3548, 51.1839],
  'Romania': [45.9432, 24.9668],
  'Russia': [61.5240, 105.3188],
  'Rwanda': [-1.9403, 29.8739],
  'Saint Kitts and Nevis': [17.3578, -62.7830],
  'Saint Lucia': [13.9094, -60.9789],
  'Saint Vincent and the Grenadines': [12.9843, -61.2872],
  'Samoa': [-13.7590, -172.1046],
  'San Marino': [43.9424, 12.4578],
  'Sao Tome and Principe': [0.1864, 6.6131],
  'Saudi Arabia': [23.8859, 45.0792],
  'Senegal': [14.4974, -14.4524],
  'Serbia': [44.0165, 21.0059],
  'Seychelles': [-4.6796, 55.4920],
  'Sierra Leone': [8.4606, -11.7799],
  'Singapore': [1.3521, 103.8198],
  'Slovakia': [48.6690, 19.6990],
  'Slovenia': [46.1512, 14.9955],
  'Solomon Islands': [-9.6457, 160.1562],
  'Somalia': [5.1521, 46.1996],
  'South Africa': [-30.5595, 22.9375],
  'South Korea': [35.9078, 127.7669],
  'South Sudan': [6.8770, 31.3070],
  'Spain': [40.4637, -3.7492],
  'Sri Lanka': [7.8731, 80.7718],
  'Sudan': [12.8628, 30.2176],
  'Suriname': [3.9193, -56.0278],
  'Sweden': [60.1282, 18.6435],
  'Switzerland': [46.8182, 8.2275],
  'Syria': [34.8021, 38.9968],
  'Taiwan': [23.5937, 121.0254],
  'Tajikistan': [38.8610, 71.2761],
  'Tanzania': [-6.3690, 34.8888],
  'Thailand': [15.8700, 100.9925],
  'Timor-Leste': [-8.8742, 125.7275],
  'Togo': [8.6195, 0.8248],
  'Tonga': [-21.1789, -175.1982],
  'Trinidad and Tobago': [10.6918, -61.2225],
  'Tunisia': [33.8869, 9.5375],
  'Turkey': [38.9637, 35.2433],
  'Turkmenistan': [38.9697, 59.5563],
  'Tuvalu': [-7.1095, 177.6493],
  'Uganda': [1.3733, 32.2903],
  'Ukraine': [48.3794, 31.1656],
  'United Arab Emirates': [23.4241, 53.8478],
  'United Kingdom': [55.3781, -3.4360],
  'United States': [37.0902, -95.7129],
  'Uruguay': [-32.5228, -55.7658],
  'Uzbekistan': [41.3775, 64.5853],
  'Vanuatu': [-15.3767, 166.9592],
  'Vatican City': [41.9029, 12.4534],
  'Venezuela': [6.4238, -66.5897],
  'Vietnam': [14.0583, 108.2772],
  'Yemen': [15.5527, 48.5164],
  'Zambia': [-13.1339, 27.8493],
  'Zimbabwe': [-19.0154, 29.1549]
}

// Amsterdam coordinates
const TARGET_COORDS = {
  lat: 52.3676,
  lng: 4.9041
}

export const GlobeViz = ({ data, width = 600, height = 400 }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)

  const { arcs, points } = useMemo(() => {
    if (!data || data.length === 0) return { arcs: [], points: [] }

    const latestData = data[data.length - 1]
    const arcs: Arc[] = []
    const points: Point[] = []

    // Count nodes per country
    const countryNodes = new Map<string, number>()
    latestData.countries.forEach((country: any) => {
      countryNodes.set(country.name, country.value)
    })

    // Create points and arcs for each country
    countryNodes.forEach((value, countryName) => {
      const coords = COUNTRY_COORDS[countryName]
      if (coords) {
        // Hash the country name to get a consistent hue value between 0 and 360
        const hash = countryName.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0)
        const hue = Math.abs(hash % 360)
        const color = `hsla(${hue}, 70%, 50%, 0.8)`

        // Add point for the country
        points.push({
          lat: coords[0],
          lng: coords[1],
          size: Math.max(2, Math.min(10, Math.sqrt(value) * 1.2)),
          color: color,
          name: countryName,
          nodes: value
        })

        // Create arcs for each node
        for (let i = 0; i < value; i++) {
          arcs.push({
            startLat: coords[0],
            startLng: coords[1],
            endLat: TARGET_COORDS.lat,
            endLng: TARGET_COORDS.lng,
            color: `hsla(${hue}, 70%, 50%, ${Math.random() * 0.3 + 0.7})`
          })
        }
      }
    })

    return { arcs, points }
  }, [data])

  // Initialize globe
  useEffect(() => {
    if (!containerRef.current) return

    // Initialize globe
    const globe = new Globe(containerRef.current)
    globeRef.current = globe

    // Configure globe
    globe
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .backgroundColor('rgba(0,0,0,0)')
      .arcColor('color')
      .arcDashLength(0.25)
      .arcDashGap(0.5)
      .arcDashAnimateTime(4000)
      .arcStroke(1)
      .atmosphereColor('#1f2937')
      .atmosphereAltitude(0.1)
      .width(containerRef.current.clientWidth)
      .height(height)
      .arcsData(arcs)
      .pointsData(points)
      .pointColor('color')
      .pointAltitude(0.01)
      .pointRadius('size')
      .pointLabel(point => `
        <div class="backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-700 shadow-xl">
          <div class="text-accent font-medium">${(point as Point).name}</div>
          <div class="text-primary">${(point as Point).nodes} nodes</div>
        </div>
      `)

    // Configure controls
    const controls = globe.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.7
    controls.enableZoom = true
    controls.enablePan = true
    controls.minDistance = 180
    controls.maxDistance = 300

    // Set initial camera position
    globe.pointOfView({
      lat: 30,
      lng: 10,
      altitude: 2
    })

    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        globe.width(containerRef.current.clientWidth)
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (globeRef.current) {
        globeRef.current._destructor()
      }
    }
  }, [])

  // Update globe data
  useEffect(() => {
    if (!globeRef.current || !containerRef.current) return

    globeRef.current
      .width(containerRef.current.clientWidth)
      .height(height)
      .arcsData(arcs)
      .pointsData(points)
  }, [height, arcs, points])

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height }} 
      className="relative overflow-hidden flex items-center justify-center" 
    />
  )
} 