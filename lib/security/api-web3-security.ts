/**
 * API Security Assessment and Web3 Security Library
 */

export interface APISecurityCheck {
  endpoint: string;
  method: string;
  issues: string[];
  riskLevel: "critical" | "high" | "medium" | "low";
  recommendations: string[];
}

// ============================================================================
// API SECURITY
// ============================================================================

/**
 * Generate API security best practices guide
 */
export function generateAPISecurityGuide(): string {
  return `# API Security Best Practices

## Authentication

### Bearer Token Authentication
\`\`\`typescript
// Validate Authorization header
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});
\`\`\`

### API Key Authentication
\`\`\`typescript
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // Hash API key before comparison (constant-time)
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

  if (!isValidApiKey(hashedKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
});
\`\`\`

## Input Validation

### Request Validation with Zod
\`\`\`typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  age: z.number().int().min(13).max(120),
});

app.post('/api/users', (req, res) => {
  try {
    const validated = createUserSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input', details: error.errors });
  }
});
\`\`\`

## CORS Configuration

### Restrictive CORS
\`\`\`typescript
import cors from 'cors';

const allowedOrigins = [
  'https://yourdomain.com',
  'https://app.yourdomain.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
}));
\`\`\`

## Rate Limiting

### Per-Endpoint Rate Limiting
\`\`\`typescript
// Strict for authentication
app.post('/api/login', authLimiter, loginHandler);

// Standard for general API
app.use('/api/', apiLimiter);

// Generous for public read endpoints
app.get('/api/public/', publicLimiter);
\`\`\`

## Response Security

### Remove Sensitive Headers
\`\`\`typescript
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  next();
});
\`\`\`

### Don't Expose Stack Traces
\`\`\`typescript
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});
\`\`\`

## Mass Assignment Protection

### Whitelist Fields
\`\`\`typescript
const allowedFields = ['name', 'email', 'age'];

function sanitizeInput(input: any): any {
  return Object.keys(input)
    .filter(key => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = input[key];
      return obj;
    }, {} as any);
}

app.put('/api/users/:id', async (req, res) => {
  const sanitized = sanitizeInput(req.body);
  await updateUser(req.params.id, sanitized);
});
\`\`\`

## GraphQL Security

### Query Depth Limiting
\`\`\`typescript
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(10)],
});
\`\`\`

### Query Complexity Limiting
\`\`\`typescript
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    createComplexityLimitRule(1000, {
      onCost: (cost) => console.log('Query cost:', cost),
    }),
  ],
});
\`\`\`
`;
}

/**
 * Audit REST API endpoints for security
 */
export function auditRESTAPI(endpoints: Array<{ path: string; method: string; handler: string }>): APISecurityCheck[] {
  return endpoints.map((endpoint) => {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for authentication
    if (!endpoint.handler.includes("requireAuth") && !endpoint.handler.includes("isAuthenticated")) {
      issues.push("No authentication middleware detected");
      recommendations.push("Add authentication middleware to protected endpoints");
    }

    // Check for input validation
    if (!endpoint.handler.includes("validate") && !endpoint.handler.includes("schema")) {
      issues.push("No input validation detected");
      recommendations.push("Add input validation using Zod or similar library");
    }

    // Check for rate limiting
    if (!endpoint.handler.includes("limiter") && !endpoint.handler.includes("rateLimit")) {
      issues.push("No rate limiting detected");
      recommendations.push("Add rate limiting to prevent abuse");
    }

    // Check for authorization on sensitive endpoints
    if (
      endpoint.path.includes("/admin") ||
      endpoint.path.includes("/delete") ||
      endpoint.method === "DELETE"
    ) {
      if (!endpoint.handler.includes("requireRole") && !endpoint.handler.includes("checkPermission")) {
        issues.push("No authorization check on sensitive endpoint");
        recommendations.push("Add role/permission checks for sensitive operations");
      }
    }

    return {
      endpoint: `${endpoint.method} ${endpoint.path}`,
      method: endpoint.method,
      issues,
      riskLevel: issues.length > 2 ? "high" : issues.length > 0 ? "medium" : "low",
      recommendations,
    };
  });
}

// ============================================================================
// WEB3 / SMART CONTRACT SECURITY
// ============================================================================

/**
 * Generate Web3 security checklist
 */
export function generateWeb3SecurityChecklist(): string {
  return `# Web3 DApp Security Checklist

## Smart Contract Security

### Reentrancy Protection
\`\`\`solidity
// ✅ GOOD: Checks-Effects-Interactions pattern
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // Effects BEFORE external call
    balances[msg.sender] -= amount;

    // External call LAST
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}

// ❌ BAD: Vulnerable to reentrancy
function withdrawBad(uint256 amount) public {
    require(balances[msg.sender] >= amount);

    // External call BEFORE state update
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);

    balances[msg.sender] -= amount; // State updated AFTER external call
}
\`\`\`

### Integer Overflow/Underflow
\`\`\`solidity
// ✅ GOOD: Use Solidity 0.8+ (built-in overflow checks)
pragma solidity ^0.8.0;

function add(uint256 a, uint256 b) public pure returns (uint256) {
    return a + b; // Automatically reverts on overflow
}

// For Solidity < 0.8, use SafeMath
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

using SafeMath for uint256;

function addSafe(uint256 a, uint256 b) public pure returns (uint256) {
    return a.add(b);
}
\`\`\`

### Access Control
\`\`\`solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract SecureContract is Ownable {
    // ✅ GOOD: Only owner can call
    function sensitiveFunction() public onlyOwner {
        // Critical operation
    }

    // ✅ GOOD: Role-based access
    mapping(address => bool) public admins;

    modifier onlyAdmin() {
        require(admins[msg.sender], "Not an admin");
        _;
    }

    function adminFunction() public onlyAdmin {
        // Admin-only operation
    }
}
\`\`\`

### Front-Running Protection
\`\`\`solidity
// ✅ GOOD: Commit-reveal scheme
mapping(address => bytes32) public commitments;

function commit(bytes32 hash) public {
    commitments[msg.sender] = hash;
}

function reveal(uint256 value, bytes32 salt) public {
    require(
        commitments[msg.sender] == keccak256(abi.encodePacked(value, salt)),
        "Invalid reveal"
    );
    // Process value
}
\`\`\`

### Gas Optimization Security
\`\`\`solidity
// ✅ GOOD: Limit array operations
function processItems(uint256[] calldata items) public {
    require(items.length <= 100, "Too many items"); // Prevent DoS

    for (uint256 i = 0; i < items.length; i++) {
        // Process item
    }
}

// ✅ GOOD: Use events for historical data instead of storage
event ItemProcessed(uint256 indexed itemId, uint256 timestamp);

function processItem(uint256 itemId) public {
    emit ItemProcessed(itemId, block.timestamp);
}
\`\`\`

## Frontend Security

### Wallet Connection Validation
\`\`\`typescript
import { ethers } from 'ethers';

async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    // Validate account format
    if (!ethers.utils.isAddress(accounts[0])) {
      throw new Error('Invalid address');
    }

    // Verify network
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const expectedChainId = '0x1'; // Mainnet

    if (chainId !== expectedChainId) {
      throw new Error('Wrong network');
    }

    return accounts[0];
  } catch (error) {
    console.error('Wallet connection failed:', error);
    throw error;
  }
}
\`\`\`

### Transaction Validation
\`\`\`typescript
async function sendTransaction(to: string, value: string) {
  // Validate recipient address
  if (!ethers.utils.isAddress(to)) {
    throw new Error('Invalid recipient address');
  }

  // Validate amount
  const amount = ethers.utils.parseEther(value);
  if (amount.lte(0)) {
    throw new Error('Invalid amount');
  }

  // Get user confirmation with clear details
  const confirmed = await confirm(\`
    Send \${value} ETH to \${to}?
    Gas estimate: X ETH
    Total: Y ETH
  \`);

  if (!confirmed) return;

  const signer = provider.getSigner();

  // Send with gas limit
  const tx = await signer.sendTransaction({
    to,
    value: amount,
    gasLimit: 21000,
  });

  // Wait for confirmation
  await tx.wait();
}
\`\`\`

### Signature Verification
\`\`\`typescript
async function verifySignature(
  message: string,
  signature: string,
  expectedSigner: string
): Promise<boolean> {
  try {
    // Recover signer from signature
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);

    // Compare addresses (case-insensitive)
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

// Usage
const message = "Sign this message to prove ownership";
const signature = await signer.signMessage(message);
const isValid = await verifySignature(message, signature, userAddress);
\`\`\`

### Prevent Phishing
\`\`\`typescript
// Display full transaction details before signing
function formatTransactionForDisplay(tx: any) {
  return {
    to: tx.to,
    value: ethers.utils.formatEther(tx.value),
    data: tx.data,
    chainId: tx.chainId,
    nonce: tx.nonce,
  };
}

// Verify contract addresses
const VERIFIED_CONTRACTS = {
  tokenContract: '0x...',
  stakingContract: '0x...',
};

function verifyContractAddress(address: string, contractType: string): boolean {
  return VERIFIED_CONTRACTS[contractType] === address;
}
\`\`\`

## Testing

### Hardhat Security Tests
\`\`\`typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Security Tests", function () {
  it("should prevent reentrancy attacks", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("VulnerableContract");
    const contract = await Contract.deploy();

    const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await Attacker.connect(attacker).deploy(contract.address);

    // Attempt reentrancy attack
    await expect(
      attackerContract.attack({ value: ethers.utils.parseEther("1") })
    ).to.be.revertedWith("Reentrancy detected");
  });

  it("should enforce access control", async function () {
    const [owner, user] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("SecureContract");
    const contract = await Contract.deploy();

    // User should not be able to call owner-only function
    await expect(
      contract.connect(user).ownerOnlyFunction()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should prevent integer overflow", async function () {
    const Contract = await ethers.getContractFactory("MathContract");
    const contract = await Contract.deploy();

    const maxUint256 = ethers.constants.MaxUint256;

    // Should revert on overflow
    await expect(
      contract.add(maxUint256, 1)
    ).to.be.reverted;
  });
});
\`\`\`

### Fuzzing Tests
\`\`\`solidity
// Echidna fuzzing test
contract EchidnaTest {
    MyContract target;

    constructor() {
        target = new MyContract();
    }

    // Invariant: balance should never exceed total supply
    function echidna_balance_check() public view returns (bool) {
        return target.balanceOf(address(this)) <= target.totalSupply();
    }
}
\`\`\`

## Audit Checklist

- [ ] Run Slither static analyzer
- [ ] Run Mythril symbolic analyzer
- [ ] Comprehensive unit tests (>95% coverage)
- [ ] Integration tests for all interactions
- [ ] Fuzzing tests with Echidna
- [ ] Manual code review
- [ ] Professional audit by third party
- [ ] Testnet deployment and testing
- [ ] Bug bounty program before mainnet
- [ ] Gradual mainnet rollout with limits
`;
}

/**
 * Web3 vulnerability patterns
 */
export const web3VulnerabilityPatterns = [
  {
    name: "Reentrancy",
    pattern: /\.call\{value:.*\}.*balances\[.*\]\s*[-=]/s,
    severity: "critical" as const,
    description: "Potential reentrancy vulnerability - external call before state update",
    fix: "Move state updates before external calls (checks-effects-interactions pattern)",
  },
  {
    name: "Unchecked Call Return",
    pattern: /\.call\{|\.send\(|\.transfer\(/,
    severity: "high" as const,
    description: "External call without checking return value",
    fix: "Always check return values of external calls",
  },
  {
    name: "tx.origin Authentication",
    pattern: /tx\.origin/,
    severity: "high" as const,
    description: "Using tx.origin for authentication is vulnerable to phishing",
    fix: "Use msg.sender instead of tx.origin",
  },
  {
    name: "Floating Pragma",
    pattern: /pragma solidity\s*\^/,
    severity: "medium" as const,
    description: "Floating pragma allows compilation with future versions",
    fix: "Lock pragma to specific version (e.g., pragma solidity 0.8.19)",
  },
  {
    name: "Uninitialized Storage Pointer",
    pattern: /struct.*storage\s+\w+;/,
    severity: "high" as const,
    description: "Uninitialized storage pointer can overwrite storage",
    fix: "Always initialize storage pointers",
  },
];

/**
 * Generate smart contract security tests
 */
export function generateSmartContractTests(): string {
  return `// Smart Contract Security Test Suite
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Smart Contract Security", function () {
  async function deployFixture() {
    const [owner, user1, user2, attacker] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("MyContract");
    const contract = await Contract.deploy();
    return { contract, owner, user1, user2, attacker };
  }

  describe("Access Control", function () {
    it("should only allow owner to call privileged functions", async function () {
      const { contract, user1 } = await loadFixture(deployFixture);

      await expect(
        contract.connect(user1).privilegedFunction()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should allow owner to transfer ownership", async function () {
      const { contract, owner, user1 } = await loadFixture(deployFixture);

      await contract.connect(owner).transferOwnership(user1.address);
      expect(await contract.owner()).to.equal(user1.address);
    });
  });

  describe("Reentrancy Protection", function () {
    it("should prevent reentrancy attacks", async function () {
      const { contract, attacker } = await loadFixture(deployFixture);

      const AttackerContract = await ethers.getContractFactory("ReentrancyAttacker");
      const attackerContract = await AttackerContract.connect(attacker).deploy(
        contract.address
      );

      await expect(
        attackerContract.attack({ value: ethers.utils.parseEther("1") })
      ).to.be.reverted;
    });
  });

  describe("Integer Overflow/Underflow", function () {
    it("should revert on overflow", async function () {
      const { contract } = await loadFixture(deployFixture);

      const maxUint256 = ethers.constants.MaxUint256;
      await expect(contract.add(maxUint256, 1)).to.be.reverted;
    });

    it("should revert on underflow", async function () {
      const { contract } = await loadFixture(deployFixture);

      await expect(contract.subtract(0, 1)).to.be.reverted;
    });
  });

  describe("Gas Limits", function () {
    it("should limit array operations to prevent DoS", async function () {
      const { contract } = await loadFixture(deployFixture);

      const tooManyItems = new Array(1000).fill(1);
      await expect(
        contract.processItems(tooManyItems)
      ).to.be.revertedWith("Too many items");
    });
  });

  describe("Front-Running Protection", function () {
    it("should use commit-reveal to prevent front-running", async function () {
      const { contract, user1 } = await loadFixture(deployFixture);

      const value = 42;
      const salt = ethers.utils.randomBytes(32);
      const commitment = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32"], [value, salt])
      );

      await contract.connect(user1).commit(commitment);
      await contract.connect(user1).reveal(value, salt);
    });
  });

  describe("External Call Safety", function () {
    it("should handle failed external calls", async function () {
      const { contract } = await loadFixture(deployFixture);

      const maliciousAddress = "0x0000000000000000000000000000000000000000";
      await expect(
        contract.sendEther(maliciousAddress, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("Transfer failed");
    });
  });
});
`;
}

/**
 * Scan Solidity code for vulnerabilities
 */
export function scanSolidityCode(code: string): Array<{ type: string; severity: string; line: number; description: string }> {
  const vulnerabilities: Array<{ type: string; severity: string; line: number; description: string }> = [];

  web3VulnerabilityPatterns.forEach((pattern) => {
    const matches = code.matchAll(new RegExp(pattern.pattern, "g"));
    for (const match of matches) {
      const lineNumber = code.substring(0, match.index).split("\n").length;
      vulnerabilities.push({
        type: pattern.name,
        severity: pattern.severity,
        line: lineNumber,
        description: pattern.description,
      });
    }
  });

  return vulnerabilities;
}
