export interface ColorContrastResult {
  passes: boolean;
  ratio: number;
  level: "AAA" | "AA" | "A" | "Fail";
  foreground: string;
  background: string;
}

export interface AccessibilityValidation {
  colorContrast: ColorContrastResult[];
  touchTargetSize: { passes: boolean; minSize: string; issues: string[] };
  keyboardNavigation: { documented: boolean; issues: string[] };
  ariaLabels: { documented: boolean; missing: string[] };
  focusIndicators: { defined: boolean; issues: string[] };
}

export interface DesignConsistencyCheck {
  colorUsage: { consistent: boolean; issues: string[] };
  spacingViolations: string[];
  typographyIssues: string[];
  componentCompleteness: { component: string; missingStates: string[] }[];
}

/**
 * Calculate WCAG contrast ratio between two colors
 */
export function calculateContrastRatio(foreground: string, background: string): number {
  const getLuminance = (hex: string): number => {
    // Remove # if present
    hex = hex.replace("#", "");

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Apply gamma correction
    const gammaCorrect = (val: number) =>
      val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);

    const rL = gammaCorrect(r);
    const gL = gammaCorrect(g);
    const bL = gammaCorrect(b);

    // Calculate relative luminance
    return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color contrast meets WCAG standards
 */
export function validateColorContrast(
  foreground: string,
  background: string,
  isLargeText = false
): ColorContrastResult {
  const ratio = calculateContrastRatio(foreground, background);

  let level: "AAA" | "AA" | "A" | "Fail";
  let passes: boolean;

  if (isLargeText) {
    // Large text (18pt+ or 14pt+ bold)
    if (ratio >= 4.5) {
      level = "AAA";
      passes = true;
    } else if (ratio >= 3) {
      level = "AA";
      passes = true;
    } else if (ratio >= 2) {
      level = "A";
      passes = false;
    } else {
      level = "Fail";
      passes = false;
    }
  } else {
    // Normal text
    if (ratio >= 7) {
      level = "AAA";
      passes = true;
    } else if (ratio >= 4.5) {
      level = "AA";
      passes = true;
    } else if (ratio >= 3) {
      level = "A";
      passes = false;
    } else {
      level = "Fail";
      passes = false;
    }
  }

  return { passes, ratio, level, foreground, background };
}

/**
 * Validate all text/background color combinations in a design system
 */
export function validateDesignSystemContrast(colors: {
  text: { primary: string; secondary: string; tertiary: string };
  background: string;
  surface: string;
}): ColorContrastResult[] {
  const results: ColorContrastResult[] = [];

  // Check primary text on both backgrounds
  results.push(validateColorContrast(colors.text.primary, colors.background));
  results.push(validateColorContrast(colors.text.primary, colors.surface));

  // Check secondary text
  results.push(validateColorContrast(colors.text.secondary, colors.background));
  results.push(validateColorContrast(colors.text.secondary, colors.surface));

  // Check tertiary text
  results.push(validateColorContrast(colors.text.tertiary, colors.background));
  results.push(validateColorContrast(colors.text.tertiary, colors.surface));

  return results;
}

/**
 * Generate accessible color palettes
 */
export function generateAccessiblePalette(baseColor: string): {
  lightest: string;
  light: string;
  base: string;
  dark: string;
  darkest: string;
} {
  // This is a simplified version - in production would use a proper color library
  return {
    lightest: baseColor + "20", // 20% opacity approximation
    light: baseColor + "60",
    base: baseColor,
    dark: adjustBrightness(baseColor, -20),
    darkest: adjustBrightness(baseColor, -40),
  };
}

function adjustBrightness(hex: string, percent: number): string {
  hex = hex.replace("#", "");

  const num = parseInt(hex, 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
      .toUpperCase()
  );
}

/**
 * Validate touch target sizes for mobile
 */
export function validateTouchTargets(components: {
  name: string;
  minHeight: string;
  minWidth: string;
}[]): {
  passes: boolean;
  minSize: string;
  issues: string[];
} {
  const MIN_TOUCH_TARGET = 44; // iOS minimum
  const issues: string[] = [];

  for (const component of components) {
    const height = parseSizeInPx(component.minHeight);
    const width = parseSizeInPx(component.minWidth);

    if (height < MIN_TOUCH_TARGET || width < MIN_TOUCH_TARGET) {
      issues.push(
        `${component.name}: ${width}x${height}px (minimum is ${MIN_TOUCH_TARGET}x${MIN_TOUCH_TARGET}px)`
      );
    }
  }

  return {
    passes: issues.length === 0,
    minSize: `${MIN_TOUCH_TARGET}x${MIN_TOUCH_TARGET}px`,
    issues,
  };
}

function parseSizeInPx(size: string): number {
  if (size.endsWith("px")) {
    return parseInt(size);
  } else if (size.endsWith("rem")) {
    return parseFloat(size) * 16; // Assume 16px base
  }
  return 0;
}

/**
 * Check component state completeness
 */
export function validateComponentStates(components: {
  name: string;
  states: string[];
}[]): { component: string; missingStates: string[] }[] {
  const REQUIRED_STATES = ["default", "hover", "active", "disabled", "focus"];
  const issues: { component: string; missingStates: string[] }[] = [];

  for (const component of components) {
    const missing = REQUIRED_STATES.filter(
      (state) => !component.states.includes(state)
    );

    if (missing.length > 0) {
      issues.push({ component: component.name, missingStates: missing });
    }
  }

  return issues;
}

/**
 * Validate spacing consistency
 */
export function validateSpacingScale(
  usedSpacing: number[],
  definedScale: number[]
): string[] {
  const issues: string[] = [];

  for (const value of usedSpacing) {
    if (!definedScale.includes(value)) {
      issues.push(
        `Spacing value ${value}px not in defined scale. Use one of: ${definedScale.join(", ")}`
      );
    }
  }

  return issues;
}

/**
 * Validate typography scale usage
 */
export function validateTypographyUsage(
  usedSizes: string[],
  definedSizes: string[]
): string[] {
  const issues: string[] = [];

  for (const size of usedSizes) {
    if (!definedSizes.includes(size)) {
      issues.push(
        `Font size ${size} not in defined scale. Use one of: ${definedSizes.join(", ")}`
      );
    }
  }

  return issues;
}

/**
 * Comprehensive design system validation
 */
export function validateDesignSystem(designSystem: {
  colors: any;
  components: { name: string; states: string[] }[];
  spacing: { usedValues: number[]; scale: number[] };
  typography: { usedSizes: string[]; definedSizes: string[] };
  touchTargets?: { name: string; minHeight: string; minWidth: string }[];
}): {
  accessibility: Partial<AccessibilityValidation>;
  consistency: DesignConsistencyCheck;
  overallScore: number;
} {
  // Validate color contrast
  const colorContrast = validateDesignSystemContrast(designSystem.colors);

  // Validate component states
  const componentCompleteness = validateComponentStates(designSystem.components);

  // Validate spacing
  const spacingViolations = validateSpacingScale(
    designSystem.spacing.usedValues,
    designSystem.spacing.scale
  );

  // Validate typography
  const typographyIssues = validateTypographyUsage(
    designSystem.typography.usedSizes,
    designSystem.typography.definedSizes
  );

  // Validate touch targets if provided
  let touchTargetValidation;
  if (designSystem.touchTargets) {
    touchTargetValidation = validateTouchTargets(designSystem.touchTargets);
  }

  // Calculate overall score
  const totalChecks =
    colorContrast.length +
    designSystem.components.length +
    designSystem.spacing.usedValues.length +
    designSystem.typography.usedSizes.length;

  const passedChecks =
    colorContrast.filter((c) => c.passes).length +
    (designSystem.components.length - componentCompleteness.length) +
    (designSystem.spacing.usedValues.length - spacingViolations.length) +
    (designSystem.typography.usedSizes.length - typographyIssues.length);

  const overallScore = Math.round((passedChecks / totalChecks) * 100);

  return {
    accessibility: {
      colorContrast,
      touchTargetSize: touchTargetValidation,
    },
    consistency: {
      colorUsage: {
        consistent: colorContrast.every((c) => c.passes),
        issues: colorContrast
          .filter((c) => !c.passes)
          .map(
            (c) =>
              `Low contrast (${c.ratio.toFixed(2)}:1): ${c.foreground} on ${c.background}`
          ),
      },
      spacingViolations,
      typographyIssues,
      componentCompleteness,
    },
    overallScore,
  };
}
