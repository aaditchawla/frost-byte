"use client";

import { useState, useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

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
              // keep suggestions within Montreal
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

  return (
    <div className="min-h-screen ">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header/Search Bar */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 mb-8 border border-white/20 shadow-2xl">
          <div className="flex items-center gap-4 mb-6"></div>

          {/* Search Inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
              // onClick={handleFindRoute}
              className="bg-blue-300 hover:bg-blue-400 text-gray-800 font-semibold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border-0 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
            >
              Find Route
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
          <div
            id="map"
            className="w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl"
          ></div>
        </div>
      </div>
    </div>
  );
}
