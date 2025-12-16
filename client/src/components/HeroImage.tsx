import { useState, useEffect } from "react";

/**
 * HeroImage component displays a random hero image from the collection
 * on each page load, providing visual variety for the landing page.
 * 
 * Industry best practices implemented:
 * - Random selection on mount (better UX than time-based rotation)
 * - Lazy loading for performance
 * - Responsive image sizing
 * - Overlay support for text content
 * - Smooth fade-in animation
 */

const HERO_IMAGES = [
  "/hero-images/hero-1.png",
  "/hero-images/hero-2.png",
  "/hero-images/hero-3.png",
  "/hero-images/hero-4.png",
  "/hero-images/hero-5.png",
  "/hero-images/hero-6.png",
  "/hero-images/hero-7.png",
  "/hero-images/hero-8.png",
  "/hero-images/hero-9.png",
  "/hero-images/hero-10.png",
  "/hero-images/hero-11.png",
];

interface HeroImageProps {
  /** Optional overlay content to display on top of the image */
  children?: React.ReactNode;
  /** Height of the hero section (default: 500px) */
  height?: string;
  /** Whether to show a dark overlay for better text readability */
  showOverlay?: boolean;
}

export default function HeroImage({ 
  children, 
  height = "500px",
  showOverlay = true 
}: HeroImageProps) {
  const [currentImage, setCurrentImage] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Select a random image on component mount
    const randomIndex = Math.floor(Math.random() * HERO_IMAGES.length);
    setCurrentImage(HERO_IMAGES[randomIndex] || HERO_IMAGES[0]);
  }, []);

  return (
    <div 
      className="relative w-full overflow-hidden"
      style={{ height }}
    >
      {/* Hero Image */}
      {currentImage && (
        <img
          src={currentImage}
          alt="Building Condition Assessment"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
      )}

      {/* Dark overlay for better text readability */}
      {showOverlay && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      {/* Content overlay */}
      {children && (
        <div className="relative z-10 h-full flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
