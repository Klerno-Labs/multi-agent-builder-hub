import { DesignSystemTemplate } from "./templates";

export interface ComponentSpec {
  name: string;
  description: string;
  variants?: string[];
  sizes?: string[];
  states?: string[];
  props?: { name: string; type: string; required: boolean }[];
}

/**
 * Generate Tailwind CSS classes from design system
 */
export function generateTailwindConfig(designSystem: DesignSystemTemplate): string {
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '${designSystem.colors.primary[0]}',
          100: '${designSystem.colors.primary[0]}',
          200: '${designSystem.colors.primary[0]}',
          300: '${designSystem.colors.primary[0]}',
          400: '${designSystem.colors.primary[0]}',
          500: '${designSystem.colors.primary[0]}',
          600: '${designSystem.colors.primary[1]}',
          700: '${designSystem.colors.primary[2]}',
          800: '${designSystem.colors.primary[3]}',
          900: '${designSystem.colors.primary[4]}',
        },
        secondary: {
          500: '${designSystem.colors.secondary[0]}',
          600: '${designSystem.colors.secondary[1]}',
          700: '${designSystem.colors.secondary[2]}',
          800: '${designSystem.colors.secondary[3]}',
          900: '${designSystem.colors.secondary[4]}',
        },
      },
      fontFamily: {
        sans: ${JSON.stringify(designSystem.typography.fontFamily.sans.split(","))},
        heading: ${JSON.stringify(designSystem.typography.fontFamily.heading.split(","))},
        mono: ${JSON.stringify(designSystem.typography.fontFamily.mono.split(","))},
      },
      fontSize: ${JSON.stringify(designSystem.typography.scale, null, 2)},
      spacing: {
        ${designSystem.spacing.scale.map((s, i) => `'${i}': '${s}px'`).join(",\n        ")}
      },
      borderRadius: ${JSON.stringify(designSystem.borderRadius, null, 2)},
      boxShadow: ${JSON.stringify(designSystem.shadows, null, 2)},
      screens: ${JSON.stringify(designSystem.breakpoints, null, 2)},
    },
  },
  plugins: [],
};`;
}

/**
 * Generate CSS variables from design system
 */
export function generateCSSVariables(designSystem: DesignSystemTemplate): string {
  return `:root {
  /* Colors */
  --color-primary-500: ${designSystem.colors.primary[0]};
  --color-primary-600: ${designSystem.colors.primary[1]};
  --color-primary-700: ${designSystem.colors.primary[2]};
  --color-primary-800: ${designSystem.colors.primary[3]};
  --color-primary-900: ${designSystem.colors.primary[4]};

  --color-secondary-500: ${designSystem.colors.secondary[0]};
  --color-secondary-600: ${designSystem.colors.secondary[1]};
  --color-secondary-700: ${designSystem.colors.secondary[2]};

  --color-bg: ${designSystem.colors.background};
  --color-surface: ${designSystem.colors.surface};
  --color-text-primary: ${designSystem.colors.text.primary};
  --color-text-secondary: ${designSystem.colors.text.secondary};
  --color-text-tertiary: ${designSystem.colors.text.tertiary};

  --color-success-500: ${designSystem.colors.semantic.success[0]};
  --color-warning-500: ${designSystem.colors.semantic.warning[0]};
  --color-error-500: ${designSystem.colors.semantic.error[0]};
  --color-info-500: ${designSystem.colors.semantic.info[0]};

  /* Typography */
  --font-sans: ${designSystem.typography.fontFamily.sans};
  --font-heading: ${designSystem.typography.fontFamily.heading};
  --font-mono: ${designSystem.typography.fontFamily.mono};

  --text-xs: ${designSystem.typography.scale.xs};
  --text-sm: ${designSystem.typography.scale.sm};
  --text-base: ${designSystem.typography.scale.base};
  --text-lg: ${designSystem.typography.scale.lg};
  --text-xl: ${designSystem.typography.scale.xl};
  --text-2xl: ${designSystem.typography.scale["2xl"]};
  --text-3xl: ${designSystem.typography.scale["3xl"]};
  --text-4xl: ${designSystem.typography.scale["4xl"]};
  --text-5xl: ${designSystem.typography.scale["5xl"]};

  /* Spacing */
  ${designSystem.spacing.scale.map((s, i) => `--spacing-${i}: ${s}px;`).join("\n  ")}

  /* Border Radius */
  --radius-sm: ${designSystem.borderRadius.sm};
  --radius-base: ${designSystem.borderRadius.base};
  --radius-lg: ${designSystem.borderRadius.lg};
  --radius-xl: ${designSystem.borderRadius.xl};
  --radius-full: ${designSystem.borderRadius.full};

  /* Shadows */
  --shadow-sm: ${designSystem.shadows.sm};
  --shadow-base: ${designSystem.shadows.base};
  --shadow-lg: ${designSystem.shadows.lg};
  --shadow-xl: ${designSystem.shadows.xl};
}`;
}

/**
 * Generate React component with Tailwind CSS
 */
export function generateReactComponent(
  component: ComponentSpec,
  designSystem: DesignSystemTemplate
): string {
  const componentName = component.name;
  const hasVariants = component.variants && component.variants.length > 0;
  const hasSizes = component.sizes && component.sizes.length > 0;

  const variantStyles = hasVariants
    ? component.variants!.reduce(
        (acc, variant) => {
          acc[variant] = generateVariantStyles(variant, componentName, designSystem);
          return acc;
        },
        {} as Record<string, string>
      )
    : {};

  const sizeStyles = hasSizes
    ? component.sizes!.reduce(
        (acc, size) => {
          acc[size] = generateSizeStyles(size, componentName);
          return acc;
        },
        {} as Record<string, string>
      )
    : {};

  const propsInterface =
    component.props && component.props.length > 0
      ? component.props
          .map((p) => `${p.name}${p.required ? "" : "?"}: ${p.type}`)
          .join(";\n  ")
      : "";

  return `import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const ${componentName.toLowerCase()}Variants = cva(
  "${getBaseStyles(componentName, designSystem)}",
  {
    variants: {
      ${hasVariants ? `variant: ${JSON.stringify(variantStyles, null, 6)},` : ""}
      ${hasSizes ? `size: ${JSON.stringify(sizeStyles, null, 6)},` : ""}
    },
    defaultVariants: {
      ${hasVariants ? `variant: "${component.variants![0]}",` : ""}
      ${hasSizes ? `size: "${component.sizes![0]}",` : ""}
    },
  }
);

export interface ${componentName}Props
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof ${componentName.toLowerCase()}Variants> {
  ${propsInterface ? propsInterface + ";" : ""}
}

export const ${componentName} = React.forwardRef<HTMLDivElement, ${componentName}Props>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(${componentName.toLowerCase()}Variants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

${componentName}.displayName = '${componentName}';
`;
}

function getBaseStyles(componentName: string, designSystem: DesignSystemTemplate): string {
  // Component-specific base styles
  switch (componentName) {
    case "Button":
      return "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    case "Card":
      return `rounded-${designSystem.borderRadius.lg} border bg-white shadow-${designSystem.shadows.base} p-6`;
    case "Input":
      return `flex h-10 w-full rounded-${designSystem.borderRadius.base} border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50`;
    case "Badge":
      return "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors";
    default:
      return "inline-flex items-center justify-center";
  }
}

function generateVariantStyles(
  variant: string,
  componentName: string,
  designSystem: DesignSystemTemplate
): string {
  if (componentName === "Button") {
    switch (variant) {
      case "primary":
        return "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800";
      case "secondary":
        return "bg-secondary-600 text-white hover:bg-secondary-700 active:bg-secondary-800";
      case "outline":
        return "border-2 border-primary-600 text-primary-600 hover:bg-primary-50 active:bg-primary-100";
      case "ghost":
        return "hover:bg-gray-100 active:bg-gray-200";
      case "danger":
        return "bg-red-600 text-white hover:bg-red-700 active:bg-red-800";
      default:
        return "bg-gray-100 text-gray-900 hover:bg-gray-200";
    }
  } else if (componentName === "Badge") {
    switch (variant) {
      case "primary":
        return "bg-primary-100 text-primary-800";
      case "success":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }
  return "";
}

function generateSizeStyles(size: string, componentName: string): string {
  if (componentName === "Button") {
    switch (size) {
      case "sm":
        return "h-8 px-3 text-xs";
      case "md":
        return "h-10 px-4 text-sm";
      case "lg":
        return "h-12 px-6 text-base";
      case "xl":
        return "h-14 px-8 text-lg";
      default:
        return "h-10 px-4 text-sm";
    }
  } else if (componentName === "Input") {
    switch (size) {
      case "sm":
        return "h-8 text-xs";
      case "md":
        return "h-10 text-sm";
      case "lg":
        return "h-12 text-base";
      default:
        return "h-10 text-sm";
    }
  }
  return "";
}

/**
 * Generate Storybook story for component
 */
export function generateStorybookStory(component: ComponentSpec): string {
  return `import type { Meta, StoryObj } from '@storybook/react';
import { ${component.name} } from './${component.name}';

const meta: Meta<typeof ${component.name}> = {
  title: 'Components/${component.name}',
  component: ${component.name},
  tags: ['autodocs'],
  argTypes: {
    ${component.variants ? `variant: {\n      control: 'select',\n      options: ${JSON.stringify(component.variants)},\n    },` : ""}
    ${component.sizes ? `size: {\n      control: 'select',\n      options: ${JSON.stringify(component.sizes)},\n    },` : ""}
  },
};

export default meta;
type Story = StoryObj<typeof ${component.name}>;

export const Default: Story = {
  args: {
    ${component.variants ? `variant: '${component.variants[0]}',` : ""}
    ${component.sizes ? `size: '${component.sizes[0]}',` : ""}
  },
};

${
  component.variants
    ? component.variants
        .map(
          (variant) => `
export const ${variant.charAt(0).toUpperCase() + variant.slice(1)}: Story = {
  args: {
    variant: '${variant}',
  },
};`
        )
        .join("\n")
    : ""
}

${
  component.states
    ? component.states
        .map(
          (state) => `
export const ${state.charAt(0).toUpperCase() + state.slice(1)}: Story = {
  args: {
    ${state === "disabled" ? "disabled: true," : ""}
  },
};`
        )
        .join("\n")
    : ""
}
`;
}

/**
 * Generate HTML prototype
 */
export function generateHTMLPrototype(
  component: ComponentSpec,
  designSystem: DesignSystemTemplate
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${component.name} Component</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${generateCSSVariables(designSystem)}
  </style>
</head>
<body class="p-8 bg-gray-50">
  <div class="max-w-4xl mx-auto space-y-8">
    <h1 class="text-4xl font-bold text-gray-900">${component.name} Component</h1>
    <p class="text-lg text-gray-600">${component.description}</p>

    ${component.variants ? generateVariantExamples(component, designSystem) : ""}
    ${component.sizes ? generateSizeExamples(component, designSystem) : ""}
    ${component.states ? generateStateExamples(component, designSystem) : ""}
  </div>
</body>
</html>`;
}

function generateVariantExamples(
  component: ComponentSpec,
  designSystem: DesignSystemTemplate
): string {
  return `
    <section>
      <h2 class="text-2xl font-semibold mb-4">Variants</h2>
      <div class="flex flex-wrap gap-4">
        ${component.variants!.map(
          (variant) => `
        <div class="${getBaseStyles(component.name, designSystem)} ${generateVariantStyles(variant, component.name, designSystem)}">
          ${variant.charAt(0).toUpperCase() + variant.slice(1)}
        </div>`
        ).join("")}
      </div>
    </section>`;
}

function generateSizeExamples(
  component: ComponentSpec,
  designSystem: DesignSystemTemplate
): string {
  return `
    <section>
      <h2 class="text-2xl font-semibold mb-4">Sizes</h2>
      <div class="flex flex-wrap items-center gap-4">
        ${component.sizes!.map(
          (size) => `
        <div class="${getBaseStyles(component.name, designSystem)} ${generateSizeStyles(size, component.name)}">
          ${size.toUpperCase()}
        </div>`
        ).join("")}
      </div>
    </section>`;
}

function generateStateExamples(
  component: ComponentSpec,
  designSystem: DesignSystemTemplate
): string {
  return `
    <section>
      <h2 class="text-2xl font-semibold mb-4">States</h2>
      <div class="flex flex-wrap gap-4">
        ${component.states!.map(
          (state) => `
        <div class="${getBaseStyles(component.name, designSystem)}" ${state === "disabled" ? "disabled" : ""}>
          ${state.charAt(0).toUpperCase() + state.slice(1)}
        </div>`
        ).join("")}
      </div>
    </section>`;
}

/**
 * Generate design tokens JSON
 */
export function generateDesignTokens(designSystem: DesignSystemTemplate): string {
  return JSON.stringify(
    {
      colors: designSystem.colors,
      typography: designSystem.typography,
      spacing: designSystem.spacing,
      borderRadius: designSystem.borderRadius,
      shadows: designSystem.shadows,
      breakpoints: designSystem.breakpoints,
    },
    null,
    2
  );
}
