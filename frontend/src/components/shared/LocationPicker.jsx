import { useEffect, useRef, useState } from "react";

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const ward =
      addr.suburb || addr.neighbourhood || addr.quarter ||
      addr.village || addr.town || addr.city_district ||
      addr.county || "Unknown Area";
    return {
      address: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      ward,
    };
  } catch {
    return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, ward: "Unknown Area" };
  }
}

async function searchAddress(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`,
      { headers: { "Accept-Language": "en" } }
    );
    return await res.json();
  } catch {
    return [];
  }
}

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM   = 5;

export default function LocationPicker({ onChange, onWardChange, error }) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);
  const markerRef   = useRef(null);

  const [searchQuery,   setSearchQuery]   = useState("");
  const [suggestions,   setSuggestions]   = useState([]);
  const [searching,     setSearching]     = useState(false);
  const [gpsLoading,    setGpsLoading]    = useState(false);
  const [pinDropped,    setPinDropped]    = useState(false);
  const [detectedWard,  setDetectedWard]  = useState("");

  function applyLocation(lat, lng, address, ward) {
    setSearchQuery(address);
    setDetectedWard(ward);
    setPinDropped(true);
    onWardChange?.(ward);
    onChange?.({ type: "Point", coordinates: [lng, lat], address });
  }

  useEffect(() => {
    if (instanceRef.current) return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    import("leaflet").then((L) => {
      if (instanceRef.current || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM,
        zoomControl: true, scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      map.on("click", async (e) => {
        const { lat, lng } = e.latlng;
        placeMarker(L, map, lat, lng);
        const { address, ward } = await reverseGeocode(lat, lng);
        applyLocation(lat, lng, address, ward);
      });

      instanceRef.current = map;
    });

    return () => {
      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }
    };
  }, []);

  function placeMarker(L, map, lat, lng) {
    const redIcon = L.divIcon({
      className: "",
      html: `<div style="width:22px;height:22px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);cursor:grab;"></div>`,
      iconSize: [22, 22], iconAnchor: [11, 11],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: redIcon, draggable: true }).addTo(map);
      markerRef.current.on("dragend", async (e) => {
        const { lat: newLat, lng: newLng } = e.target.getLatLng();
        const { address, ward } = await reverseGeocode(newLat, newLng);
        applyLocation(newLat, newLng, address, ward);
      });
    }
    map.setView([lat, lng], 15);
  }

  const searchTimeout = useRef(null);
  function handleSearchChange(e) {
    const val = e.target.value;
    setSearchQuery(val);
    setSuggestions([]);
    clearTimeout(searchTimeout.current);
    if (val.length < 3) return;
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      setSuggestions(await searchAddress(val));
      setSearching(false);
    }, 500);
  }

  async function handleSuggestionClick(item) {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setSuggestions([]);
    const { address, ward } = await reverseGeocode(lat, lng);
    applyLocation(lat, lng, address, ward);
    import("leaflet").then((L) => {
      if (!instanceRef.current) return;
      placeMarker(L, instanceRef.current, lat, lng);
    });
  }

  async function handleMyLocation() {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const { address, ward } = await reverseGeocode(lat, lng);
        applyLocation(lat, lng, address, ward);
        import("leaflet").then((L) => {
          if (!instanceRef.current) return;
          placeMarker(L, instanceRef.current, lat, lng);
        });
        setGpsLoading(false);
      },
      () => { setGpsLoading(false); alert("Could not get your location."); }
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search address or click on map…"
              className={`w-full rounded-lg border px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${error ? "border-red-400" : "border-gray-300"}`}
            />
            {searching && (
              <svg className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {suggestions.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto text-sm">
                {suggestions.map((s, i) => (
                  <li key={i} onClick={() => handleSuggestionClick(s)}
                    className="cursor-pointer px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0 truncate">
                    📍 {s.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" onClick={handleMyLocation} disabled={gpsLoading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {gpsLoading ? (
              <svg className="h-4 w-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            <span className="hidden sm:inline">My Location</span>
          </button>
        </div>
      </div>

      <div ref={mapRef} style={{ width: "100%", height: "280px", borderRadius: "0.5rem", border: `1px solid ${error ? "#f87171" : "#e2e8f0"}`, overflow: "hidden" }} />

      {pinDropped ? (
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Location set — drag the pin to fine-tune
          </p>
          {detectedWard && (
            <p className="flex items-center gap-1.5 text-xs text-blue-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Ward auto-detected: <span className="font-medium ml-1">{detectedWard}</span>
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">Click on the map or search an address to set location</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}