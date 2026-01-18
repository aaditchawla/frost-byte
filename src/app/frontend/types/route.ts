export interface RouteData {
  routes: any[];
  chosen_route_id: string;
  explanation?: string | { explanation: string };
}

export interface PlaceData {
  place: google.maps.places.PlaceResult | null;
  setPlace: (place: google.maps.places.PlaceResult | null) => void;
}
