import { useState, useEffect } from "react";

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenSize: "sm" | "md" | "lg" | "xl" | "2xl";
  orientation: "portrait" | "landscape";
  platform: "ios" | "android" | "windows" | "mac" | "linux" | "unknown";
  browser: "safari" | "chrome" | "firefox" | "edge" | "samsung" | "opera" | "unknown";
  browserVersion: string;
  isIOSSafari: boolean;
  isAndroidChrome: boolean;
  isSamsungInternet: boolean;
}

/**
 * Hook to detect device type and capabilities
 * Useful for providing mobile-optimized experiences
 */
export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => getDeviceInfo());

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    const handleOrientationChange = () => {
      setDeviceInfo(getDeviceInfo());
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  return deviceInfo;
}

function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Detect platform
  let platform: DeviceInfo["platform"] = "unknown";
  if (/iPad|iPhone|iPod/.test(ua)) {
    platform = "ios";
  } else if (/Android/.test(ua)) {
    platform = "android";
  } else if (/Windows/.test(ua)) {
    platform = "windows";
  } else if (/Macintosh/.test(ua)) {
    platform = "mac";
  } else if (/Linux/.test(ua)) {
    platform = "linux";
  }

  // Detect browser
  let browser: DeviceInfo["browser"] = "unknown";
  let browserVersion = "unknown";
  
  if (/SamsungBrowser/i.test(ua)) {
    browser = "samsung";
    const match = ua.match(/SamsungBrowser\/([\d.]+)/);
    browserVersion = match ? match[1] : "unknown";
  } else if (/EdgiOS|Edge|Edg/i.test(ua)) {
    browser = "edge";
    const match = ua.match(/(?:Edge|Edg|EdgiOS)\/([\d.]+)/);
    browserVersion = match ? match[1] : "unknown";
  } else if (/OPR|Opera/i.test(ua)) {
    browser = "opera";
    const match = ua.match(/(?:OPR|Opera)\/([\d.]+)/);
    browserVersion = match ? match[1] : "unknown";
  } else if (/CriOS/i.test(ua)) {
    // Chrome on iOS
    browser = "chrome";
    const match = ua.match(/CriOS\/([\d.]+)/);
    browserVersion = match ? match[1] : "unknown";
  } else if (/FxiOS/i.test(ua)) {
    // Firefox on iOS
    browser = "firefox";
    const match = ua.match(/FxiOS\/([\d.]+)/);
    browserVersion = match ? match[1] : "unknown";
  } else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
    browser = "chrome";
    const match = ua.match(/Chrome\/([\d.]+)/);
    browserVersion = match ? match[1] : "unknown";
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = "safari";
    const match = ua.match(/Version\/([\d.]+)/);
    browserVersion = match ? match[1] : "unknown";
  } else if (/Firefox/i.test(ua)) {
    browser = "firefox";
    const match = ua.match(/Firefox\/([\d.]+)/);
    browserVersion = match ? match[1] : "unknown";
  }

  // Detect specific browser + platform combinations
  const isIOSSafari = platform === "ios" && browser === "safari";
  const isAndroidChrome = platform === "android" && browser === "chrome";
  const isSamsungInternet = browser === "samsung";

  // Detect touch capability
  const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0;

  // Detect mobile/tablet based on screen width and user agent
  const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTabletUA = /iPad|Android(?!.*Mobile)/i.test(ua);

  // Screen size breakpoints (matching Tailwind defaults)
  let screenSize: DeviceInfo["screenSize"] = "sm";
  if (width >= 1536) {
    screenSize = "2xl";
  } else if (width >= 1280) {
    screenSize = "xl";
  } else if (width >= 1024) {
    screenSize = "lg";
  } else if (width >= 768) {
    screenSize = "md";
  }

  // Determine device type
  const isMobile = isMobileUA || (width < 768 && isTouchDevice);
  const isTablet = isTabletUA || (width >= 768 && width < 1024 && isTouchDevice);
  const isDesktop = !isMobile && !isTablet;

  // Detect orientation
  const orientation: DeviceInfo["orientation"] = height > width ? "portrait" : "landscape";

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    screenSize,
    orientation,
    platform,
    browser,
    browserVersion,
    isIOSSafari,
    isAndroidChrome,
    isSamsungInternet,
  };
}

/**
 * Utility function to check if device is mobile (phone or tablet)
 */
export function isMobileDevice(): boolean {
  const { isMobile, isTablet } = getDeviceInfo();
  return isMobile || isTablet;
}

/**
 * Utility function to check if device has touch capability
 */
export function hasTouchSupport(): boolean {
  return getDeviceInfo().isTouchDevice;
}
