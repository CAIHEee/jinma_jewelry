import { useEffect, useState } from "react";

type ViewportSize = "mobile" | "tablet" | "desktop";

function resolveViewportSize(width: number): ViewportSize {
  if (width < 768) {
    return "mobile";
  }
  if (width < 1280) {
    return "tablet";
  }
  return "desktop";
}

export function useViewport() {
  const [viewport, setViewport] = useState<ViewportSize>(() => {
    if (typeof window === "undefined") {
      return "desktop";
    }
    return resolveViewportSize(window.innerWidth);
  });

  useEffect(() => {
    function handleResize() {
      setViewport(resolveViewportSize(window.innerWidth));
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    viewport,
    isMobile: viewport === "mobile",
    isTablet: viewport === "tablet",
    isDesktop: viewport === "desktop",
  };
}
