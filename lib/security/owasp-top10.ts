import { Vulnerability } from "./vulnerability-scanner";

export type ProjectType = "website" | "web_app" | "mobile_app" | "database" | "web3_dapp";

export interface OWASPCheckResult {
  category: string;
  risk: "critical" | "high" | "medium" | "low" | "pass";
  findings: string[];
  recommendations: string[];
  testsPassed: number;
  totalTests: number;
}

export interface OWASPAuditReport {
  overallScore: number;
  categories: OWASPCheckResult[];
  criticalIssues: number;
  highIssues: number;
  summary: string;
}

/**
 * OWASP Top 10 2021 Checklist Generator
 */
export function generateOWASPChecklist(projectType: ProjectType): string {
  const baseChecklist = `# OWASP Top 10 2021 Security Checklist

## A01:2021 - Broken Access Control

### Horizontal Privilege Escalation
- [ ] Users cannot access other users' data by changing IDs in URLs
- [ ] API endpoints validate user ownership of requested resources
- [ ] Direct object references are protected with access control checks

### Vertical Privilege Escalation
- [ ] Regular users cannot access admin functionality
- [ ] Role-based access control (RBAC) is implemented correctly
- [ ] Privileged operations require proper authentication and authorization

### General Access Control
- [ ] Default deny access control policy is in place
- [ ] Access control checks are performed on server-side
- [ ] CORS is configured restrictively
- [ ] File upload restrictions prevent unauthorized file access
- [ ] Metadata and backup files are not accessible via web

**Tests:**
\`\`\`javascript
// Test: Attempt to access another user's resource
GET /api/users/123/profile (as user 456) → Should return 403
GET /api/admin/dashboard (as regular user) → Should return 403
\`\`\`

---

## A02:2021 - Cryptographic Failures

### Data in Transit
- [ ] All traffic uses HTTPS/TLS 1.2+
- [ ] HSTS header is enabled
- [ ] No mixed content (HTTP on HTTPS pages)
- [ ] Certificate is valid and properly configured

### Data at Rest
- [ ] Sensitive data is encrypted in database
- [ ] Encryption keys are stored securely (not in code)
- [ ] Strong encryption algorithms (AES-256, RSA-2048+)
- [ ] Password hashing uses bcrypt/argon2 (not MD5/SHA1)

### Sensitive Data Handling
- [ ] PII is minimized and only stored when necessary
- [ ] Credit card data follows PCI-DSS
- [ ] Passwords are never logged or displayed
- [ ] Sensitive data is not cached

**Tests:**
\`\`\`javascript
// Test: Password hashing
const hashedPassword = await bcrypt.hash("password", 12);
assert(hashedPassword !== "password");
assert(await bcrypt.compare("password", hashedPassword));
\`\`\`

---

## A03:2021 - Injection

### SQL Injection
- [ ] Parameterized queries / prepared statements used
- [ ] ORM is used correctly (no raw SQL concatenation)
- [ ] Input validation on all user inputs
- [ ] Database user has minimal privileges

### NoSQL Injection
- [ ] MongoDB queries use proper sanitization
- [ ] No direct use of user input in queries
- [ ] Mongoose schema validation enabled

### Command Injection
- [ ] No use of exec() with user input
- [ ] If shell commands needed, use execFile() with argument array
- [ ] Input sanitization for any system calls

### Other Injection Types
- [ ] LDAP injection prevention
- [ ] XPath injection prevention
- [ ] Template injection prevention
- [ ] Server-Side Request Forgery (SSRF) prevention

**Tests:**
\`\`\`javascript
// Test: SQL Injection prevention
const maliciousInput = "1' OR '1'='1";
const result = await db.query("SELECT * FROM users WHERE id = ?", [maliciousInput]);
assert(result.length === 0); // Should not return all users
\`\`\`

---

## A04:2021 - Insecure Design

### Threat Modeling
- [ ] Threat model documented for critical features
- [ ] Security requirements defined
- [ ] Attack surface minimized

### Secure Design Patterns
- [ ] Defense in depth implemented
- [ ] Fail securely (errors don't expose information)
- [ ] Separation of duties for sensitive operations
- [ ] Rate limiting on critical endpoints

### Business Logic
- [ ] Business logic vulnerabilities identified
- [ ] Race condition prevention
- [ ] Transaction integrity ensured

**Considerations:**
- Account enumeration prevention
- Password reset flow security
- Multi-factor authentication support
- Session management design

---

## A05:2021 - Security Misconfiguration

### HTTP Security Headers
- [ ] Content-Security-Policy configured
- [ ] X-Frame-Options: DENY or SAMEORIGIN
- [ ] X-Content-Type-Options: nosniff
- [ ] Strict-Transport-Security enabled
- [ ] Referrer-Policy configured

### Server Configuration
- [ ] Unnecessary features/services disabled
- [ ] Error messages don't expose sensitive info
- [ ] Stack traces not shown in production
- [ ] Default credentials changed
- [ ] Admin interfaces secured

### Framework Configuration
- [ ] Debug mode disabled in production
- [ ] Secure framework defaults used
- [ ] Unnecessary headers removed (X-Powered-By)

**Tests:**
\`\`\`javascript
// Test: Security headers present
const response = await fetch("/");
assert(response.headers.get("X-Frame-Options"));
assert(response.headers.get("Content-Security-Policy"));
\`\`\`

---

## A06:2021 - Vulnerable and Outdated Components

### Dependency Management
- [ ] All dependencies up to date
- [ ] npm audit reports no vulnerabilities
- [ ] Snyk/Dependabot enabled
- [ ] Dependencies pinned to specific versions
- [ ] Unused dependencies removed

### Version Management
- [ ] Node.js version is supported (not EOL)
- [ ] Framework versions are current
- [ ] Third-party libraries are maintained

**Automated Checks:**
\`\`\`bash
npm audit --audit-level=moderate
npm outdated
\`\`\`

---

## A07:2021 - Identification and Authentication Failures

### Authentication
- [ ] Multi-factor authentication supported
- [ ] Strong password policy enforced
- [ ] Credential stuffing protection (rate limiting)
- [ ] Brute force protection implemented
- [ ] No default credentials exist

### Session Management
- [ ] Session IDs are random and unpredictable
- [ ] Session timeout configured
- [ ] Sessions invalidated on logout
- [ ] Secure and HttpOnly flags on cookies
- [ ] SameSite cookie attribute set

### Password Management
- [ ] Password recovery doesn't expose user existence
- [ ] Password reset tokens expire
- [ ] Old passwords cannot be reused
- [ ] Passwords hashed with salt

**Tests:**
\`\`\`javascript
// Test: Session cookie security
const cookie = response.headers["set-cookie"];
assert(cookie.includes("HttpOnly"));
assert(cookie.includes("Secure"));
assert(cookie.includes("SameSite=Strict"));
\`\`\`

---

## A08:2021 - Software and Data Integrity Failures

### CI/CD Security
- [ ] Build pipeline secured
- [ ] Code signing implemented
- [ ] Artifact integrity verified
- [ ] No secrets in repository

### Dependency Integrity
- [ ] Subresource Integrity (SRI) for CDN resources
- [ ] Package lock files committed
- [ ] Dependencies from trusted sources only

### Updates and Patches
- [ ] Automated update process exists
- [ ] Updates are verified before deployment

**Example SRI:**
\`\`\`html
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-hash"
        crossorigin="anonymous"></script>
\`\`\`

---

## A09:2021 - Security Logging and Monitoring Failures

### Logging
- [ ] Authentication failures logged
- [ ] Authorization failures logged
- [ ] Input validation failures logged
- [ ] Logs include sufficient context
- [ ] Sensitive data not logged (passwords, tokens)

### Monitoring
- [ ] Real-time security monitoring configured
- [ ] Alerts for suspicious activity
- [ ] Log aggregation and analysis
- [ ] Audit trail for privileged operations

### Incident Response
- [ ] Incident response plan exists
- [ ] Breach notification process defined
- [ ] Log retention policy defined

**Log Example:**
\`\`\`javascript
logger.warn("Failed login attempt", {
  username: username, // Don't log password!
  ip: req.ip,
  timestamp: new Date(),
  userAgent: req.headers["user-agent"]
});
\`\`\`

---

## A10:2021 - Server-Side Request Forgery (SSRF)

### URL Validation
- [ ] Whitelist allowed domains for outbound requests
- [ ] No user-controlled URLs in server requests
- [ ] Internal IP ranges blocked (127.0.0.1, 169.254.*, 10.*, etc.)
- [ ] URL schema restricted (only http/https)

### Defense Mechanisms
- [ ] Network segmentation in place
- [ ] Firewall rules limit outbound requests
- [ ] DNS rebinding protection
- [ ] Disable HTTP redirects or validate redirect targets

**Tests:**
\`\`\`javascript
// Test: SSRF prevention
const maliciousUrl = "http://localhost:8080/admin";
await expect(fetchUrl(maliciousUrl)).rejects.toThrow("Blocked");
\`\`\`

---

## Additional Security Measures

### CSRF Protection
- [ ] CSRF tokens on state-changing operations
- [ ] SameSite cookie attribute set
- [ ] Double-submit cookie pattern (if applicable)

### XML External Entity (XXE)
- [ ] XML parsing with external entities disabled
- [ ] JSON preferred over XML where possible

### Denial of Service
- [ ] Rate limiting on all endpoints
- [ ] Request size limits enforced
- [ ] Timeout configurations
- [ ] Resource consumption monitoring
`;

  const projectSpecific = getProjectSpecificChecklist(projectType);
  return baseChecklist + "\n\n" + projectSpecific;
}

/**
 * Get project-type specific security checklist
 */
function getProjectSpecificChecklist(projectType: ProjectType): string {
  switch (projectType) {
    case "web3_dapp":
      return `## Web3 DApp Specific Security

### Smart Contract Security
- [ ] Reentrancy protection (checks-effects-interactions pattern)
- [ ] Integer overflow/underflow prevention (use SafeMath or Solidity 0.8+)
- [ ] Access control on privileged functions (onlyOwner, etc.)
- [ ] Front-running protection on sensitive transactions
- [ ] Gas limit considerations
- [ ] Oracle manipulation risks assessed
- [ ] Flash loan attack vectors evaluated

### Wallet Integration
- [ ] Signature verification implemented correctly
- [ ] Nonce management for replay attack prevention
- [ ] Transaction parameters validated before signing
- [ ] Gas price manipulation protection

### Testing
- [ ] Smart contracts audited by professional firm
- [ ] Comprehensive test coverage (>95%)
- [ ] Fuzzing tests for edge cases
- [ ] Mainnet fork testing before deployment`;

    case "mobile_app":
      return `## Mobile App Specific Security

### iOS Security
- [ ] Keychain used for sensitive data storage
- [ ] App Transport Security (ATS) enabled
- [ ] Jailbreak detection implemented
- [ ] Certificate pinning configured
- [ ] Binary protection (anti-tampering)

### Android Security
- [ ] Android KeyStore used for credentials
- [ ] ProGuard/R8 obfuscation enabled
- [ ] Root detection implemented
- [ ] Network Security Config configured
- [ ] SafetyNet Attestation API integrated

### Common Mobile Security
- [ ] Secure local storage (encrypted databases)
- [ ] No sensitive data in logs
- [ ] Clipboard data protection
- [ ] Screenshot prevention for sensitive screens
- [ ] Deep link validation`;

    case "database":
      return `## Database Specific Security

### Access Control
- [ ] Principle of least privilege for database users
- [ ] Separate read-only and read-write users
- [ ] No root/admin access from application
- [ ] Database firewall rules configured

### Data Protection
- [ ] Encryption at rest enabled
- [ ] Encryption in transit (TLS for connections)
- [ ] Column-level encryption for PII
- [ ] Backup encryption

### Auditing
- [ ] Query logging enabled
- [ ] Access logging for privileged operations
- [ ] Data modification audit trails
- [ ] Failed authentication attempt logging`;

    default:
      return "";
  }
}

/**
 * Generate OWASP test suite
 */
export function generateOWASPTests(projectType: ProjectType): string {
  return `// OWASP Top 10 Security Tests

import { describe, it, expect } from "vitest";

describe("A01 - Broken Access Control", () => {
  it("should prevent horizontal privilege escalation", async () => {
    // User A should not access User B's data
    const userAToken = await loginAs("userA");
    const userBId = "user-b-id";

    const response = await fetch(\`/api/users/\${userBId}/profile\`, {
      headers: { Authorization: \`Bearer \${userAToken}\` }
    });

    expect(response.status).toBe(403);
  });

  it("should prevent vertical privilege escalation", async () => {
    const regularUserToken = await loginAs("regularUser");

    const response = await fetch("/api/admin/users", {
      headers: { Authorization: \`Bearer \${regularUserToken}\` }
    });

    expect(response.status).toBe(403);
  });

  it("should enforce CORS policy", async () => {
    const response = await fetch("/api/data", {
      headers: { Origin: "https://malicious-site.com" }
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
  });
});

describe("A02 - Cryptographic Failures", () => {
  it("should hash passwords with bcrypt", async () => {
    const password = "TestPassword123!";
    const hashedPassword = await hashPassword(password);

    expect(hashedPassword).not.toBe(password);
    expect(hashedPassword).toMatch(/^\\$2[aby]\\$/); // bcrypt format
    expect(await verifyPassword(password, hashedPassword)).toBe(true);
  });

  it("should use HTTPS in production", () => {
    if (process.env.NODE_ENV === "production") {
      expect(process.env.FORCE_HTTPS).toBe("true");
    }
  });

  it("should not expose sensitive data in responses", async () => {
    const response = await fetch("/api/users/me");
    const data = await response.json();

    expect(data.password).toBeUndefined();
    expect(data.passwordHash).toBeUndefined();
    expect(data.apiKey).toBeUndefined();
  });
});

describe("A03 - Injection", () => {
  it("should prevent SQL injection", async () => {
    const maliciousInput = "1' OR '1'='1";

    // This should not return all users
    const users = await db.query(
      "SELECT * FROM users WHERE id = ?",
      [maliciousInput]
    );

    expect(users.length).toBeLessThanOrEqual(1);
  });

  it("should prevent NoSQL injection", async () => {
    const maliciousInput = { $gt: "" };

    const result = await User.findOne({ username: maliciousInput });
    expect(result).toBeNull();
  });

  it("should prevent command injection", async () => {
    const maliciousInput = "file.txt; rm -rf /";

    await expect(
      processFile(maliciousInput)
    ).rejects.toThrow();
  });
});

describe("A04 - Insecure Design", () => {
  it("should implement rate limiting", async () => {
    const requests = Array(100).fill(null).map(() =>
      fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ username: "test", password: "test" })
      })
    );

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);

    expect(tooManyRequests.length).toBeGreaterThan(0);
  });

  it("should prevent account enumeration", async () => {
    const validEmail = "valid@example.com";
    const invalidEmail = "invalid@example.com";

    const response1 = await resetPassword(validEmail);
    const response2 = await resetPassword(invalidEmail);

    // Both should return same generic message
    expect(response1.message).toBe(response2.message);
  });
});

describe("A05 - Security Misconfiguration", () => {
  it("should set security headers", async () => {
    const response = await fetch("/");

    expect(response.headers.get("X-Frame-Options")).toBeTruthy();
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
    expect(response.headers.get("Strict-Transport-Security")).toBeTruthy();
  });

  it("should not expose sensitive headers", async () => {
    const response = await fetch("/");

    expect(response.headers.get("X-Powered-By")).toBeNull();
    expect(response.headers.get("Server")).not.toContain("version");
  });

  it("should not show stack traces in production", async () => {
    process.env.NODE_ENV = "production";

    const response = await fetch("/api/error");
    const text = await response.text();

    expect(text).not.toContain("at ");
    expect(text).not.toContain(".js:");
  });
});

describe("A07 - Authentication Failures", () => {
  it("should set secure cookie flags", async () => {
    const response = await login("user", "password");
    const setCookie = response.headers.get("set-cookie");

    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Strict");
  });

  it("should invalidate sessions on logout", async () => {
    const token = await login("user", "password");
    await logout(token);

    const response = await fetch("/api/protected", {
      headers: { Authorization: \`Bearer \${token}\` }
    });

    expect(response.status).toBe(401);
  });

  it("should enforce password complexity", async () => {
    const weakPassword = "123456";

    await expect(
      register("user", weakPassword)
    ).rejects.toThrow("Password too weak");
  });
});

describe("A09 - Security Logging", () => {
  it("should log failed authentication attempts", async () => {
    const logSpy = vi.spyOn(logger, "warn");

    await login("user", "wrongpassword");

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed login")
    );
  });

  it("should not log sensitive data", async () => {
    const logSpy = vi.spyOn(logger, "info");

    await login("user", "password123");

    const calls = logSpy.mock.calls.flat().join(" ");
    expect(calls).not.toContain("password123");
  });
});

describe("A10 - SSRF", () => {
  it("should block internal IP addresses", async () => {
    const internalUrls = [
      "http://127.0.0.1:8080",
      "http://localhost/admin",
      "http://169.254.169.254/metadata", // AWS metadata
      "http://10.0.0.1",
      "http://192.168.1.1"
    ];

    for (const url of internalUrls) {
      await expect(
        fetchExternalUrl(url)
      ).rejects.toThrow();
    }
  });

  it("should whitelist allowed domains", async () => {
    const allowedUrl = "https://api.trusted-service.com/data";
    const blockedUrl = "https://untrusted-site.com/data";

    await expect(fetchExternalUrl(allowedUrl)).resolves.toBeTruthy();
    await expect(fetchExternalUrl(blockedUrl)).rejects.toThrow();
  });
});
`;
}

/**
 * Analyze code against OWASP Top 10
 */
export function analyzeOWASPCompliance(
  codeFiles: { path: string; content: string }[]
): OWASPCheckResult[] {
  const results: OWASPCheckResult[] = [];

  // A01: Broken Access Control
  results.push(checkAccessControl(codeFiles));

  // A02: Cryptographic Failures
  results.push(checkCryptography(codeFiles));

  // A03: Injection
  results.push(checkInjection(codeFiles));

  // A05: Security Misconfiguration
  results.push(checkSecurityHeaders(codeFiles));

  // A07: Authentication Failures
  results.push(checkAuthentication(codeFiles));

  return results;
}

function checkAccessControl(files: { path: string; content: string }[]): OWASPCheckResult {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let testsPassed = 0;
  let totalTests = 3;

  // Check for authorization middleware
  const hasAuthMiddleware = files.some((f) =>
    /(?:requireAuth|isAuthenticated|checkAuth)/i.test(f.content)
  );

  if (!hasAuthMiddleware) {
    findings.push("No authentication middleware detected");
    recommendations.push("Implement authentication middleware for protected routes");
  } else {
    testsPassed++;
  }

  // Check for RBAC/permissions
  const hasRBAC = files.some((f) =>
    /(?:checkPermission|hasRole|isAdmin|requireRole)/i.test(f.content)
  );

  if (!hasRBAC) {
    findings.push("No role-based access control detected");
    recommendations.push("Implement RBAC for different user privilege levels");
  } else {
    testsPassed++;
  }

  // Check for CORS configuration
  const hasCORS = files.some((f) => /cors\(/i.test(f.content));

  if (!hasCORS) {
    findings.push("CORS not configured");
    recommendations.push("Configure CORS with restrictive origin policy");
  } else {
    testsPassed++;
  }

  return {
    category: "A01:2021 - Broken Access Control",
    risk: testsPassed === totalTests ? "pass" : testsPassed > 0 ? "medium" : "high",
    findings,
    recommendations,
    testsPassed,
    totalTests,
  };
}

function checkCryptography(files: { path: string; content: string }[]): OWASPCheckResult {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let testsPassed = 0;
  let totalTests = 4;

  // Check for bcrypt usage
  const usesBcrypt = files.some((f) => /bcrypt|argon2/i.test(f.content));

  if (!usesBcrypt) {
    findings.push("Not using bcrypt or argon2 for password hashing");
    recommendations.push("Use bcrypt or argon2 for password hashing");
  } else {
    testsPassed++;
  }

  // Check for weak hashing
  const usesWeakHash = files.some((f) => /crypto\.createHash\(['"](?:md5|sha1)['"]\)/i.test(f.content));

  if (usesWeakHash) {
    findings.push("Weak hashing algorithm detected (MD5/SHA1)");
    recommendations.push("Replace MD5/SHA1 with SHA-256 or better");
  } else {
    testsPassed++;
  }

  // Check for HTTPS enforcement
  const enforcesHTTPS = files.some((f) =>
    /(?:forceHTTPS|hsts|Strict-Transport-Security)/i.test(f.content)
  );

  if (!enforcesHTTPS) {
    findings.push("HTTPS enforcement not detected");
    recommendations.push("Implement HSTS header and force HTTPS");
  } else {
    testsPassed++;
  }

  // Check for hardcoded secrets
  const hasHardcodedSecrets = files.some((f) =>
    /(?:password|secret|api[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/.test(f.content)
  );

  if (hasHardcodedSecrets) {
    findings.push("Potential hardcoded secrets detected");
    recommendations.push("Move all secrets to environment variables");
  } else {
    testsPassed++;
  }

  return {
    category: "A02:2021 - Cryptographic Failures",
    risk: testsPassed < 2 ? "critical" : testsPassed < 3 ? "high" : "pass",
    findings,
    recommendations,
    testsPassed,
    totalTests,
  };
}

function checkInjection(files: { path: string; content: string }[]): OWASPCheckResult {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let testsPassed = 0;
  let totalTests = 3;

  // Check for SQL injection vulnerabilities
  const hasSQLInjection = files.some((f) =>
    /(?:execute|query)\s*\(\s*['"`].*\$\{|(?:execute|query)\s*\(\s*['"`].*\+/.test(f.content)
  );

  if (hasSQLInjection) {
    findings.push("Potential SQL injection vulnerability detected");
    recommendations.push("Use parameterized queries or prepared statements");
  } else {
    testsPassed++;
  }

  // Check for command injection
  const hasCommandInjection = files.some((f) => /exec\s*\(/.test(f.content));

  if (hasCommandInjection) {
    findings.push("Use of exec() detected - potential command injection");
    recommendations.push("Use execFile() with argument array instead of exec()");
  } else {
    testsPassed++;
  }

  // Check for XSS via innerHTML
  const hasXSS = files.some((f) =>
    /innerHTML\s*=|dangerouslySetInnerHTML/.test(f.content)
  );

  if (hasXSS) {
    findings.push("Potential XSS vulnerability via innerHTML");
    recommendations.push("Use textContent or sanitize HTML with DOMPurify");
  } else {
    testsPassed++;
  }

  return {
    category: "A03:2021 - Injection",
    risk: testsPassed === 0 ? "critical" : testsPassed === totalTests ? "pass" : "high",
    findings,
    recommendations,
    testsPassed,
    totalTests,
  };
}

function checkSecurityHeaders(files: { path: string; content: string }[]): OWASPCheckResult {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let testsPassed = 0;
  let totalTests = 5;

  const securityHeaders = [
    { name: "Content-Security-Policy", pattern: /Content-Security-Policy|CSP/i },
    { name: "X-Frame-Options", pattern: /X-Frame-Options/i },
    { name: "X-Content-Type-Options", pattern: /X-Content-Type-Options/i },
    { name: "Strict-Transport-Security", pattern: /Strict-Transport-Security|HSTS/i },
    { name: "Referrer-Policy", pattern: /Referrer-Policy/i },
  ];

  for (const header of securityHeaders) {
    const hasHeader = files.some((f) => header.pattern.test(f.content));
    if (!hasHeader) {
      findings.push(`${header.name} header not configured`);
      recommendations.push(`Add ${header.name} security header`);
    } else {
      testsPassed++;
    }
  }

  return {
    category: "A05:2021 - Security Misconfiguration",
    risk: testsPassed < 2 ? "high" : testsPassed < 4 ? "medium" : "pass",
    findings,
    recommendations,
    testsPassed,
    totalTests,
  };
}

function checkAuthentication(files: { path: string; content: string }[]): OWASPCheckResult {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let testsPassed = 0;
  let totalTests = 4;

  // Check for secure cookie flags
  const hasSecureCookies = files.some((f) =>
    /httpOnly.*true|secure.*true|sameSite/i.test(f.content)
  );

  if (!hasSecureCookies) {
    findings.push("Secure cookie flags not detected");
    recommendations.push("Set HttpOnly, Secure, and SameSite flags on cookies");
  } else {
    testsPassed++;
  }

  // Check for rate limiting
  const hasRateLimiting = files.some((f) => /rate[_-]?limit/i.test(f.content));

  if (!hasRateLimiting) {
    findings.push("Rate limiting not detected");
    recommendations.push("Implement rate limiting to prevent brute force attacks");
  } else {
    testsPassed++;
  }

  // Check for session management
  const hasSessionManagement = files.some((f) =>
    /(?:session|jwt|token).*(?:destroy|invalidate|revoke)/i.test(f.content)
  );

  if (!hasSessionManagement) {
    findings.push("Session invalidation not detected");
    recommendations.push("Implement proper session/token invalidation on logout");
  } else {
    testsPassed++;
  }

  // Check for MFA
  const hasMFA = files.some((f) => /(?:mfa|2fa|two[_-]?factor|otp)/i.test(f.content));

  if (!hasMFA) {
    findings.push("Multi-factor authentication not implemented");
    recommendations.push("Consider implementing MFA for enhanced security");
  } else {
    testsPassed++;
  }

  return {
    category: "A07:2021 - Authentication Failures",
    risk: testsPassed < 2 ? "high" : testsPassed < 3 ? "medium" : "pass",
    findings,
    recommendations,
    testsPassed,
    totalTests,
  };
}
