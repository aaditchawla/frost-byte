"use client";

import { useState } from "react";

export default function DirectionsSteps({ directionsResult, onStepSelect }) {
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);

  const handleStepClick = (index) => {
    setSelectedStepIndex(index);
    onStepSelect?.(index);
  };

  if (!directionsResult?.routes?.[0]?.legs?.[0]?.steps) return null;

  const steps = directionsResult.routes[0].legs[0].steps;
  const totalSteps = steps.length;

  return (
    <div className="mt-6 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-900/50 rounded-2xl p-4 bg-white/10 backdrop-blur-sm border border-white/20">
      <h3 className="text-white font-semibold mb-4 text-lg flex items-center gap-2">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        Walking Directions ({totalSteps} steps)
      </h3>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            onClick={() => handleStepClick(index)}
            className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 group ${
              index === selectedStepIndex
                ? "bg-blue-500/20 border-blue-400 shadow-lg scale-105"
                : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40 hover:scale-102"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  index === selectedStepIndex
                    ? "bg-blue-500 text-white"
                    : "bg-white/20 text-white group-hover:bg-white/30"
                }`}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-white font-medium mb-1 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: step.instructions }}
                />
                <p className="text-slate-300 text-sm">
                  {step.distance?.text || ""} • {step.duration?.text || ""}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
