/**
 * Package information from npm registry
 */
export interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  deprecated?: boolean | string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  repository?: {
    type: string;
    url: string;
  };
  homepage?: string;
  license?: string;
  author?: string | { name: string; email?: string };
  keywords?: string[];
}

/**
 * Package resolution result
 */
export interface PackageResolutionResult {
  success: boolean;
  package?: PackageInfo;
  error?: string;
  warning?: string;
}

/**
 * Multiple packages resolution result
 */
export interface PackagesResolutionResult {
  success: boolean;
  packages?: Array<PackageInfo & { dev?: boolean }>;
  errors?: string[];
  warnings?: string[];
}

/**
 * Security check result
 */
export interface SecurityCheckResult {
  success: boolean;
  packageName: string;
  version: string;
  deprecated?: boolean | string;
  warnings?: string[];
  error?: string;
}

/**
 * Package dependency specification
 */
export interface PackageDependency {
  name: string;
  version?: string;
  dev?: boolean;
}

/**
 * Fetches package information from the npm registry
 *
 * @param packageName - The name of the npm package
 * @param version - Optional specific version (defaults to 'latest')
 * @returns PackageResolutionResult with package info or error
 */
export async function resolvePackage(
  packageName: string,
  version: string = 'latest'
): Promise<PackageResolutionResult> {
  try {
    // Validate package name
    if (!packageName || typeof packageName !== 'string') {
      return {
        success: false,
        error: 'Invalid package name',
      };
    }

    // Sanitize package name (remove any dangerous characters)
    const sanitizedName = packageName.trim();
    if (!/^(@[\w-]+\/)?[\w-\.]+$/.test(sanitizedName)) {
      return {
        success: false,
        error: `Invalid package name format: ${sanitizedName}`,
      };
    }

    // Construct npm registry URL
    const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(sanitizedName)}`;

    // Fetch package metadata
    const response = await fetch(registryUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: `Package '${sanitizedName}' not found in npm registry`,
        };
      }
      return {
        success: false,
        error: `Failed to fetch package: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    // Resolve the specific version
    let resolvedVersion = version;
    if (version === 'latest') {
      resolvedVersion = data['dist-tags']?.latest;
    } else if (version.startsWith('^') || version.startsWith('~')) {
      // For semver ranges, use the latest matching version
      // This is a simplified approach; a full implementation would use semver library
      resolvedVersion = data['dist-tags']?.latest;
    }

    // Get version-specific metadata
    const versionData = data.versions?.[resolvedVersion];
    if (!versionData) {
      return {
        success: false,
        error: `Version '${version}' not found for package '${sanitizedName}'`,
      };
    }

    // Extract package information
    const packageInfo: PackageInfo = {
      name: versionData.name,
      version: resolvedVersion,
      description: versionData.description,
      deprecated: versionData.deprecated,
      dependencies: versionData.dependencies,
      devDependencies: versionData.devDependencies,
      peerDependencies: versionData.peerDependencies,
      repository: versionData.repository,
      homepage: versionData.homepage,
      license: versionData.license,
      author: versionData.author,
      keywords: versionData.keywords,
    };

    // Check for deprecation warning
    const warning = versionData.deprecated
      ? `Package is deprecated: ${
          typeof versionData.deprecated === 'string'
            ? versionData.deprecated
            : 'No reason provided'
        }`
      : undefined;

    return {
      success: true,
      package: packageInfo,
      warning,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error resolving package: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Resolves multiple npm packages in parallel
 *
 * @param packages - Array of package dependencies to resolve
 * @returns PackagesResolutionResult with all resolved packages
 */
export async function resolvePackages(
  packages: PackageDependency[]
): Promise<PackagesResolutionResult> {
  if (!Array.isArray(packages) || packages.length === 0) {
    return {
      success: false,
      errors: ['No packages provided for resolution'],
    };
  }

  try {
    // Resolve all packages in parallel
    const results = await Promise.all(
      packages.map(async (pkg) => {
        const result = await resolvePackage(pkg.name, pkg.version);
        return {
          ...result,
          dev: pkg.dev,
        };
      })
    );

    // Separate successful and failed resolutions
    const resolvedPackages: Array<PackageInfo & { dev?: boolean }> = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    results.forEach((result, index) => {
      if (result.success && result.package) {
        resolvedPackages.push({
          ...result.package,
          dev: result.dev,
        });
        if (result.warning) {
          warnings.push(`${packages[index].name}: ${result.warning}`);
        }
      } else if (result.error) {
        errors.push(`${packages[index].name}: ${result.error}`);
      }
    });

    return {
      success: errors.length === 0,
      packages: resolvedPackages,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        `Error resolving packages: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
    };
  }
}

/**
 * Checks a package for security issues and deprecation warnings
 *
 * @param packageName - The name of the npm package
 * @param version - The version to check
 * @returns SecurityCheckResult with security information
 */
export async function checkPackageSecurity(
  packageName: string,
  version: string
): Promise<SecurityCheckResult> {
  try {
    // First, resolve the package to get its metadata
    const result = await resolvePackage(packageName, version);

    if (!result.success || !result.package) {
      return {
        success: false,
        packageName,
        version,
        error: result.error || 'Failed to resolve package',
      };
    }

    const warnings: string[] = [];

    // Check for deprecation
    const deprecated = result.package.deprecated;
    if (deprecated) {
      const deprecationMessage =
        typeof deprecated === 'string'
          ? deprecated
          : 'This package has been deprecated';
      warnings.push(`DEPRECATED: ${deprecationMessage}`);
    }

    // Check for missing license
    if (!result.package.license) {
      warnings.push('No license information found');
    }

    // Check for suspicious package characteristics
    if (!result.package.repository) {
      warnings.push('No repository information found');
    }

    // Check version format
    if (!/^\d+\.\d+\.\d+/.test(result.package.version)) {
      warnings.push(`Unusual version format: ${result.package.version}`);
    }

    // Check if package has no description
    if (!result.package.description) {
      warnings.push('No description provided');
    }

    // Note: For more comprehensive security checks, you would integrate with
    // services like npm audit, Snyk, or GitHub Advisory Database
    // This is a basic implementation focusing on deprecation and metadata

    return {
      success: true,
      packageName: result.package.name,
      version: result.package.version,
      deprecated: deprecated || false,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      packageName,
      version,
      error: `Security check failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Validates a package version string format
 *
 * @param version - The version string to validate
 * @returns boolean indicating if the version format is valid
 */
export function isValidVersionFormat(version: string): boolean {
  // Supports exact versions (1.2.3), ranges (^1.2.3, ~1.2.3), and tags (latest, next)
  const versionPatterns = [
    /^\d+\.\d+\.\d+(-[\w\.]+)?(\+[\w\.]+)?$/, // Exact version: 1.2.3, 1.2.3-beta, 1.2.3+build
    /^[\^~]?\d+\.\d+\.\d+/, // Semver ranges: ^1.2.3, ~1.2.3
    /^(latest|next|beta|alpha|canary)$/, // Common tags
    /^>=?\d+\.\d+\.\d+$/, // >= or > version
    /^<=?\d+\.\d+\.\d+$/, // <= or < version
  ];

  return versionPatterns.some(pattern => pattern.test(version));
}
