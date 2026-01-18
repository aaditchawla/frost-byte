"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import DirectionsSteps from "./DirectionsStepsComponent";

declare global {
  interface Window {
    mapInstance: any;
  }
}

export default function MapPage() {
  const [apiKey, setApiKey] = useState(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  );
  const [map, setMap] = useState(null);
  const mapRef = useRef(null);
  const [originAutocomplete, setOriginAutocomplete] = useState(null);
  const [destinationAutocomplete, setDestinationAutocomplete] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [routePolylines, setRoutePolylines] = useState<google.maps.Polyline[]>([]);
  const [backendRoutes, setBackendRoutes] = useState<any>(null);


  // load google maps
  useEffect(() => {
    if (!apiKey) return;

    setOptions({
      key: apiKey,
      v: "weekly",
      libraries: ["places", "directions"],
    });

    importLibrary("maps")
      .then((maps) => {
        console.log("Google Maps loaded");

        const mapElement = document.getElementById("map");
        if (mapElement && !window.mapInstance) {
          const newMap = new maps.Map(mapElement, {
            center: { lat: 45.506, lng: -73.5783 },
            zoom: 11,
          });
          setMap(newMap);
          window.mapInstance = newMap;
          console.log("mapInstance created:", window.mapInstance);
        }
      })
      .catch((error) => {
        console.error("Google Maps failed to load:", error);
      });
  }, [apiKey]);

  // Autocomplete setup
  useEffect(() => {
    if (!map) return;

    importLibrary("places")
      .then(() => {
        const originInput = document.getElementById(
          "origin",
        ) as HTMLInputElement;
        const destinationInput = document.getElementById(
          "destination",
        ) as HTMLInputElement;

        if (originInput) {
          const autocomplete = new google.maps.places.Autocomplete(
            originInput,
            {
              // allow addresses and place names
              types: ["geocode", "establishment"],
              // bounds are mtl
              bounds: {
                south: 45.39,
                west: -73.94,
                north: 45.75,
                east: -73.36,
              },
              strictBounds: true,
              componentRestrictions: { country: "ca" },
              fields: ["place_id", "name", "formatted_address", "geometry"],
            },
          );
          setOriginAutocomplete(autocomplete);
        }

        if (destinationInput) {
          const autocomplete = new google.maps.places.Autocomplete(
            destinationInput,
            {
              types: ["geocode", "establishment"],
              bounds: {
                south: 45.39,
                west: -73.94,
                north: 45.75,
                east: -73.36,
              },
              strictBounds: true,
              componentRestrictions: { country: "ca" },
              fields: ["place_id", "name", "formatted_address", "geometry"],
            },
          );
          setDestinationAutocomplete(autocomplete);
        }
      })
      .catch((error) => {
        console.error("Places library failed to load:", error);
      });
  }, [map]);

  // route rendering setup
  useEffect(() => {
    if (!map || !window.google?.maps) return;

    const service = new google.maps.DirectionsService();
    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      suppressInfoWindows: false,
    });

    setDirectionsService(service);
    setDirectionsRenderer(renderer);
  }, [map]);

  const handleFindRoute = useCallback(async () => {
    if (!originAutocomplete || !destinationAutocomplete) {
      console.log("Missing autocomplete services");
      return;
    }

    const originPlace = originAutocomplete.getPlace();
    const destinationPlace = destinationAutocomplete.getPlace();

    if (!originPlace?.geometry?.location || !destinationPlace?.geometry?.location) {
      alert("Please select addresses from the dropdown suggestions");
      return;
    }

    // Get coordinates from Google Places
    const start = [originPlace.geometry.location.lng(), originPlace.geometry.location.lat()]; // [lon, lat]
    const end = [destinationPlace.geometry.location.lng(), destinationPlace.geometry.location.lat()]; // [lon, lat]

    try {
      // Clear existing polylines
      routePolylines.forEach(polyline => polyline.setMap(null));
      setRoutePolylines([]);

      // Call your backend API
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${backendUrl}/route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start: start,
          end: end,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Backend response:", data);
      setBackendRoutes(data);

      // Display routes on map
      if (data.routes && data.routes.length > 0 && map) {
        const newPolylines: google.maps.Polyline[] = [];

        data.routes.forEach((route: any, index: number) => {
          const path = route.overview_path.map((point: any) => ({
            lat: point.lat,
            lng: point.lng,
          }));

          // Color: green for recommended route, blue for alternative, thicker for chosen route
          const isChosen = route.id === data.chosen_route_id;
          const strokeColor = route.type === "recommended" ? "#00FF00" : "#0066FF"; // Green for recommended, blue for alternative
          const strokeWeight = isChosen ? 5 : 3;

          const polyline = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: strokeColor,
            strokeOpacity: 0.8,
            strokeWeight: strokeWeight,
          });

          polyline.setMap(map);
          newPolylines.push(polyline);
        });

        setRoutePolylines(newPolylines);

        // Fit map to show all routes
        if (newPolylines.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          data.routes.forEach((route: any) => {
            route.overview_path.forEach((point: any) => {
              bounds.extend(new google.maps.LatLng(point.lat, point.lng));
            });
          });
          map.fitBounds(bounds);
        }
      }
    } catch (error) {
      console.error("Route error:", error);
      alert(`Could not calculate route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [originAutocomplete, destinationAutocomplete, map, routePolylines]);

  return (
    <div className="min-h-screen ">
      <div className="container mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* input + info panel */}
          <div className="lg:col-span-1 bg-white/10 backdrop-blur-xl rounded-3xl p-4 pt-2 mb-0 border border-white/20 shadow-2xl">
            <div className="flex items-center gap-4 mb-6"></div>

            <div className="flex flex-col gap-4">
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <input
                  id="origin"
                  type="text"
                  placeholder="Where are you?"
                  className="w-full pl-12 pr-4 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
                />
              </div>

              <div className="relative lg:col-span-1">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
                <input
                  id="destination"
                  type="text"
                  placeholder="Where to?"
                  className="w-full pl-12 pr-4 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300/50 transition-all duration-300"
                />
              </div>

              <button
                onClick={handleFindRoute}
                className="bg-blue-300 hover:bg-blue-400 text-gray-800 font-semibold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border-0 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
              >
                Find Route
              </button>

              {/* Display route info if available */}
              {backendRoutes && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-white font-semibold">Routes:</h3>
                  {backendRoutes.routes.map((route: any) => (
                    <div
                      key={route.id}
                      className={`p-3 rounded-lg ${
                        route.id === backendRoutes.chosen_route_id
                          ? "bg-green-500/30 border-2 border-green-400"
                          : "bg-white/10 border border-white/20"
                      }`}
                    >
                      <div className="text-white text-sm">
                        <div className="font-bold">{route.type.toUpperCase()}</div>
                        <div>Distance: {route.legs[0]?.distance?.text}</div>
                        <div>Duration: {route.legs[0]?.duration?.text}</div>
                        <div>Score: {route.score.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                  {backendRoutes.explanation && (
                    <div className="mt-2 p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
                      <p className="text-white text-xs">
                        {typeof backendRoutes.explanation === 'string' 
                          ? backendRoutes.explanation 
                          : backendRoutes.explanation.explanation || 'Route explanation'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <DirectionsSteps
                directionsResult={directionsResult}
                onStepSelect={setSelectedStepIndex}
              />
            </div>
          </div>

          {/* map panel */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
            <div
              id="map"
              className="w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl"
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
