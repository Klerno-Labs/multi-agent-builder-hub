/**
 * Component Architecture - Patterns for building scalable React applications
 */

export type ComponentType = "atom" | "molecule" | "organism" | "template" | "page";
export type ComponentCategory = "layout" | "form" | "data-display" | "feedback" | "navigation" | "utility";

export interface ComponentSpec {
  name: string;
  type: ComponentType;
  category: ComponentCategory;
  description: string;
  props: PropSpec[];
  state?: StateSpec[];
  events?: EventSpec[];
  children?: boolean;
  example: string;
}

export interface PropSpec {
  name: string;
  type: string;
  required: boolean;
  default?: any;
  description: string;
}

export interface StateSpec {
  name: string;
  type: string;
  initial: any;
  description: string;
}

export interface EventSpec {
  name: string;
  payload?: string;
  description: string;
}

/**
 * Atomic Design Hierarchy
 * - Atoms: Basic building blocks (Button, Input, Text)
 * - Molecules: Simple groups of atoms (SearchBar, Card)
 * - Organisms: Complex groups of molecules (Header, ProductList)
 * - Templates: Page-level layouts
 * - Pages: Specific instances of templates with real data
 */

/**
 * Generate component library structure
 */
export function generateComponentStructure(projectName: string): {
  folders: string[];
  components: ComponentSpec[];
} {
  const folders = [
    "components/atoms",      // Basic elements
    "components/molecules",  // Simple combinations
    "components/organisms",  // Complex sections
    "components/templates",  // Page layouts
    "components/pages",      // Actual pages
    "components/shared",     // Shared utilities
    "hooks",                 // Custom React hooks
    "contexts",              // React contexts
    "utils",                 // Utility functions
    "types",                 // TypeScript types
  ];

  const components: ComponentSpec[] = [
    // Atoms
    {
      name: "Button",
      type: "atom",
      category: "form",
      description: "Primary button component with variants",
      props: [
        { name: "variant", type: "'primary' | 'secondary' | 'danger'", required: false, default: "'primary'", description: "Button style variant" },
        { name: "size", type: "'sm' | 'md' | 'lg'", required: false, default: "'md'", description: "Button size" },
        { name: "disabled", type: "boolean", required: false, default: "false", description: "Disabled state" },
        { name: "loading", type: "boolean", required: false, default: "false", description: "Loading state" },
        { name: "onClick", type: "() => void", required: false, description: "Click handler" },
      ],
      children: true,
      example: `<Button variant="primary" size="md" onClick={() => console.log('clicked')}>
  Click Me
</Button>`,
    },
    {
      name: "Input",
      type: "atom",
      category: "form",
      description: "Text input component with validation",
      props: [
        { name: "type", type: "'text' | 'email' | 'password' | 'number'", required: false, default: "'text'", description: "Input type" },
        { name: "placeholder", type: "string", required: false, description: "Placeholder text" },
        { name: "error", type: "string", required: false, description: "Error message" },
        { name: "disabled", type: "boolean", required: false, default: "false", description: "Disabled state" },
        { name: "value", type: "string", required: false, description: "Controlled value" },
        { name: "onChange", type: "(value: string) => void", required: false, description: "Change handler" },
      ],
      children: false,
      example: `<Input
  type="email"
  placeholder="Enter your email"
  error={errors.email}
  onChange={handleChange}
/>`,
    },
    // Molecules
    {
      name: "SearchBar",
      type: "molecule",
      category: "form",
      description: "Search input with button",
      props: [
        { name: "placeholder", type: "string", required: false, default: "'Search...'", description: "Placeholder text" },
        { name: "onSearch", type: "(query: string) => void", required: true, description: "Search handler" },
        { name: "loading", type: "boolean", required: false, default: "false", description: "Loading state" },
      ],
      children: false,
      example: `<SearchBar
  placeholder="Search products..."
  onSearch={handleSearch}
  loading={isSearching}
/>`,
    },
    {
      name: "Card",
      type: "molecule",
      category: "data-display",
      description: "Container for content with optional header/footer",
      props: [
        { name: "title", type: "string", required: false, description: "Card title" },
        { name: "footer", type: "React.ReactNode", required: false, description: "Footer content" },
        { name: "onClick", type: "() => void", required: false, description: "Click handler" },
      ],
      children: true,
      example: `<Card title="Product Name" footer={<Button>Buy Now</Button>}>
  <p>Product description goes here</p>
</Card>`,
    },
    // Organisms
    {
      name: "Header",
      type: "organism",
      category: "navigation",
      description: "Main navigation header",
      props: [
        { name: "logo", type: "string", required: true, description: "Logo image URL" },
        { name: "navItems", type: "NavItem[]", required: true, description: "Navigation items" },
        { name: "user", type: "User | null", required: false, description: "Logged in user" },
        { name: "onLogin", type: "() => void", required: false, description: "Login handler" },
        { name: "onLogout", type: "() => void", required: false, description: "Logout handler" },
      ],
      children: false,
      example: `<Header
  logo="/logo.svg"
  navItems={[{ label: 'Home', href: '/' }]}
  user={currentUser}
  onLogout={handleLogout}
/>`,
    },
  ];

  return { folders, components };
}

/**
 * Generate component template
 */
export function generateComponentTemplate(spec: ComponentSpec, framework: "react" | "next" = "next"): string {
  const propsInterface = generatePropsInterface(spec);
  const component = generateComponentCode(spec, framework);

  return `/**
 * ${spec.name} - ${spec.description}
 * Type: ${spec.type}
 * Category: ${spec.category}
 */

import React from 'react';

${propsInterface}

export const ${spec.name}: React.FC<${spec.name}Props> = (${generatePropsDestructure(spec)}) => {
${component}
};

${spec.name}.displayName = '${spec.name}';

export default ${spec.name};
`;
}

/**
 * Generate props interface
 */
function generatePropsInterface(spec: ComponentSpec): string {
  let interfaceCode = `export interface ${spec.name}Props {\n`;

  spec.props.forEach(prop => {
    const optional = !prop.required ? '?' : '';
    interfaceCode += `  /** ${prop.description} */\n`;
    interfaceCode += `  ${prop.name}${optional}: ${prop.type};\n`;
  });

  if (spec.children) {
    interfaceCode += `  /** Child elements */\n`;
    interfaceCode += `  children?: React.ReactNode;\n`;
  }

  interfaceCode += `}\n`;

  return interfaceCode;
}

/**
 * Generate props destructure
 */
function generatePropsDestructure(spec: ComponentSpec): string {
  const props = spec.props.map(p => {
    if (p.default) {
      return `${p.name} = ${p.default}`;
    }
    return p.name;
  });

  if (spec.children) {
    props.push('children');
  }

  return `{ ${props.join(', ')} }`;
}

/**
 * Generate component code
 */
function generateComponentCode(spec: ComponentSpec, framework: string): string {
  // Basic implementation
  if (spec.name === "Button") {
    return `  return (
    <button
      className={\`btn btn-\${variant} btn-\${size} \${disabled ? 'btn-disabled' : ''} \${loading ? 'btn-loading' : ''}\`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? 'Loading...' : children}
    </button>
  );`;
  }

  if (spec.name === "Input") {
    return `  return (
    <div className="input-wrapper">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={\`input \${error ? 'input-error' : ''}\`}
      />
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );`;
  }

  // Default template
  return `  return (
    <div className="${spec.name.toLowerCase()}">
      {/* ${spec.description} */}
      {children}
    </div>
  );`;
}

/**
 * Component composition patterns
 */
export const compositionPatterns = {
  /**
   * Compound Component Pattern
   * Components that work together (e.g., Tabs, Accordion)
   */
  compound: `// Compound Component Pattern
export const Tabs = ({ children, defaultTab }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
};

Tabs.List = ({ children }: TabsListProps) => (
  <div className="tabs-list">{children}</div>
);

Tabs.Tab = ({ value, children }: TabProps) => {
  const { activeTab, setActiveTab } = useTabsContext();
  return (
    <button
      className={\`tab \${activeTab === value ? 'active' : ''}\`}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
};

Tabs.Panel = ({ value, children }: TabPanelProps) => {
  const { activeTab } = useTabsContext();
  return activeTab === value ? <div className="tab-panel">{children}</div> : null;
};`,

  /**
   * Render Props Pattern
   * Pass render function as prop
   */
  renderProps: `// Render Props Pattern
interface DataFetcherProps<T> {
  url: string;
  render: (data: T | null, loading: boolean, error: Error | null) => React.ReactNode;
}

export const DataFetcher = <T,>({ url, render }: DataFetcherProps<T>) => {
  const { data, loading, error } = useFetch<T>(url);
  return <>{render(data, loading, error)}</>;
};

// Usage:
<DataFetcher url="/api/users" render={(data, loading, error) => {
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <UserList users={data} />;
}} />`,

  /**
   * Higher-Order Component (HOC) Pattern
   * Enhance component with additional functionality
   */
  hoc: `// Higher-Order Component Pattern
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithAuthComponent(props: P) {
    const { user, loading } = useAuth();

    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/login" />;

    return <Component {...props} />;
  };
}

// Usage:
const ProtectedPage = withAuth(DashboardPage);`,

  /**
   * Custom Hook Pattern
   * Extract reusable logic
   */
  customHook: `// Custom Hook Pattern
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return { value, toggle, setTrue, setFalse };
}

// Usage:
const { value: isOpen, toggle, setTrue: open, setFalse: close } = useToggle();`,
};

/**
 * Component best practices
 */
export const componentBestPractices = {
  naming: [
    "Use PascalCase for component names",
    "Use descriptive names (SearchBar, not SB)",
    "Prefix custom hooks with 'use' (useAuth, useToggle)",
    "Prefix event handlers with 'handle' (handleClick, handleSubmit)",
    "Prefix boolean props with 'is', 'has', 'should' (isLoading, hasError)",
  ],

  structure: [
    "One component per file",
    "Export component as default",
    "Group related components in folders",
    "Keep components small and focused (< 200 lines)",
    "Extract complex logic to custom hooks",
  ],

  props: [
    "Use TypeScript interfaces for props",
    "Document props with JSDoc comments",
    "Provide sensible defaults",
    "Avoid prop drilling (use Context or state management)",
    "Use discriminated unions for variant props",
  ],

  performance: [
    "Memoize expensive calculations with useMemo",
    "Memoize callbacks with useCallback",
    "Use React.memo for pure components",
    "Lazy load heavy components",
    "Virtualize long lists",
  ],

  accessibility: [
    "Use semantic HTML elements",
    "Add ARIA labels where needed",
    "Ensure keyboard navigation",
    "Maintain focus management",
    "Test with screen readers",
  ],
};

/**
 * Generate component index file
 */
export function generateComponentIndex(components: ComponentSpec[]): string {
  let indexFile = `/**
 * Component Library Index
 * Auto-generated component exports
 */

`;

  // Group by type
  const byType: Record<ComponentType, ComponentSpec[]> = {
    atom: [],
    molecule: [],
    organism: [],
    template: [],
    page: [],
  };

  components.forEach(comp => {
    byType[comp.type].push(comp);
  });

  // Export by type
  Object.entries(byType).forEach(([type, comps]) => {
    if (comps.length === 0) return;

    indexFile += `// ${type.charAt(0).toUpperCase() + type.slice(1)}s\n`;
    comps.forEach(comp => {
      indexFile += `export { default as ${comp.name} } from './${type}s/${comp.name}';\n`;
    });
    indexFile += `\n`;
  });

  return indexFile;
}

/**
 * Generate component documentation
 */
export function generateComponentDocs(spec: ComponentSpec): string {
  let docs = `# ${spec.name}

${spec.description}

**Type**: ${spec.type}
**Category**: ${spec.category}

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
`;

  spec.props.forEach(prop => {
    docs += `| \`${prop.name}\` | \`${prop.type}\` | ${prop.required ? 'Yes' : 'No'} | \`${prop.default || '-'}\` | ${prop.description} |\n`;
  });

  if (spec.children) {
    docs += `| \`children\` | \`React.ReactNode\` | No | - | Child elements |\n`;
  }

  docs += `\n## Example\n\n\`\`\`tsx\n${spec.example}\n\`\`\`\n`;

  return docs;
}

/**
 * Component testing template
 */
export function generateComponentTest(spec: ComponentSpec): string {
  return `/**
 * ${spec.name} Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ${spec.name} } from './${spec.name}';

describe('${spec.name}', () => {
  it('renders correctly', () => {
    render(<${spec.name} ${generateTestProps(spec)} />);
    expect(screen.getByRole('${getRole(spec)}')).toBeInTheDocument();
  });

  ${generateEventTests(spec)}

  ${generateAccessibilityTests(spec)}
});
`;
}

function generateTestProps(spec: ComponentSpec): string {
  const requiredProps = spec.props.filter(p => p.required);
  if (requiredProps.length === 0) return '';

  return requiredProps.map(p => `${p.name}={test${capitalize(p.name)}}`).join(' ');
}

function getRole(spec: ComponentSpec): string {
  if (spec.name === 'Button') return 'button';
  if (spec.name === 'Input') return 'textbox';
  return 'region';
}

function generateEventTests(spec: ComponentSpec): string {
  const eventProps = spec.props.filter(p => p.name.startsWith('on'));
  if (eventProps.length === 0) return '';

  return eventProps.map(prop => {
    const eventName = prop.name.replace('on', '').toLowerCase();
    return `  it('calls ${prop.name} when ${eventName}ed', () => {
    const ${prop.name} = jest.fn();
    render(<${spec.name} ${prop.name}={${prop.name}} />);
    fireEvent.${eventName}(screen.getByRole('${getRole(spec)}'));
    expect(${prop.name}).toHaveBeenCalled();
  });`;
  }).join('\n\n');
}

function generateAccessibilityTests(spec: ComponentSpec): string {
  return `  it('is accessible', async () => {
    const { container } = render(<${spec.name} ${generateTestProps(spec)} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
