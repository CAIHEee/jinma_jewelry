const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|webp|gif|bmp|svg)$/i;

function sanitizeFilenameSegment(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "");
}

function extractExtensionFromUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url, "http://placeholder.local");
    const explicitFilename = parsed.searchParams.get("filename");
    if (explicitFilename) {
      const explicitMatch = explicitFilename.match(IMAGE_EXTENSION_PATTERN);
      if (explicitMatch) {
        return explicitMatch[0].toLowerCase();
      }
    }

    const pathname = decodeURIComponent(parsed.pathname);
    const pathnameMatch = pathname.match(IMAGE_EXTENSION_PATTERN);
    if (pathnameMatch) {
      return pathnameMatch[0].toLowerCase();
    }
  } catch {
    const fallbackMatch = url.match(IMAGE_EXTENSION_PATTERN);
    if (fallbackMatch) {
      return fallbackMatch[0].toLowerCase();
    }
  }

  return null;
}

export function buildDownloadFilename(name: string, url?: string | null, fallbackExtension = ".png"): string {
  const sanitizedName = sanitizeFilenameSegment(name) || "image";
  if (IMAGE_EXTENSION_PATTERN.test(sanitizedName)) {
    return sanitizedName;
  }

  return `${sanitizedName}${extractExtensionFromUrl(url) ?? fallbackExtension}`;
}

export function buildDownloadUrl(url: string | null | undefined, filename: string): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.pathname.endsWith("/api/v1/assets/content")) {
      parsed.searchParams.set("filename", filename);
      return parsed.toString();
    }
  } catch {
    return url;
  }

  return url;
}
