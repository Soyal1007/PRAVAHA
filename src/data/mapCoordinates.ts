import { LocationCoordinates } from '../types';

export const NORTHEAST_CENTER: LocationCoordinates = {
  lat: 25.5788,
  lng: 91.8933,
  name: 'Northeast India Region',
};

export const CITIES: Record<string, LocationCoordinates> = {
  Guwahati: { lat: 26.1445, lng: 91.7362, name: 'Guwahati, Assam' },
  Silchar: { lat: 24.8333, lng: 92.7789, name: 'Silchar, Assam' },
  Jiribam: { lat: 24.7981, lng: 93.1235, name: 'Jiribam, Manipur' },
  Imphal: { lat: 24.817, lng: 93.9368, name: 'Imphal, Manipur' },
  Gangtok: { lat: 27.3389, lng: 88.6065, name: 'Gangtok, Sikkim' },
  Siliguri: { lat: 26.7271, lng: 88.3953, name: 'Siliguri, West Bengal' },
  Shillong: { lat: 25.5788, lng: 91.8933, name: 'Shillong, Meghalaya' },
  Kohima: { lat: 25.6751, lng: 94.1086, name: 'Kohima, Nagaland' },
  Dimapur: { lat: 25.9068, lng: 93.7274, name: 'Dimapur, Nagaland' },
  Aizawl: { lat: 23.7307, lng: 92.7173, name: 'Aizawl, Mizoram' },
  Agartala: { lat: 23.8315, lng: 91.2868, name: 'Agartala, Tripura' },
  Itanagar: { lat: 27.0844, lng: 93.6053, name: 'Itanagar, Arunachal Pradesh' },
};

// Route Polylines for Leaflet maps
export const ROUTE_POLYLINES: Record<string, LocationCoordinates[]> = {
  // Guwahati -> Imphal Primary (via NH-27, NH-37, NH-2)
  'guwahati-imphal-primary': [
    CITIES.Guwahati,
    { lat: 26.115, lng: 92.342, name: 'Nagaon' },
    { lat: 25.9068, lng: 93.7274, name: 'Dimapur' },
    { lat: 25.6751, lng: 94.1086, name: 'Kohima' },
    { lat: 25.183, lng: 94.015, name: 'Senapati' },
    CITIES.Imphal,
  ],
  // Guwahati -> Imphal Safer Alternate (via Silchar & Jiribam NH-37)
  'guwahati-imphal-alternate': [
    CITIES.Guwahati,
    { lat: 25.5788, lng: 91.8933, name: 'Shillong' },
    { lat: 24.8333, lng: 92.7789, name: 'Silchar' },
    { lat: 24.7981, lng: 93.1235, name: 'Jiribam' },
    CITIES.Imphal,
  ],
  // Siliguri -> Gangtok (NH-10)
  'siliguri-gangtok-nh10': [
    CITIES.Siliguri,
    { lat: 26.901, lng: 88.452, name: 'Sevoke' },
    { lat: 27.121, lng: 88.489, name: 'Kalimpong Junction' },
    { lat: 27.172, lng: 88.521, name: 'Rangpo Checkpost' },
    { lat: 27.241, lng: 88.582, name: 'Singtam' },
    CITIES.Gangtok,
  ],
  // Guwahati -> Shillong (NH-6)
  'guwahati-shillong-nh6': [
    CITIES.Guwahati,
    { lat: 25.823, lng: 91.882, name: 'Nongpoh' },
    CITIES.Shillong,
  ],
  // Silchar -> Aizawl
  'silchar-aizawl-nh306': [
    CITIES.Silchar,
    { lat: 24.231, lng: 92.682, name: 'Vairengte' },
    { lat: 23.982, lng: 92.701, name: 'Kolasib' },
    CITIES.Aizawl,
  ]
};

export interface RegionalPreset {
  id: string;
  name: string;
  state: string;
  center: { lat: number; lng: number };
  zoom: number;
  description: string;
  keyCities: string[];
  badgeColor: string;
}

export const REGIONAL_PRESETS: RegionalPreset[] = [
  {
    id: 'all-ne',
    name: 'Entire Northeast Region',
    state: 'Northeast India',
    center: { lat: 25.5788, lng: 91.8933 },
    zoom: 7,
    description: 'Comprehensive 8-State GIS logistics & corridor overview.',
    keyCities: ['Guwahati', 'Shillong', 'Imphal', 'Gangtok', 'Silchar', 'Itanagar'],
    badgeColor: 'bg-slate-800 text-white',
  },
  {
    id: 'assam-valley',
    name: 'Assam Valley & Brahmaputra Basin',
    state: 'Assam',
    center: { lat: 26.1445, lng: 92.5000 },
    zoom: 8,
    description: 'Guwahati, Brahmaputra river plain, Majuli island, Silchar & Lakhimpur flood corridors.',
    keyCities: ['Guwahati', 'Silchar', 'Majuli', 'Dibrugarh', 'Tezpur', 'Lakhimpur'],
    badgeColor: 'bg-teal-700 text-white',
  },
  {
    id: 'meghalaya-hills',
    name: 'Meghalaya Plateau',
    state: 'Meghalaya',
    center: { lat: 25.5788, lng: 91.8933 },
    zoom: 9,
    description: 'Shillong peak, Cherrapunji high-rainfall pass, Nongpoh NH-6 corridor.',
    keyCities: ['Shillong', 'Nongpoh', 'Tura', 'Jowai', 'Dawki'],
    badgeColor: 'bg-emerald-700 text-white',
  },
  {
    id: 'manipur-valley',
    name: 'Manipur Valley & Jiribam Corridor',
    state: 'Manipur',
    center: { lat: 24.8170, lng: 93.5000 },
    zoom: 9,
    description: 'Imphal medical hub, Loktak lake basin, Jiribam NH-37 lifeline.',
    keyCities: ['Imphal', 'Jiribam', 'Senapati', 'Churachandpur'],
    badgeColor: 'bg-purple-700 text-white',
  },
  {
    id: 'sikkim-corridor',
    name: 'Sikkim Teesta Valley (NH-10)',
    state: 'Sikkim',
    center: { lat: 27.1500, lng: 88.5000 },
    zoom: 9,
    description: 'Siliguri to Gangtok NH-10 mountain corridor, Sevoke 29th Mile landslide zone.',
    keyCities: ['Gangtok', 'Siliguri', 'Kalimpong', 'Singtam'],
    badgeColor: 'bg-amber-700 text-white',
  },
  {
    id: 'arunachal-watershed',
    name: 'Arunachal Subansiri Watershed',
    state: 'Arunachal Pradesh',
    center: { lat: 27.0844, lng: 93.6053 },
    zoom: 8,
    description: 'Itanagar capital complex, Subansiri river & border highways.',
    keyCities: ['Itanagar', 'Pasighat', 'Ziro', 'Tawang'],
    badgeColor: 'bg-blue-700 text-white',
  },
  {
    id: 'tripura-mizoram',
    name: 'Mizoram & Tripura Pass',
    state: 'Mizoram & Tripura',
    center: { lat: 23.7500, lng: 92.0000 },
    zoom: 9,
    description: 'Aizawl NH-306 corridor & Agartala plain route.',
    keyCities: ['Aizawl', 'Agartala', 'Kolasib', 'Vairengte'],
    badgeColor: 'bg-indigo-700 text-white',
  },
];
