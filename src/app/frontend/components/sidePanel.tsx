// app/components/SidePanel.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { importLibrary } from "@googlemaps/js-api-loader";
import { useRouteContext } from "../contexts/routeContext";
import DirectionsSteps from "./DirectionsStepsComponent";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function SidePanel() {
  const {
    map,
    originPlace,
    setOriginPlace,
    destinationPlace,
    setDestinationPlace,
    backendRoutes,
    setBackendRoutes,
    selectedRouteId,
    setSelectedRouteId,
    directionsResult,
    setDirectionsResult,
    routePolylines,
    setRoutePolylines,
    directionsService,
    directionsRenderer,
  } = useRouteContext();

  const [originAutocomplete, setOriginAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [destinationAutocomplete, setDestinationAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(
    null,
  );
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

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

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.geometry) setOriginPlace(place);
          });

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

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.geometry) setDestinationPlace(place);
          });

          setDestinationAutocomplete(autocomplete);
        }
      })
      .catch((error) => console.error("Places library failed to load:", error));
  }, [map, setOriginPlace, setDestinationPlace]);

  const handleFindRoute = useCallback(async () => {
    if (!originAutocomplete || !destinationAutocomplete) return;

    const origin = originAutocomplete.getPlace();
    const destination = destinationAutocomplete.getPlace();

    if (!origin?.geometry?.location || !destination?.geometry?.location) {
      alert("Please select addresses from the dropdown suggestions");
      return;
    }

    setOriginPlace(origin);
    setDestinationPlace(destination);

    const start = [
      origin.geometry.location.lng(),
      origin.geometry.location.lat(),
    ];
    const end = [
      destination.geometry.location.lng(),
      destination.geometry.location.lat(),
    ];

    try {
      setIsLoadingRoutes(true);
      routePolylines.forEach((polyline) => polyline.setMap(null));
      setRoutePolylines([]);
      if (directionsRenderer) {
        directionsRenderer.setDirections({
          routes: [],
          request: undefined,
        });
      }
      setDirectionsResult(null);
      setSelectedRouteId(null);

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${backendUrl}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setBackendRoutes(data);

      if (data.routes && data.routes.length > 0 && map) {
        const newPolylines: google.maps.Polyline[] = [];

        data.routes.forEach((route: any) => {
          const path = route.overview_path.map((point: any) => ({
            lat: point.lat,
            lng: point.lng,
          }));

          const isChosen = route.id === data.chosen_route_id;
          const strokeColor =
            route.type === "recommended" ? "#00FF00" : "#0066FF";
          const strokeWeight = isChosen ? 5 : 3;

          const polyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor,
            strokeOpacity: 0.8,
            strokeWeight,
          });

          polyline.setMap(map);
          newPolylines.push(polyline);
        });

        setRoutePolylines(newPolylines);

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
      alert(
        `Could not calculate route: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoadingRoutes(false);
    }
  }, [
    originAutocomplete,
    destinationAutocomplete,
    map,
    routePolylines,
    directionsRenderer,
    setOriginPlace,
    setDestinationPlace,
    setBackendRoutes,
    setRoutePolylines,
    setDirectionsResult,
    setSelectedRouteId,
  ]);

  const handleRouteSelect = useCallback(
    async (route: any) => {
      if (
        !directionsService ||
        !directionsRenderer ||
        !originPlace ||
        !destinationPlace
      )
        return;
      if (
        !originPlace.geometry?.location ||
        !destinationPlace.geometry?.location
      ) {
        alert("Please select addresses first");
        return;
      }

      try {
        const pathPoints = route.overview_path;
        const totalPoints = pathPoints.length;
        const maxWaypoints = 21;
        const sampleInterval =
          totalPoints < 50
            ? 2
            : Math.max(2, Math.floor(totalPoints / maxWaypoints));

        const waypoints = pathPoints
          .filter(
            (_: any, index: number) =>
              index > 0 &&
              index < totalPoints - 1 &&
              index % sampleInterval === 0,
          )
          .slice(0, maxWaypoints)
          .map((point: any) => ({
            location: new google.maps.LatLng(point.lat, point.lng),
            stopover: false,
          }));

        const request: google.maps.DirectionsRequest = {
          origin: originPlace.geometry.location,
          destination: destinationPlace.geometry.location,
          waypoints: waypoints.length > 0 ? waypoints : undefined,
          travelMode: google.maps.TravelMode.WALKING,
          optimizeWaypoints: false,
        };

        const result = await directionsService.route(request);
        directionsRenderer.setDirections(result);
        setDirectionsResult(result);
        setSelectedRouteId(route.id);

        routePolylines.forEach((polyline, index) => {
          const routeId = backendRoutes?.routes[index]?.id;
          polyline.setOptions(
            routeId === route.id
              ? { strokeWeight: 6, strokeOpacity: 1.0, zIndex: 1000 }
              : { strokeWeight: 3, strokeOpacity: 0.5, zIndex: 1 },
          );
        });
      } catch (error) {
        console.error("Directions error:", error);
        alert("Could not get directions for this route.");
      }
    },
    [
      directionsService,
      directionsRenderer,
      originPlace,
      destinationPlace,
      routePolylines,
      backendRoutes,
      setDirectionsResult,
      setSelectedRouteId,
    ],
  );

  return (
    <div className="h-full bg-gray-700 backdrop-blur-xl rounded-3xl p-4 pt-2 border border-white/20 shadow-2xl overflow-y-auto">
      <div className="flex flex-col gap-4">
        {/* origin input */}
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
            className="w-full pl-12 pr-4 py-4 bg-gray-500 border border-gray-700 rounded-2xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
          />
        </div>

        {/* destination input */}
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
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
          <input
            id="destination"
            type="text"
            placeholder="Where to?"
            className="w-full pl-12 pr-4 py-4 bg-gray-500 border border-gray-700 rounded-2xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300/50 transition-all duration-300"
          />
        </div>

        <button
          onClick={handleFindRoute}
          className="bg-blue-300 hover:bg-blue-400 text-gray-800 font-semibold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border-0 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
        >
          Find Route
        </button>
        {/* loading animation */}
        {isLoadingRoutes && (
          <div className="flex justify-center items-center py-8">
            <DotLottieReact
              src="https://lottie.host/1b28c813-14b8-4b04-b076-cb6b60251141/AZVN07wieI.lottie"
              loop
              autoplay
              style={{ width: "220px", height: "220px" }}
            />
          </div>
        )}

        {/* route results */}
        {backendRoutes && !isLoadingRoutes && (
          <div className="mt-4 space-y-2">
            <h3 className="text-white font-semibold">Routes:</h3>
            {backendRoutes.routes.map((route: any) => (
              <div
                key={route.id}
                onClick={() => handleRouteSelect(route)}
                className={`p-3 rounded-lg cursor-pointer transition-all hover:scale-105 ${
                  route.id === backendRoutes.chosen_route_id
                    ? "bg-green-500/30 border-2 border-green-400"
                    : "bg-gray-700 border border-white/20 hover:bg-gray-600"
                } ${selectedRouteId === route.id ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent" : ""}`}
              >
                <div className="text-white text-sm">
                  <div className="font-bold flex items-center justify-between">
                    <span>{route.type.toUpperCase()}</span>
                  </div>
                  <div>Distance: {route.legs[0]?.distance?.text}</div>
                  <div>Duration: {route.legs[0]?.duration?.text}</div>
                  <div>Score: {route.score.toFixed(2)}</div>
                  <div className="text-xs text-blue-300 mt-2 flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    Click for directions
                  </div>
                </div>
              </div>
            ))}
            {backendRoutes.explanation && (
              <div className="mt-2 p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
                <p className="text-white text-xs">
                  {typeof backendRoutes.explanation === "string"
                    ? backendRoutes.explanation
                    : backendRoutes.explanation.explanation ||
                      "Route explanation"}
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
  );
}
