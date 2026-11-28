const LOGO_PATH = '/brand/stratix-communications.svg'

/** Absolute URL of the Stratix Communications logo, from the caller's origin. */
export default function logoUrl(origin: string): string {
  return origin + LOGO_PATH
}

// Builds the absolute URL for the printed report's brand logo, served from `public/brand/`,
// using the origin the browser caller passes in (window.location.origin).
