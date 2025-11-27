import { DesignSystemTemplate } from "./templates";

/**
 * Generate SVG icons for common UI elements
 */
export function generateSVGIcon(iconName: string, color: string = "currentColor"): string {
  const icons: Record<string, string> = {
    menu: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    search: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>`,
    user: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    heart: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
    bell: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
    home: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    mail: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>`,
    upload: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`,
    download: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>`,
    edit: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>`,
  };

  return icons[iconName] || icons.home;
}

/**
 * Generate loading spinner SVG
 */
export function generateLoadingSpinner(color: string): string {
  return `<svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="${color}" stroke-width="4"></circle>
  <path class="opacity-75" fill="${color}" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
</svg>`;
}

/**
 * Generate wireframe SVG for layout planning
 */
export function generateWireframe(layoutType: string): string {
  const wireframes: Record<string, string> = {
    "hero-section": `<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="800" height="400" fill="#f8f9fa"/>
  <rect x="50" y="80" width="300" height="30" fill="#dee2e6" rx="4"/>
  <rect x="50" y="130" width="400" height="20" fill="#dee2e6" rx="4"/>
  <rect x="50" y="160" width="350" height="20" fill="#dee2e6" rx="4"/>
  <rect x="50" y="220" width="150" height="40" fill="#495057" rx="8"/>
  <rect x="220" y="220" width="150" height="40" fill="none" stroke="#495057" stroke-width="2" rx="8"/>
</svg>`,
    "card-grid": `<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="800" height="400" fill="#f8f9fa"/>
  <rect x="40" y="40" width="220" height="300" fill="#ffffff" stroke="#dee2e6" rx="8"/>
  <rect x="290" y="40" width="220" height="300" fill="#ffffff" stroke="#dee2e6" rx="8"/>
  <rect x="540" y="40" width="220" height="300" fill="#ffffff" stroke="#dee2e6" rx="8"/>
  <rect x="60" y="60" width="180" height="120" fill="#dee2e6" rx="4"/>
  <rect x="310" y="60" width="180" height="120" fill="#dee2e6" rx="4"/>
  <rect x="560" y="60" width="180" height="120" fill="#dee2e6" rx="4"/>
</svg>`,
    "sidebar-layout": `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="800" height="600" fill="#f8f9fa"/>
  <rect x="0" y="0" width="200" height="600" fill="#343a40"/>
  <rect x="220" y="20" width="560" height="60" fill="#ffffff" stroke="#dee2e6" rx="8"/>
  <rect x="220" y="100" width="560" height="480" fill="#ffffff" stroke="#dee2e6" rx="8"/>
</svg>`,
    "dashboard": `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="800" height="600" fill="#f8f9fa"/>
  <rect x="20" y="20" width="370" height="180" fill="#ffffff" stroke="#dee2e6" rx="8"/>
  <rect x="410" y="20" width="370" height="180" fill="#ffffff" stroke="#dee2e6" rx="8"/>
  <rect x="20" y="220" width="370" height="360" fill="#ffffff" stroke="#dee2e6" rx="8"/>
  <rect x="410" y="220" width="370" height="360" fill="#ffffff" stroke="#dee2e6" rx="8"/>
</svg>`,
  };

  return wireframes[layoutType] || wireframes["hero-section"];
}

/**
 * Generate logo placeholder SVG
 */
export function generateLogoPlaceholder(companyName: string, colors: string[]): string {
  const initials = companyName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return `<svg width="200" height="60" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors[1] || colors[0]};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="50" height="50" x="5" y="5" rx="10" fill="url(#logoGrad)"/>
  <text x="30" y="40" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">${initials}</text>
  <text x="70" y="38" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#333">${companyName}</text>
</svg>`;
}

/**
 * Generate gradient background SVG
 */
export function generateGradientBackground(colors: string[], style: "linear" | "radial" = "linear"): string {
  if (style === "radial") {
    return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGrad">
      <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bgGrad)"/>
</svg>`;
  }

  return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${colors[1]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors[2] || colors[1]};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bgGrad)"/>
</svg>`;
}

/**
 * Generate component mockup as SVG
 */
export function generateComponentMockup(
  componentType: string,
  designSystem: DesignSystemTemplate
): string {
  switch (componentType) {
    case "button":
      return `<svg width="120" height="40" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="40" rx="${designSystem.borderRadius.base}" fill="${designSystem.colors.primary[0]}" />
  <text x="60" y="25" font-family="${designSystem.typography.fontFamily.sans}" font-size="14" fill="white" text-anchor="middle" font-weight="600">Click Me</text>
</svg>`;

    case "input":
      return `<svg width="300" height="40" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="40" rx="${designSystem.borderRadius.base}" fill="white" stroke="${designSystem.colors.neutral[4]}" stroke-width="1"/>
  <text x="12" y="25" font-family="${designSystem.typography.fontFamily.sans}" font-size="14" fill="${designSystem.colors.text.tertiary}">Enter text...</text>
</svg>`;

    case "card":
      return `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="200" rx="${designSystem.borderRadius.lg}" fill="white" filter="drop-shadow(${designSystem.shadows.base})"/>
  <rect x="20" y="20" width="260" height="100" rx="8" fill="${designSystem.colors.neutral[2]}"/>
  <rect x="20" y="140" width="120" height="16" rx="4" fill="${designSystem.colors.neutral[3]}"/>
  <rect x="20" y="165" width="180" height="12" rx="4" fill="${designSystem.colors.neutral[4]}"/>
</svg>`;

    case "navbar":
      return `<svg width="800" height="60" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="60" fill="${designSystem.colors.background}"/>
  <rect x="20" y="15" width="100" height="30" rx="4" fill="${designSystem.colors.primary[0]}"/>
  <rect x="650" y="20" width="60" height="20" rx="4" fill="${designSystem.colors.neutral[3]}"/>
  <rect x="720" y="20" width="60" height="20" rx="4" fill="${designSystem.colors.neutral[3]}"/>
</svg>`;

    default:
      return generateSVGIcon("home", designSystem.colors.primary[0]);
  }
}

/**
 * Generate color palette swatch
 */
export function generateColorSwatch(colors: string[], labels?: string[]): string {
  const swatchWidth = 60;
  const swatchHeight = 60;
  const totalWidth = colors.length * swatchWidth;

  return `<svg width="${totalWidth}" height="${swatchHeight + 30}" xmlns="http://www.w3.org/2000/svg">
  ${colors
    .map(
      (color, i) => `
    <rect x="${i * swatchWidth}" y="0" width="${swatchWidth}" height="${swatchHeight}" fill="${color}"/>
    <text x="${i * swatchWidth + swatchWidth / 2}" y="${swatchHeight + 20}" font-family="monospace" font-size="10" fill="#333" text-anchor="middle">${labels?.[i] || color}</text>
  `
    )
    .join("")}
</svg>`;
}

/**
 * Generate accessibility visualization
 */
export function generateAccessibilityDiagram(
  foreground: string,
  background: string,
  ratio: number
): string {
  const passes = ratio >= 4.5;
  const statusColor = passes ? "#10B981" : "#EF4444";

  return `<svg width="400" height="150" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="150" fill="#f8f9fa"/>
  <rect x="20" y="20" width="150" height="80" fill="${background}"/>
  <text x="95" y="65" font-family="Arial" font-size="18" fill="${foreground}" text-anchor="middle">Sample Text</text>
  <text x="200" y="40" font-family="Arial" font-size="14" fill="#333">Contrast Ratio:</text>
  <text x="200" y="65" font-family="Arial" font-size="24" fill="${statusColor}" font-weight="bold">${ratio.toFixed(2)}:1</text>
  <text x="200" y="90" font-family="Arial" font-size="14" fill="${statusColor}">${passes ? "✓ WCAG AA Pass" : "✗ WCAG AA Fail"}</text>
  <rect x="200" y="100" width="180" height="30" rx="4" fill="${statusColor}" opacity="0.1"/>
  <text x="290" y="120" font-family="Arial" font-size="12" fill="${statusColor}" text-anchor="middle">${passes ? "Accessible" : "Needs Improvement"}</text>
</svg>`;
}
