import { useState, useEffect, useRef } from "react";

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
 * - Subtle zoom animation for engagement
 * - Parallax scrolling effect
 * - Respects user's motion preferences
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
  /** Enable parallax scrolling effect (default: true) */
  enableParallax?: boolean;
  /** Enable zoom animation (default: true) */
  enableZoom?: boolean;
}

export default function HeroImage({ 
  children, 
  height = "500px",
  showOverlay = true,
  enableParallax = true,
  enableZoom = true
}: HeroImageProps) {
  const [currentImage, setCurrentImage] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Select a random image on component mount
    const randomIndex = Math.floor(Math.random() * HERO_IMAGES.length);
    setCurrentImage(HERO_IMAGES[randomIndex] || HERO_IMAGES[0]);

    // Check user's motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    // Only enable parallax if user hasn't requested reduced motion
    if (!enableParallax || prefersReducedMotion) return;

    const handleScroll = () => {
      if (!heroRef.current) return;
      
      const heroRect = heroRef.current.getBoundingClientRect();
      const heroTop = heroRect.top;
      const heroHeight = heroRect.height;
      
      // Only apply parallax when hero is visible
      if (heroTop < window.innerHeight && heroTop + heroHeight > 0) {
        setScrollY(window.scrollY);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [enableParallax, prefersReducedMotion]);

  // Calculate parallax offset (moves slower than scroll)
  const parallaxOffset = enableParallax && !prefersReducedMotion ? scrollY * 0.5 : 0;

  return (
    <div 
      ref={heroRef}
      className="relative w-full overflow-hidden"
      style={{ height }}
    >
      {/* Hero Image with animations */}
      {currentImage && (
        <img
          src={currentImage}
          alt="Building Condition Assessment"
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            transform: `
              translateY(${parallaxOffset}px) 
              ${enableZoom && !prefersReducedMotion && isLoaded ? "scale(1.05)" : "scale(1)"}
            `,
            transition: prefersReducedMotion 
              ? "opacity 0.7s ease-in-out" 
              : "opacity 0.7s ease-in-out, transform 20s ease-out"
          }}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
      )}

      {/* Dark overlay for better text readability */}
      {showOverlay && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      {/* Content overlay with fade-in animation */}
      {children && (
        <div 
          className={`relative z-10 h-full flex items-center justify-center transition-all duration-1000 ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            transition: prefersReducedMotion 
              ? "opacity 1s ease-in-out" 
              : "opacity 1s ease-in-out, transform 1s ease-out"
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
