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
  const [directionsResult, setDirectionsResult] =
    useState<google.maps.DirectionsResult | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(
    null,
  );
  const [isStepsCollapsed, setIsStepsCollapsed] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

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
    if (
      !directionsService ||
      !directionsRenderer ||
      !originAutocomplete ||
      !destinationAutocomplete
    ) {
      console.log("Missing services");
      return;
    }

    const originPlace = originAutocomplete.getPlace();
    const destinationPlace = destinationAutocomplete.getPlace();

    if (!originPlace?.place_id || !destinationPlace?.place_id) {
      alert("Please select addresses from the dropdown suggestions");
      return;
    }

    const request: google.maps.DirectionsRequest = {
      origin: { placeId: originPlace.place_id },
      destination: { placeId: destinationPlace.place_id },
      travelMode: google.maps.TravelMode.WALKING,
      optimizeWaypoints: true,
    };

    try {
      const result = await directionsService.route(request);
      directionsRenderer.setDirections(result);
      setDirectionsResult(result); // ← ADD THIS LINE (1)
      console.log("Route calculated:", result);
    } catch (error) {
      console.error("Route error:", error);
      alert("Could not calculate route. Try different addresses.");
    }
  }, [
    directionsService,
    directionsRenderer,
    originAutocomplete,
    destinationAutocomplete,
  ]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
              {directionsResult && directionsResult.routes.length > 0 && (
                <div className="">
                  <div className="flex justify-between items-center">
                    <div className="text-center flex-1">
                      <p className="text-white text-l font-semibold">
                        {(
                          directionsResult.routes[0].legs.reduce(
                            (sum, leg) => sum + leg.distance.value,
                            0,
                          ) / 1000
                        ).toFixed(2)}{" "}
                        km
                      </p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-white text-l font-semibold">
                        {(() => {
                          const totalSeconds =
                            directionsResult.routes[0].legs.reduce(
                              (sum, leg) => sum + leg.duration.value,
                              0,
                            );
                          const hours = Math.floor(totalSeconds / 3600);
                          const minutes = Math.round(
                            (totalSeconds % 3600) / 60,
                          );
                          return hours > 0
                            ? `${hours}h ${minutes}m`
                            : `${minutes}m`;
                        })()}
                      </p>
                    </div>
                  </div>
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
