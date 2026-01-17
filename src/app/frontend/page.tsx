import React from "react";
import MapComponent from "./components/mapComponent";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <h1 className="font-molle text-5xl font-bold text-blue-300 pt-12 px-12">
        Frostbyte
      </h1>
      <div>
        <MapComponent />
      </div>
    </main>
  );
}
