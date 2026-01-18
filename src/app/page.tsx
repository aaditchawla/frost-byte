import React from "react";
import Image from "next/image";
import { RouteProvider } from "./frontend/contexts/routeContext";
import MapPanel from "./frontend/components/mapPanel";
import SidePanel from "./frontend/components/sidePanel";
import logo from "./frontend/images/logo.png";
import faqIcon from "./frontend/components/faq";

export default function HomePage() {
  return (
    <RouteProvider>
      <main className="h-screen flex flex-col overflow-hidden bg-gray-900">
        {/* Logo */}
        <header className="flex-shrink-0 px-8 py-3">
          <Image
            src={logo}
            alt="Frostbyte Logo"
            width={200}
            height={100}
            className="h-auto"
          />
        </header>

        <div className="flex-1 min-h-0 px-6 pb-6 flex flex-col lg:grid lg:grid-cols-3 lg:gap-4 gap-4 overflow-y-auto">
          {/* Side Panel */}
          <div className="flex-shrink-0 w-full lg:col-span-1 lg:h-full lg:overflow-y-auto">
            <SidePanel />
          </div>

          {/* Map Panel */}
          <div className="flex-shrink-0 w-full lg:col-span-2 lg:h-full h-[500px]">
            <MapPanel />
          </div>
        </div>
      </main>
    </RouteProvider>
  );
}
