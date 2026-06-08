import { useEffect, useRef } from "react";

export default function ComplaintMap({ location, title = "Complaint Location" }) {
  const mapRef     = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!location?.lat || !location?.lng || instanceRef.current) return;

    // Dynamically load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id   = "leaflet-css";
      link.rel  = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    import("leaflet").then((L) => {
      if (instanceRef.current) return;

      instanceRef.current = L.map(mapRef.current, {
        center:          [location.lat, location.lng],
        zoom:            15,
        zoomControl:     true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(instanceRef.current);

      // Custom red marker
      const redIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:22px;height:22px;
          background:#ef4444;
          border:3px solid #fff;
          border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
        iconSize:   [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker([location.lat, location.lng], { icon: redIcon })
        .addTo(instanceRef.current)
        .bindPopup(`<strong>${title}</strong>${location.address ? `<br/><span style="color:#64748b;font-size:11px">${location.address}</span>` : ""}`)
        .openPopup();
    });

    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }
    };
  }, [location?.lat, location?.lng]);

  if (!location?.lat) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          Complaint Location
        </div>
        <a
          href={`https://maps.google.com?q=${location.lat},${location.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Open in Maps
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ width: "100%", height: "208px" }} />

      {/* Address footer */}
      {location.address && (
        <div className="flex items-center gap-2 bg-gray-50 border-t border-gray-200 px-4 py-2">
          <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          <p className="text-xs text-gray-600 truncate">{location.address}</p>
        </div>
      )}
    </div>
  );
}