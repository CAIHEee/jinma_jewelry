const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|webp|gif|bmp|svg)$/i;
const SECOND_SUFFIX_PATTERN = /_\d{8}_\d{6}$/;

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

function formatSecondSuffix(value: string): string | null {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const date = new Date(timestamp);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

export function appendSecondSuffixToName(name: string, createdAt?: string | null): string {
  const sanitizedName = sanitizeFilenameSegment(name) || "image";
  const timestampSuffix = createdAt ? formatSecondSuffix(createdAt) : null;
  if (!timestampSuffix) {
    return sanitizedName;
  }

  if (IMAGE_EXTENSION_PATTERN.test(sanitizedName)) {
    const extension = sanitizedName.match(IMAGE_EXTENSION_PATTERN)?.[0] ?? "";
    const baseName = sanitizedName.slice(0, -extension.length);
    if (SECOND_SUFFIX_PATTERN.test(baseName)) {
      return sanitizedName;
    }
    return `${baseName}_${timestampSuffix}${extension}`;
  }

  if (SECOND_SUFFIX_PATTERN.test(sanitizedName)) {
    return sanitizedName;
  }

  return `${sanitizedName}_${timestampSuffix}`;
}

export function buildUploadedAssetName(username: string | null | undefined, name: string, createdAt?: string | null, fallbackExtension = ".png"): string {
  const sanitizedUsername = sanitizeFilenameSegment(username ?? "").replace(/\s+/g, "_") || "user";
  const timestampSuffix = createdAt ? formatSecondSuffix(createdAt) : null;
  const extension = extractExtensionFromUrl(name) ?? (IMAGE_EXTENSION_PATTERN.test(name) ? name.match(IMAGE_EXTENSION_PATTERN)?.[0]?.toLowerCase() ?? fallbackExtension : fallbackExtension);
  if (!timestampSuffix) {
    return `${sanitizedUsername}_upload${extension}`;
  }
  return `${sanitizedUsername}_upload_${timestampSuffix}${extension}`;
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
