/**
 * Infrastructure Security - Docker, cloud, TLS/SSL, and infrastructure hardening
 */

export interface DockerSecurityScan {
  vulnerabilities: SecurityVulnerability[];
  baseImageIssues: string[];
  configIssues: string[];
  recommendations: string[];
}

export interface SecurityVulnerability {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  package: string;
  version: string;
  fixedIn?: string;
  description: string;
}

export interface CloudSecurityConfig {
  provider: "aws" | "azure" | "gcp";
  checks: SecurityCheck[];
  misconfigurations: string[];
  recommendations: string[];
}

export interface SecurityCheck {
  name: string;
  passed: boolean;
  details: string;
  remediation?: string;
}

/**
 * Docker security patterns
 */
export const dockerSecurityPatterns = {
  /**
   * Secure Dockerfile
   */
  secureDockerfile: `# Secure Dockerfile Best Practices

# Use specific versions, not latest
FROM node:18.17.0-alpine AS builder

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with audit
RUN npm ci --only=production && npm audit fix

# Copy source
COPY --chown=nextjs:nodejs . .

# Build
RUN npm run build

# Production image
FROM node:18.17.0-alpine AS runner

# Security: Run as non-root
USER nextjs

# Set working directory
WORKDIR /app

# Copy necessary files only
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node healthcheck.js

# Start
CMD ["node", "server.js"]`,

  /**
   * Docker security scanning
   */
  dockerScan: `# Scan Docker images for vulnerabilities

# Trivy (recommended)
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\
  aquasec/trivy image your-image:tag

# Trivy with severity filter
trivy image --severity HIGH,CRITICAL your-image:tag

# Scan and fail on critical
trivy image --exit-code 1 --severity CRITICAL your-image:tag

# Clair scanner
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\
  arminc/clair-scanner --clair=http://clair:6060 your-image:tag

# Snyk container scan
snyk container test your-image:tag

# Docker Scout (built-in)
docker scout cves your-image:tag`,

  /**
   * Docker Compose security
   */
  secureCompose: `# docker-compose.yml - Secure Configuration

version: '3.8'

services:
  app:
    image: your-app:latest
    # Security: Run as non-root
    user: "1001:1001"
    # Security: Read-only root filesystem
    read_only: true
    # Security: Drop all capabilities
    cap_drop:
      - ALL
    # Security: No new privileges
    security_opt:
      - no-new-privileges:true
    # Security: Resource limits
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          memory: 256M
    # Temp directories for writable paths
    tmpfs:
      - /tmp
      - /var/cache
    # Environment variables from secrets
    env_file:
      - .env
    # Health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

  db:
    image: postgres:15-alpine
    # Security: Run as non-root
    user: postgres
    # Security: Read-only except data directory
    read_only: true
    tmpfs:
      - /var/run/postgresql
    # Security: Resource limits
    deploy:
      resources:
        limits:
          memory: 1G
    # Volumes for persistence
    volumes:
      - postgres_data:/var/lib/postgresql/data
    # Environment variables
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt

volumes:
  postgres_data:
    driver: local`,

  /**
   * Container runtime security
   */
  runtimeSecurity: `# Container Runtime Security

# Use AppArmor profile
docker run --security-opt apparmor=docker-default your-image

# Use SELinux
docker run --security-opt label=level:s0:c100,c200 your-image

# Seccomp profile (restrict syscalls)
docker run --security-opt seccomp=/path/to/seccomp.json your-image

# Example seccomp.json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": [
        "accept", "access", "bind", "close", "connect",
        "exit", "read", "write", "socket"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}`,
};

/**
 * Kubernetes security patterns
 */
export const kubernetesSecurityPatterns = {
  /**
   * Secure pod configuration
   */
  securePod: `apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  # Security: Run as non-root
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
    # Drop all capabilities
    seccompProfile:
      type: RuntimeDefault

  containers:
  - name: app
    image: your-app:1.0.0
    # Security: Specific image version (not latest)
    imagePullPolicy: Always

    # Security: Read-only root filesystem
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
          - ALL

    # Resource limits
    resources:
      limits:
        cpu: "1"
        memory: "512Mi"
      requests:
        cpu: "100m"
        memory: "128Mi"

    # Health checks
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5

    # Environment from secrets
    envFrom:
    - secretRef:
        name: app-secrets

    # Volumes for writable paths
    volumeMounts:
    - name: cache
      mountPath: /tmp
    - name: logs
      mountPath: /var/log

  volumes:
  - name: cache
    emptyDir: {}
  - name: logs
    emptyDir: {}`,

  /**
   * Network policies
   */
  networkPolicy: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-network-policy
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
  - Ingress
  - Egress

  # Allow ingress only from ingress controller
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000

  # Allow egress to database and external APIs
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443`,

  /**
   * Pod Security Standards
   */
  podSecurity: `# Pod Security Standards (PSS)
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Enforce restricted security standards
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted`,

  /**
   * RBAC configuration
   */
  rbac: `# Role-Based Access Control (RBAC)

# ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account

---
# Role (namespace-scoped)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-role
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

---
# RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-rolebinding
subjects:
- kind: ServiceAccount
  name: app-service-account
roleRef:
  kind: Role
  name: app-role
  apiGroup: rbac.authorization.k8s.io`,
};

/**
 * TLS/SSL configuration
 */
export const tlsSSLPatterns = {
  /**
   * Nginx TLS configuration
   */
  nginxTLS: `# Nginx TLS Best Practices

server {
    listen 443 ssl http2;
    server_name example.com;

    # TLS certificates
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # TLS protocols (TLS 1.2 and 1.3 only)
    ssl_protocols TLSv1.2 TLSv1.3;

    # Strong ciphers
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/nginx/ssl/chain.pem;

    # Session cache
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # Diffie-Hellman parameters
    ssl_dhparam /etc/nginx/ssl/dhparam.pem;

    location / {
        proxy_pass http://app:3000;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}`,

  /**
   * Let's Encrypt with Certbot
   */
  letsEncrypt: `#!/bin/bash
# Automated Let's Encrypt certificate generation

# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d example.com -d www.example.com \\
  --non-interactive \\
  --agree-tos \\
  --email admin@example.com

# Auto-renewal (cron job)
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet

# Test renewal
sudo certbot renew --dry-run`,

  /**
   * Certificate pinning (mobile apps)
   */
  certPinning: `// Certificate Pinning for Mobile Apps

// iOS (Swift)
import Security

class CertificatePinner {
    static let shared = CertificatePinner()

    func pinCertificate(_ challenge: URLAuthenticationChallenge) -> URLSession.AuthChallengeDisposition {
        guard let serverTrust = challenge.protectionSpace.serverTrust else {
            return .cancelAuthenticationChallenge
        }

        // Get server certificate
        guard let certificate = SecTrustGetCertificateAtIndex(serverTrust, 0) else {
            return .cancelAuthenticationChallenge
        }

        // Get public key
        let serverPublicKey = SecCertificateCopyKey(certificate)
        let serverPublicKeyData = SecKeyCopyExternalRepresentation(serverPublicKey!, nil)

        // Compare with pinned certificate
        let pinnedKey = "YOUR_PINNED_PUBLIC_KEY_BASE64"
        if serverPublicKeyData == Data(base64Encoded: pinnedKey) {
            return .useCredential(URLCredential(trust: serverTrust))
        }

        return .cancelAuthenticationChallenge
    }
}

// Android (Kotlin)
class CertificatePinner {
    companion object {
        fun create(): OkHttpClient {
            val certificatePinner = CertificatePinner.Builder()
                .add("example.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
                .add("example.com", "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=")
                .build()

            return OkHttpClient.Builder()
                .certificatePinner(certificatePinner)
                .build()
        }
    }
}`,
};

/**
 * Cloud security configurations
 */
export const cloudSecurityPatterns = {
  /**
   * AWS security best practices
   */
  awsSecurity: `# AWS Security Best Practices

# IAM Policy (least privilege)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}

# S3 Bucket Policy (secure)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceTLS",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}

# Security Group (restrictive)
resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "Security group for app"

  # Allow HTTPS from anywhere
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow SSH from bastion only
  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`,

  /**
   * Azure security
   */
  azureSecurity: `# Azure Security Best Practices

# Network Security Group
resource "azurerm_network_security_group" "app" {
  name                = "app-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "DenyAll"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# Key Vault for secrets
resource "azurerm_key_vault" "main" {
  name                = "app-keyvault"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  enabled_for_disk_encryption = true
  purge_protection_enabled    = true
  soft_delete_retention_days  = 90

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
  }
}`,

  /**
   * GCP security
   */
  gcpSecurity: `# GCP Security Best Practices

# Firewall rules
resource "google_compute_firewall" "allow_https" {
  name    = "allow-https"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-server"]
}

# IAM policy (least privilege)
resource "google_project_iam_member" "app" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:\${google_service_account.app.email}"
}

# Secret Manager
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"

  replication {
    automatic = true
  }
}`,
};

/**
 * Infrastructure security best practices
 */
export const infrastructureSecurityBestPractices = {
  docker: [
    "Use specific image versions, never 'latest'",
    "Run containers as non-root user",
    "Use multi-stage builds to reduce image size",
    "Scan images for vulnerabilities (Trivy, Snyk)",
    "Use read-only root filesystem",
    "Drop all capabilities, add only needed ones",
    "Set resource limits (CPU, memory)",
    "Implement health checks",
  ],

  kubernetes: [
    "Enforce Pod Security Standards (restricted)",
    "Use Network Policies to restrict traffic",
    "Implement RBAC with least privilege",
    "Run containers as non-root",
    "Use read-only root filesystem",
    "Enable audit logging",
    "Rotate secrets regularly",
    "Keep cluster updated",
  ],

  tls: [
    "Use TLS 1.2 or 1.3 only",
    "Use strong cipher suites",
    "Enable HSTS with preload",
    "Implement OCSP stapling",
    "Automate certificate renewal",
    "Use certificate pinning (mobile apps)",
    "Disable SSL compression",
    "Use secure key sizes (2048+ RSA, 256+ EC)",
  ],

  cloud: [
    "Use IAM roles with least privilege",
    "Enable MFA for all users",
    "Encrypt data at rest and in transit",
    "Enable logging and monitoring",
    "Use private subnets for databases",
    "Implement network segmentation",
    "Regularly rotate credentials",
    "Use managed services when possible",
  ],
};

/**
 * Security scanning automation
 */
export const securityScanningAutomation = `#!/bin/bash
# Automated Security Scanning Script

set -e

echo "🔒 Running security scans..."

# 1. Dependency vulnerabilities
echo "📦 Scanning dependencies..."
npm audit --audit-level=high
snyk test --severity-threshold=high

# 2. Docker image scan
echo "🐳 Scanning Docker images..."
trivy image --severity HIGH,CRITICAL your-app:latest

# 3. Infrastructure as Code scan
echo "☁️  Scanning IaC..."
tfsec .
checkov -d ./terraform

# 4. Secret detection
echo "🔑 Scanning for secrets..."
gitleaks detect --source . --verbose

# 5. SAST (Static Application Security Testing)
echo "🔍 Running SAST..."
semgrep --config=auto .

# 6. License compliance
echo "📜 Checking licenses..."
license-checker --onlyAllow="MIT;Apache-2.0;BSD-3-Clause"

echo "✅ Security scans complete!"
`;

/**
 * Generate infrastructure security report
 */
export function generateInfraSecurityReport(scans: DockerSecurityScan): string {
  const criticalCount = scans.vulnerabilities.filter(v => v.severity === 'critical').length;
  const highCount = scans.vulnerabilities.filter(v => v.severity === 'high').length;

  return `# Infrastructure Security Report
Generated: ${new Date().toISOString()}

## Summary
- **Critical Vulnerabilities**: ${criticalCount}
- **High Vulnerabilities**: ${highCount}
- **Base Image Issues**: ${scans.baseImageIssues.length}
- **Configuration Issues**: ${scans.configIssues.length}

## Critical Vulnerabilities
${scans.vulnerabilities
  .filter(v => v.severity === 'critical')
  .map(v => `- **${v.id}**: ${v.package}@${v.version} - ${v.description}${v.fixedIn ? ` (Fix: upgrade to ${v.fixedIn})` : ''}`)
  .join('\n') || 'None'}

## Recommendations
${scans.recommendations.map(r => `- ${r}`).join('\n')}

## Next Steps
1. Update vulnerable dependencies
2. Rebuild Docker images
3. Re-scan to verify fixes
4. Deploy updated images
`;
}
