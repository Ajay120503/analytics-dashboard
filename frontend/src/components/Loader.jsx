import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";

const messages = [
  "Parsing your data...",
  "Analyzing columns & types...",
  "Computing statistical metrics...",
  "Detecting correlations & outliers...",
  "Generating charts & visualizations...",
  "Crafting AI-powered insights...",
  "Finalizing your dashboard...",
];

export default function Loader() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => Math.min(prev + 1, messages.length - 1));
    }, 2500);

    const progInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progInterval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 800);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-surface/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center max-w-sm">
        {/* Animated Logo */}
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent animate-pulse-slow opacity-20" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <BarChart3 className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
        </div>

        {/* Title */}
        <p className="text-lg font-semibold text-gray-200 mb-2">
          Processing Your Data
        </p>

        {/* Status message */}
        <p
          key={messageIndex}
          className="text-sm text-gray-400 transition-all duration-300 h-5"
          style={{
            animation: "fadeInUp 0.4s ease-out",
          }}
        >
          {messages[messageIndex]}
        </p>

        {/* Progress Bar */}
        <div className="mt-6 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <p className="text-xs text-gray-600 mt-2 font-mono">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}
