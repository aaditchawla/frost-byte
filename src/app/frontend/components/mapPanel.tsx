"use client";

import { useEffect, useRef, useState, useCallback, useState } from "react";
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

  //get api key
  useEffect(() => {
    fetch("/api/maps-config")
      .then((res) => res.json())
      .then((data) => setApiKey(data.apiKey))
      .catch((error) => console.error("Failed to fetch maps config:", error));
  }, []);

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

  // Update user position on map
  const updateUserPosition = useCallback(
    (position: GeolocationPosition) => {
      if (!map) return;

      const { latitude, longitude } = position.coords;
      const userLocation = new google.maps.LatLng(latitude, longitude);

      // Create or update marker
      if (!userMarkerRef.current) {
        userMarkerRef.current = new google.maps.Marker({
          position: userLocation,
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          title: "Your location",
          zIndex: 1000,
        });
      } else {
        userMarkerRef.current.setPosition(userLocation);
      }
    },
    [map]
  );

  // Toggle location tracking on/off
  const toggleLocationTracking = useCallback(() => {
    if (!map) return;

    if (!isTracking) {
      // Start tracking
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by this browser");
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000,
      };

      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateUserPosition(position);
          // Center map on initial position
          const { latitude, longitude } = position.coords;
          map.panTo(new google.maps.LatLng(latitude, longitude));
          map.setZoom(16);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not access your location. Please check your browser permissions.");
          return;
        },
        options
      );

      // Watch position (updates every ~500ms)
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          updateUserPosition(position);
        },
        (error) => {
          console.error("Error watching location:", error);
        },
        options
      );

      setIsTracking(true);
    } else {
      // Stop tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      setIsTracking(false);
    }
  }, [map, isTracking, updateUserPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative h-full bg-gray-700 backdrop-blur-xl rounded-3xl p-4 border border-white/20 shadow-2xl">
      {/* Live Tracking button */}
      <button
        onClick={toggleLocationTracking}
        className={`absolute top-6 right-6 z-10 px-4 py-2 rounded-lg shadow-lg font-semibold transition-all duration-300 ${
          isTracking
            ? "bg-green-500 hover:bg-green-600 text-white"
            : "bg-white hover:bg-gray-100 text-gray-800"
        }`}
        title={isTracking ? "Stop live tracking" : "Start live tracking"}
      >
        {isTracking ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Live Tracking
          </span>
        ) : (
          "Live Tracking"
        )}
      </button>

      <div
        id="map"
        className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden shadow-2xl"
      />
    </div>
  );
}
