import { ProjectType } from "../agents/types";

export type DesignStyle = "modern" | "bold" | "professional" | "playful";

export interface DesignSystemTemplate {
  name: string;
  description: string;
  colors: {
    primary: string[];
    secondary: string[];
    neutral: string[];
    semantic: {
      success: string[];
      warning: string[];
      error: string[];
      info: string[];
    };
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
  };
  typography: {
    fontFamily: {
      sans: string;
      heading: string;
      mono: string;
    };
    scale: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      "2xl": string;
      "3xl": string;
      "4xl": string;
      "5xl": string;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
    weights: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  spacing: {
    base: number;
    scale: number[];
  };
  borderRadius: {
    none: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    base: string;
    lg: string;
    xl: string;
  };
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
    wide: string;
  };
}

// Modern/Minimal Design System
const modernTemplate: DesignSystemTemplate = {
  name: "Modern Minimal",
  description: "Clean, spacious design with subtle shadows and soft colors",
  colors: {
    primary: ["#3B82F6", "#2563EB", "#1D4ED8", "#1E40AF", "#1E3A8A"],
    secondary: ["#8B5CF6", "#7C3AED", "#6D28D9", "#5B21B6", "#4C1D95"],
    neutral: ["#FFFFFF", "#F9FAFB", "#F3F4F6", "#E5E7EB", "#D1D5DB", "#9CA3AF", "#6B7280", "#4B5563", "#374151", "#1F2937", "#111827"],
    semantic: {
      success: ["#10B981", "#059669", "#047857"],
      warning: ["#F59E0B", "#D97706", "#B45309"],
      error: ["#EF4444", "#DC2626", "#B91C1C"],
      info: ["#3B82F6", "#2563EB", "#1D4ED8"],
    },
    background: "#FFFFFF",
    surface: "#F9FAFB",
    text: {
      primary: "#111827",
      secondary: "#6B7280",
      tertiary: "#9CA3AF",
    },
  },
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      heading: "'Inter', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    scale: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
    },
    lineHeight: {
      tight: "1.25",
      normal: "1.5",
      relaxed: "1.75",
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    base: 4,
    scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128],
  },
  borderRadius: {
    none: "0",
    sm: "0.25rem",
    base: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
  breakpoints: {
    mobile: "640px",
    tablet: "768px",
    desktop: "1024px",
    wide: "1280px",
  },
};

// Bold/Vibrant Design System
const boldTemplate: DesignSystemTemplate = {
  name: "Bold Vibrant",
  description: "High contrast, energetic design with bold colors and strong typography",
  colors: {
    primary: ["#F59E0B", "#D97706", "#B45309", "#92400E", "#78350F"],
    secondary: ["#EC4899", "#DB2777", "#BE185D", "#9F1239", "#831843"],
    neutral: ["#FFFFFF", "#FAF5FF", "#F3E8FF", "#E9D5FF", "#D8B4FE", "#C084FC", "#A855F7", "#9333EA", "#7E22CE", "#6B21A8", "#581C87"],
    semantic: {
      success: ["#22C55E", "#16A34A", "#15803D"],
      warning: ["#EAB308", "#CA8A04", "#A16207"],
      error: ["#F43F5E", "#E11D48", "#BE123C"],
      info: ["#06B6D4", "#0891B2", "#0E7490"],
    },
    background: "#0F0F23",
    surface: "#1A1A2E",
    text: {
      primary: "#FFFFFF",
      secondary: "#E9D5FF",
      tertiary: "#C084FC",
    },
  },
  typography: {
    fontFamily: {
      sans: "'Poppins', 'Roboto', sans-serif",
      heading: "'Outfit', 'Poppins', sans-serif",
      mono: "'Fira Code', 'Courier New', monospace",
    },
    scale: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.375rem",
      "2xl": "1.75rem",
      "3xl": "2.25rem",
      "4xl": "3rem",
      "5xl": "4rem",
    },
    lineHeight: {
      tight: "1.1",
      normal: "1.4",
      relaxed: "1.6",
    },
    weights: {
      normal: 400,
      medium: 600,
      semibold: 700,
      bold: 800,
    },
  },
  spacing: {
    base: 8,
    scale: [0, 8, 16, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192],
  },
  borderRadius: {
    none: "0",
    sm: "0.375rem",
    base: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 2px 4px 0 rgba(236, 72, 153, 0.1)",
    base: "0 4px 6px -1px rgba(236, 72, 153, 0.2), 0 2px 4px -1px rgba(236, 72, 153, 0.1)",
    lg: "0 10px 20px -5px rgba(236, 72, 153, 0.3), 0 4px 8px -2px rgba(236, 72, 153, 0.15)",
    xl: "0 20px 30px -10px rgba(236, 72, 153, 0.4), 0 10px 15px -5px rgba(236, 72, 153, 0.2)",
  },
  breakpoints: {
    mobile: "640px",
    tablet: "768px",
    desktop: "1024px",
    wide: "1440px",
  },
};

// Professional/Corporate Design System
const professionalTemplate: DesignSystemTemplate = {
  name: "Professional Corporate",
  description: "Conservative, trustworthy design with structured layouts",
  colors: {
    primary: ["#1E40AF", "#1E3A8A", "#1E3A8A", "#172554", "#0F172A"],
    secondary: ["#0F766E", "#115E59", "#134E4A", "#164E63", "#0C4A6E"],
    neutral: ["#FFFFFF", "#F8FAFC", "#F1F5F9", "#E2E8F0", "#CBD5E1", "#94A3B8", "#64748B", "#475569", "#334155", "#1E293B", "#0F172A"],
    semantic: {
      success: ["#16A34A", "#15803D", "#166534"],
      warning: ["#CA8A04", "#A16207", "#854D0E"],
      error: ["#DC2626", "#B91C1C", "#991B1B"],
      info: ["#0284C7", "#0369A1", "#075985"],
    },
    background: "#FFFFFF",
    surface: "#F8FAFC",
    text: {
      primary: "#0F172A",
      secondary: "#475569",
      tertiary: "#64748B",
    },
  },
  typography: {
    fontFamily: {
      sans: "'Open Sans', 'Arial', sans-serif",
      heading: "'Merriweather', 'Georgia', serif",
      mono: "'Courier New', monospace",
    },
    scale: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
    },
    lineHeight: {
      tight: "1.3",
      normal: "1.6",
      relaxed: "1.8",
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    base: 4,
    scale: [0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96],
  },
  borderRadius: {
    none: "0",
    sm: "0.125rem",
    base: "0.25rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    lg: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    xl: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  },
  breakpoints: {
    mobile: "640px",
    tablet: "768px",
    desktop: "1024px",
    wide: "1280px",
  },
};

// Playful/Creative Design System
const playfulTemplate: DesignSystemTemplate = {
  name: "Playful Creative",
  description: "Fun, unique design with whimsical elements and creative layouts",
  colors: {
    primary: ["#F472B6", "#EC4899", "#DB2777", "#BE185D", "#9F1239"],
    secondary: ["#A78BFA", "#8B5CF6", "#7C3AED", "#6D28D9", "#5B21B6"],
    neutral: ["#FFFFFF", "#FEF3C7", "#FDE68A", "#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#B45309", "#92400E", "#78350F", "#451A03"],
    semantic: {
      success: ["#34D399", "#10B981", "#059669"],
      warning: ["#FBBF24", "#F59E0B", "#D97706"],
      error: ["#FB7185", "#F43F5E", "#E11D48"],
      info: ["#60A5FA", "#3B82F6", "#2563EB"],
    },
    background: "#FFFBEB",
    surface: "#FFFFFF",
    text: {
      primary: "#78350F",
      secondary: "#92400E",
      tertiary: "#B45309",
    },
  },
  typography: {
    fontFamily: {
      sans: "'Quicksand', 'Nunito', sans-serif",
      heading: "'Fredoka', 'Baloo 2', cursive",
      mono: "'Space Mono', monospace",
    },
    scale: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.375rem",
      "2xl": "1.75rem",
      "3xl": "2.25rem",
      "4xl": "3rem",
      "5xl": "4rem",
    },
    lineHeight: {
      tight: "1.2",
      normal: "1.5",
      relaxed: "1.75",
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    base: 6,
    scale: [0, 6, 12, 18, 24, 30, 36, 48, 60, 72, 96, 120],
  },
  borderRadius: {
    none: "0",
    sm: "0.5rem",
    base: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 2px 4px 0 rgba(236, 72, 153, 0.15)",
    base: "0 4px 8px 0 rgba(236, 72, 153, 0.2)",
    lg: "0 8px 16px 0 rgba(236, 72, 153, 0.25)",
    xl: "0 12px 24px 0 rgba(236, 72, 153, 0.3)",
  },
  breakpoints: {
    mobile: "640px",
    tablet: "768px",
    desktop: "1024px",
    wide: "1280px",
  },
};

export const designSystemTemplates: Record<DesignStyle, DesignSystemTemplate> = {
  modern: modernTemplate,
  bold: boldTemplate,
  professional: professionalTemplate,
  playful: playfulTemplate,
};

export interface ProjectTypeDesignGuidelines {
  focusAreas: string[];
  keyComponents: string[];
  layoutPatterns: string[];
  interactionPatterns: string[];
  specificRequirements: string[];
}

export const projectTypeGuidelines: Record<ProjectType, ProjectTypeDesignGuidelines> = {
  website: {
    focusAreas: ["Hero sections", "CTAs", "Content hierarchy", "SEO structure"],
    keyComponents: ["Navigation bar", "Hero banner", "Feature cards", "Footer", "Contact forms"],
    layoutPatterns: ["Landing page", "About page", "Services/Features grid", "Contact page"],
    interactionPatterns: ["Scroll animations", "Hover effects", "Smooth scrolling", "Form validation"],
    specificRequirements: [
      "Mobile-first responsive design",
      "Fast loading times",
      "Clear visual hierarchy",
      "Strong CTAs above the fold",
    ],
  },
  web_app: {
    focusAreas: ["Dashboard layouts", "Data visualization", "Form patterns", "Navigation"],
    keyComponents: [
      "Sidebar navigation",
      "Data tables",
      "Charts/graphs",
      "Form inputs",
      "Modal dialogs",
      "Notification toasts",
    ],
    layoutPatterns: ["Dashboard grid", "List/detail view", "Settings pages", "User profile"],
    interactionPatterns: ["Drag and drop", "Inline editing", "Real-time updates", "Keyboard shortcuts"],
    specificRequirements: [
      "Efficient data display",
      "Clear user feedback",
      "Accessibility for power users",
      "Consistent form validation",
    ],
  },
  mobile_app: {
    focusAreas: ["Touch interactions", "Bottom navigation", "Safe areas", "Native feel"],
    keyComponents: [
      "Bottom tab bar",
      "Card components",
      "Pull-to-refresh",
      "Swipeable lists",
      "Action sheets",
    ],
    layoutPatterns: ["Tab navigation", "Stack navigation", "List views", "Profile screens"],
    interactionPatterns: ["Swipe gestures", "Long press", "Pull to refresh", "Haptic feedback"],
    specificRequirements: [
      "44px minimum touch targets",
      "Safe area insets for notched devices",
      "Platform-specific patterns (iOS/Android)",
      "Offline state handling",
    ],
  },
  database: {
    focusAreas: ["Schema visualization", "Data relationships", "Query building", "Admin interfaces"],
    keyComponents: ["ERD diagrams", "Table views", "Query builders", "Migration history", "Backup controls"],
    layoutPatterns: ["Schema explorer", "Query interface", "Admin dashboard", "Settings panel"],
    interactionPatterns: ["Drag-to-connect relationships", "Autocomplete queries", "Visual query building"],
    specificRequirements: [
      "Clear data relationships",
      "Syntax highlighting for SQL",
      "Error state displays",
      "Migration tracking UI",
    ],
  },
  web3_dapp: {
    focusAreas: ["Wallet connection", "Transaction states", "Gas fees", "Blockchain data"],
    keyComponents: [
      "Connect wallet button",
      "Transaction modals",
      "Gas estimator",
      "Token displays",
      "Network switcher",
      "Blockchain explorer links",
    ],
    layoutPatterns: ["Wallet dashboard", "Token swap interface", "NFT gallery", "Staking page"],
    interactionPatterns: ["Wallet connection flow", "Transaction signing", "Network switching", "Token approvals"],
    specificRequirements: [
      "Clear transaction states (pending, confirmed, failed)",
      "Gas fee prominence",
      "Network indicators",
      "Wallet disconnection handling",
      "Contract interaction feedback",
    ],
  },
};

export function getDesignTemplate(style: DesignStyle): DesignSystemTemplate {
  return designSystemTemplates[style] || designSystemTemplates.modern;
}

export function getProjectGuidelines(projectType: ProjectType): ProjectTypeDesignGuidelines {
  return projectTypeGuidelines[projectType];
}
