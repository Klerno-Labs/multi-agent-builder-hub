/**
 * Performance Optimization - Patterns for fast, efficient React applications
 */

export interface PerformanceConfig {
  enableCodeSplitting: boolean;
  enableLazyLoading: boolean;
  enableImageOptimization: boolean;
  enableBundleAnalysis: boolean;
  targetBundleSize: number; // KB
}

export interface OptimizationStrategy {
  name: string;
  description: string;
  implementation: string;
  impact: "high" | "medium" | "low";
}

/**
 * Code splitting strategies
 */
export const codeSplittingPatterns = {
  /**
   * Route-based code splitting (Most common)
   */
  routeBased: `// Route-based Code Splitting
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load route components
const HomePage = lazy(() => import('./pages/HomePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}`,

  /**
   * Component-based code splitting
   */
  componentBased: `// Component-based Code Splitting
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const HeavyChart = lazy(() => import('./components/HeavyChart'));
const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));

export function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>

      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <HeavyChart data={chartData} />
        </Suspense>
      )}
    </div>
  );
}`,

  /**
   * Conditional loading
   */
  conditional: `// Conditional Loading
import { lazy } from 'react';

const AdminPanel = lazy(() => import('./components/AdminPanel'));
const UserPanel = lazy(() => import('./components/UserPanel'));

export function Dashboard({ userRole }: { userRole: 'admin' | 'user' }) {
  const Panel = userRole === 'admin' ? AdminPanel : UserPanel;

  return (
    <Suspense fallback={<Loading />}>
      <Panel />
    </Suspense>
  );
}`,
};

/**
 * Image optimization patterns
 */
export const imageOptimizationPatterns = {
  /**
   * Next.js Image component (Recommended for Next.js)
   */
  nextImage: `// Next.js Image Optimization
import Image from 'next/image';

export function ProductCard({ product }) {
  return (
    <div>
      <Image
        src={product.imageUrl}
        alt={product.name}
        width={300}
        height={300}
        placeholder="blur"
        blurDataURL={product.blurDataUrl}
        loading="lazy"
        quality={85}
        sizes="(max-width: 768px) 100vw, 300px"
      />
    </div>
  );
}`,

  /**
   * Lazy loading images with Intersection Observer
   */
  lazyLoad: `// Lazy Load Images
import { useEffect, useRef, useState } from 'react';

export function LazyImage({ src, alt, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isInView ? src : '/placeholder.jpg'}
      alt={alt}
      onLoad={() => setIsLoaded(true)}
      className={\`transition-opacity \${isLoaded ? 'opacity-100' : 'opacity-0'}\`}
      {...props}
    />
  );
}`,

  /**
   * Responsive images
   */
  responsive: `// Responsive Images
export function ResponsiveImage({ src, alt }) {
  return (
    <picture>
      <source
        media="(max-width: 640px)"
        srcSet={\`\${src}-small.webp\`}
        type="image/webp"
      />
      <source
        media="(max-width: 1024px)"
        srcSet={\`\${src}-medium.webp\`}
        type="image/webp"
      />
      <source
        srcSet={\`\${src}-large.webp\`}
        type="image/webp"
      />
      <img src={\`\${src}.jpg\`} alt={alt} loading="lazy" />
    </picture>
  );
}`,
};

/**
 * List virtualization for long lists
 */
export const virtualizationPatterns = {
  /**
   * React Virtual (Tanstack Virtual)
   */
  reactVirtual: `// Virtualized List with Tanstack Virtual
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualList({ items }: { items: any[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Estimated row height
    overscan: 5, // Number of items to render outside viewport
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div
        style={{
          height: \`\${virtualizer.getTotalSize()}px\`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: \`\${virtualItem.size}px\`,
              transform: \`translateY(\${virtualItem.start}px)\`,
            }}
          >
            <div>{items[virtualItem.index].name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}`,

  /**
   * Infinite scroll
   */
  infiniteScroll: `// Infinite Scroll
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';

export function InfiniteList() {
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['items'],
    queryFn: ({ pageParam = 1 }) => fetchItems(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  return (
    <div>
      {data?.pages.map((page) =>
        page.items.map((item) => <div key={item.id}>{item.name}</div>)
      )}
      <div ref={ref}>{isFetchingNextPage && <Loading />}</div>
    </div>
  );
}`,
};

/**
 * Memoization patterns
 */
export const memoizationPatterns = {
  /**
   * useMemo for expensive calculations
   */
  useMemo: `// useMemo for Expensive Calculations
export function DataTable({ data, filters }) {
  // Memoize filtered data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      return (
        item.name.includes(filters.search) &&
        item.category === filters.category
      );
    });
  }, [data, filters]);

  // Memoize sorted data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) =>
      a[filters.sortBy].localeCompare(b[filters.sortBy])
    );
  }, [filteredData, filters.sortBy]);

  return <Table data={sortedData} />;
}`,

  /**
   * useCallback for event handlers
   */
  useCallback: `// useCallback for Event Handlers
export function TodoList({ todos, onToggle, onDelete }) {
  // Memoize handlers to prevent child re-renders
  const handleToggle = useCallback((id: string) => {
    onToggle(id);
  }, [onToggle]);

  const handleDelete = useCallback((id: string) => {
    onDelete(id);
  }, [onDelete]);

  return (
    <div>
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}`,

  /**
   * React.memo for pure components
   */
  reactMemo: `// React.memo for Pure Components
export const TodoItem = React.memo(({ todo, onToggle, onDelete }) => {
  console.log('TodoItem render:', todo.id);

  return (
    <div>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <span>{todo.text}</span>
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function (optional)
  return (
    prevProps.todo.id === nextProps.todo.id &&
    prevProps.todo.completed === nextProps.todo.completed &&
    prevProps.todo.text === nextProps.todo.text
  );
});`,
};

/**
 * Bundle optimization strategies
 */
export const bundleOptimization = {
  /**
   * Next.js config for bundle optimization
   */
  nextConfig: `// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize production build
  productionBrowserSourceMaps: false, // Disable source maps in production

  // Image optimization
  images: {
    domains: ['example.com'],
    formats: ['image/avif', 'image/webp'],
  },

  // Bundle analyzer
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Bundle analyzer (run with ANALYZE=true next build)
      if (process.env.ANALYZE) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './analyze.html',
          })
        );
      }

      // Tree shaking improvements
      config.optimization.usedExports = true;
    }

    return config;
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lodash', 'date-fns'],
  },
};

module.exports = nextConfig;`,

  /**
   * Import only what you need
   */
  treeShaking: `// Bad: Imports entire library
import _ from 'lodash';
const result = _.debounce(fn, 300);

// Good: Import only needed function
import debounce from 'lodash/debounce';
const result = debounce(fn, 300);

// Bad: Imports all icons
import { FaUser, FaHeart } from 'react-icons/fa';

// Good: Import from specific path
import { FaUser } from 'react-icons/fa/FaUser';
import { FaHeart } from 'react-icons/fa/FaHeart';`,

  /**
   * Dynamic imports for conditional features
   */
  dynamicImports: `// Dynamic Imports for Features
export function AdminDashboard() {
  const [showAnalytics, setShowAnalytics] = useState(false);

  const loadAnalytics = async () => {
    const { Analytics } = await import('./Analytics');
    // Use Analytics component
  };

  return (
    <div>
      <button onClick={() => setShowAnalytics(true)}>
        Show Analytics
      </button>
    </div>
  );
}`,
};

/**
 * Performance monitoring
 */
export const performanceMonitoring = `// Performance Monitoring with Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals(onPerfEntry?: (metric: any) => void) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    getCLS(onPerfEntry);  // Cumulative Layout Shift
    getFID(onPerfEntry);  // First Input Delay
    getFCP(onPerfEntry);  // First Contentful Paint
    getLCP(onPerfEntry);  // Largest Contentful Paint
    getTTFB(onPerfEntry); // Time to First Byte
  }
}

// Send to analytics
reportWebVitals((metric) => {
  console.log(metric.name, metric.value);
  // Send to analytics service
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_id: metric.id,
      metric_delta: metric.delta,
    });
  }
});`;

/**
 * Performance best practices
 */
export const performanceBestPractices = {
  loading: [
    "Use Suspense boundaries for code splitting",
    "Show skeleton screens while loading",
    "Implement progressive loading (load critical content first)",
    "Use placeholder images with blur-up effect",
    "Preload critical resources",
  ],

  rendering: [
    "Avoid unnecessary re-renders with React.memo",
    "Use keys properly in lists",
    "Avoid inline function definitions in render",
    "Debounce expensive operations (search, resize)",
    "Use virtualization for long lists (>100 items)",
  ],

  bundleSize: [
    "Code split by route",
    "Lazy load below-the-fold content",
    "Tree shake unused code",
    "Use lightweight alternatives (date-fns vs moment)",
    "Analyze bundle with webpack-bundle-analyzer",
  ],

  images: [
    "Use Next.js Image component (auto-optimization)",
    "Serve WebP/AVIF formats",
    "Lazy load images below fold",
    "Use appropriate image sizes (srcset)",
    "Compress images before upload",
  ],

  network: [
    "Implement caching strategies (React Query, SWR)",
    "Prefetch data for next pages",
    "Use CDN for static assets",
    "Enable HTTP/2 multiplexing",
    "Compress responses (gzip, brotli)",
  ],
};

/**
 * Generate performance optimization config
 */
export function generatePerformanceConfig(config: PerformanceConfig): string {
  return `// Performance Configuration
export const performanceConfig = {
  codeSplitting: ${config.enableCodeSplitting},
  lazyLoading: ${config.enableLazyLoading},
  imageOptimization: ${config.enableImageOptimization},
  bundleAnalysis: ${config.enableBundleAnalysis},
  targetBundleSize: ${config.targetBundleSize}, // KB
};

// Web Vitals Thresholds
export const webVitalsThresholds = {
  LCP: 2500,  // Largest Contentful Paint (ms)
  FID: 100,   // First Input Delay (ms)
  CLS: 0.1,   // Cumulative Layout Shift
  FCP: 1800,  // First Contentful Paint (ms)
  TTFB: 800,  // Time to First Byte (ms)
};
`;
}
