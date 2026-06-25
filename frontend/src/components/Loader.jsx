import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const messages = [
  "Parsing your data...",
  "Analyzing columns...",
  "Generating charts...",
  "Asking AI for insights...",
];

export default function Loader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-surface/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-gray-700" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div
            className="absolute inset-2 rounded-full border-4 border-t-accent border-r-transparent border-b-transparent border-l-transparent animate-spin animation-delay-150"
            style={{ animationDirection: "reverse" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xl font-semibold text-gray-200 animate-pulse">
            Processing
          </p>
          <p
            key={messageIndex}
            className="text-sm text-gray-400 animate-fadeIn transition-all duration-300"
          >
            {messages[messageIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
