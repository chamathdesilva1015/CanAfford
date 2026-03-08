import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import type { VerifiedListing } from '../services/geminiService';
import './MapView.css';

// Fix Leaflet marker icons not loading in React
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Internal component to handle map centering
const MapController = ({ selectedListing }: { selectedListing?: VerifiedListing }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedListing) {
      map.flyTo([selectedListing.lat, selectedListing.lng], 14, { animate: true, duration: 1 });
    }
  }, [selectedListing, map]);
  return null;
};

interface MapViewProps {
  listings: VerifiedListing[];
  selectedListingId: string | null;
  onSelectListing: (id: string) => void;
  activeCity: string;
}

const CityFlyer = ({ activeCity }: { activeCity: string }) => {
  const map = useMap();
  useEffect(() => {
    switch (activeCity) {
      case 'Toronto': map.flyTo([43.6532, -79.3832], 12); break;
      case 'Guelph': map.flyTo([43.5448, -80.2482], 13); break;
      case 'Hamilton': map.flyTo([43.2557, -79.8711], 12); break;
      case 'Ottawa': map.flyTo([45.4215, -75.6972], 12); break;
      case 'Mississauga': map.flyTo([43.5890, -79.6441], 12); break;
      case 'All':
      default:
        map.flyTo([43.65, -79.8], 8); break;
    }
  }, [activeCity, map]);
  return null;
};

export const MapView: React.FC<MapViewProps> = React.memo(({ listings, selectedListingId, onSelectListing, activeCity }) => {
  const selectedListing = listings.find(l => l.id === selectedListingId);

  // Default center view based on data or fallback to Ontario
  const centerPosition: [number, number] = listings.length > 0 
    ? [listings[0].lat, listings[0].lng] 
    : [43.6532, -79.3832]; // Default Toronto
    
  // If user searched a city, snap to the first listing of that city
  
  return (
    <div className="map-wrapper">
      <MapContainer center={centerPosition} zoom={10} scrollWheelZoom={true} className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        
        <CityFlyer activeCity={activeCity} />
        <MapController selectedListing={selectedListing} />
        
        {listings.map(listing => (
          <Marker 
            key={listing.id} 
            position={[listing.lat, listing.lng]}
            eventHandlers={{
              click: () => onSelectListing(listing.id)
            }}
          >
            <Popup>
              <strong>${listing.verifiedRent}/mo</strong><br/>
              {listing.city}<br/>
              {listing.address}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="map-disclaimer">
        <MapPin size={10} />
        <span>Map markers are approximate and may not reflect the exact property location.</span>
      </div>
    </div>
  );
});
