"use client";

import { useEffect } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useRouteContext } from "../contexts/routeContext";

declare global {
  interface Window {
    mapInstance: google.maps.Map | null;
  }
}

export default function MapPanel() {
  const { map, setMap, setDirectionsService, setDirectionsRenderer } =
    useRouteContext();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Load Google Maps
  useEffect(() => {
    if (!apiKey) return;

    setOptions({
      key: apiKey,
      v: "weekly",
      libraries: ["places", "directions"],
    });

    importLibrary("maps")
      .then((maps) => {
        const mapElement = document.getElementById("map");
        if (mapElement && !window.mapInstance) {
          const newMap = new maps.Map(mapElement, {
            center: { lat: 45.506, lng: -73.5783 },
            zoom: 11,
          });
          setMap(newMap);
          window.mapInstance = newMap;
        }
      })
      .catch((error) => {
        console.error("Google Maps failed to load:", error);
      });
  }, [apiKey, setMap]);

  // initialize directions
  useEffect(() => {
    if (!map || !window.google?.maps) return;

    const service = new google.maps.DirectionsService();
    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      suppressInfoWindows: false,
      suppressPolylines: true, // Prevent DirectionsRenderer from drawing its own route (we use custom polylines)
    });

    setDirectionsService(service);
    setDirectionsRenderer(renderer);
  }, [map, setDirectionsService, setDirectionsRenderer]);

  return (
    <div className="h-full bg-gray-700 backdrop-blur-xl rounded-3xl p-4 border border-white/20 shadow-2xl">
      <div
        id="map"
        className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden shadow-2xl"
      />
    </div>
  );
}
