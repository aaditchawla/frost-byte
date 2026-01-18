import React from "react";
import MapComponent from "./components/mapComponent";
import SnowflakeMapsLogo from "./components/logo";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="flex flex-col">
        <h1 className="font-molle text-5xl font-bold text-blue-300 pt-4 px-12">
          Frostbyte
        </h1>
        {/* <SnowflakeMapsLogo /> */}
      </div>
      <div>
        <MapComponent />
      </div>
    </main>
  );
}
