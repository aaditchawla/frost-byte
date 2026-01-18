"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface RouteContextType {
  // Places
  originPlace: google.maps.places.PlaceResult | null;
  setOriginPlace: (place: google.maps.places.PlaceResult | null) => void;
  destinationPlace: google.maps.places.PlaceResult | null;
  setDestinationPlace: (place: google.maps.places.PlaceResult | null) => void;

  // Routes
  backendRoutes: any;
  setBackendRoutes: (routes: any) => void;
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string | null) => void;

  // Directions
  directionsResult: google.maps.DirectionsResult | null;
  setDirectionsResult: (result: google.maps.DirectionsResult | null) => void;

  // Map instance
  map: google.maps.Map | null;
  setMap: (map: google.maps.Map | null) => void;

  // Polylines
  routePolylines: google.maps.Polyline[];
  setRoutePolylines: (polylines: google.maps.Polyline[]) => void;

  // Services
  directionsService: google.maps.DirectionsService | null;
  setDirectionsService: (service: google.maps.DirectionsService | null) => void;
  directionsRenderer: google.maps.DirectionsRenderer | null;
  setDirectionsRenderer: (
    renderer: google.maps.DirectionsRenderer | null,
  ) => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export function RouteProvider({ children }: { children: ReactNode }) {
  const [originPlace, setOriginPlace] =
    useState<google.maps.places.PlaceResult | null>(null);
  const [destinationPlace, setDestinationPlace] =
    useState<google.maps.places.PlaceResult | null>(null);
  const [backendRoutes, setBackendRoutes] = useState<any>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [directionsResult, setDirectionsResult] =
    useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [routePolylines, setRoutePolylines] = useState<google.maps.Polyline[]>(
    [],
  );
  const [directionsService, setDirectionsService] =
    useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] =
    useState<google.maps.DirectionsRenderer | null>(null);

  return (
    <RouteContext.Provider
      value={{
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
        map,
        setMap,
        routePolylines,
        setRoutePolylines,
        directionsService,
        setDirectionsService,
        directionsRenderer,
        setDirectionsRenderer,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
}

export function useRouteContext() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRouteContext must be used within RouteProvider");
  }
  return context;
}
