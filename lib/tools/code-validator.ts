// @ts-nocheck
import * as ts from 'typescript';
import * as prettier from 'prettier';

/**
 * Result type for validation operations
 */
export interface ValidationResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  formatted?: string;
  message?: string;
}

/**
 * Validates TypeScript/JavaScript code using the TypeScript compiler API
 * and formats it using Prettier
 *
 * @param code - The source code to validate
 * @param filePath - The file path (used to determine file type)
 * @returns ValidationResult with success status, errors, and formatted code
 */
export async function validateCode(
  code: string,
  filePath: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Determine if it's TypeScript or JavaScript
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const isJavaScript = filePath.endsWith('.js') || filePath.endsWith('.jsx');

    if (!isTypeScript && !isJavaScript) {
      return {
        success: false,
        errors: ['File must be a TypeScript (.ts, .tsx) or JavaScript (.js, .jsx) file'],
      };
    }

    // Compile the code to check for syntax and type errors
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      jsx: filePath.endsWith('x') ? ts.JsxEmit.React : undefined,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      allowJs: true,
      checkJs: isJavaScript,
      noEmit: true,
    };

    // Create a source file
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.ES2020,
      true
    );

    // Create a program for type checking
    const host = ts.createCompilerHost(compilerOptions);
    const originalGetSourceFile = host.getSourceFile;

    host.getSourceFile = (fileName, languageVersion) => {
      if (fileName === filePath) {
        return sourceFile;
      }
      return originalGetSourceFile(fileName, languageVersion);
    };

    const program = ts.createProgram([filePath], compilerOptions, host);
    const diagnostics = ts.getPreEmitDiagnostics(program);

    // Process diagnostics
    diagnostics.forEach((diagnostic) => {
      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start
        );
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          '\n'
        );
        const errorMessage = `Line ${line + 1}, Col ${character + 1}: ${message}`;

        if (diagnostic.category === ts.DiagnosticCategory.Error) {
          errors.push(errorMessage);
        } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
          warnings.push(errorMessage);
        }
      } else {
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          '\n'
        );
        if (diagnostic.category === ts.DiagnosticCategory.Error) {
          errors.push(message);
        } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
          warnings.push(message);
        }
      }
    });

    // Format the code with Prettier
    let formatted: string | undefined;
    try {
      formatted = await prettier.format(code, {
        parser: isTypeScript ? 'typescript' : 'babel',
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 80,
        tabWidth: 2,
      });
    } catch (prettierError) {
      warnings.push(
        `Prettier formatting failed: ${
          prettierError instanceof Error ? prettierError.message : String(prettierError)
        }`
      );
      formatted = code; // Use original code if formatting fails
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      formatted,
      message: errors.length === 0 ? 'Code validation successful' : 'Code validation failed',
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        `Validation error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
    };
  }
}

/**
 * Validates JSON syntax and structure
 *
 * @param jsonString - The JSON string to validate
 * @returns ValidationResult with success status and any errors
 */
export function validateJSON(jsonString: string): ValidationResult {
  try {
    // Attempt to parse the JSON
    const parsed = JSON.parse(jsonString);

    // Format the JSON for better readability
    const formatted = JSON.stringify(parsed, null, 2);

    return {
      success: true,
      formatted,
      message: 'JSON validation successful',
    };
  } catch (error) {
    // Extract error details
    let errorMessage = 'Invalid JSON syntax';

    if (error instanceof SyntaxError) {
      errorMessage = error.message;

      // Try to extract position information
      const match = errorMessage.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1], 10);
        const lines = jsonString.substring(0, position).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        errorMessage = `${errorMessage} (Line ${line}, Column ${column})`;
      }
    }

    return {
      success: false,
      errors: [errorMessage],
      message: 'JSON validation failed',
    };
  }
}

/**
 * Validates SQL syntax and checks for dangerous patterns
 *
 * @param sql - The SQL query to validate
 * @returns ValidationResult with success status, errors, and warnings
 */
export function validateSQL(sql: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation: check if SQL is not empty
  if (!sql || sql.trim().length === 0) {
    return {
      success: false,
      errors: ['SQL query cannot be empty'],
    };
  }

  const sqlUpper = sql.trim().toUpperCase();
  const sqlLower = sql.trim().toLowerCase();

  // Check for basic SQL syntax - must start with a valid SQL keyword
  const validStartKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP',
    'TRUNCATE', 'WITH', 'EXPLAIN', 'DESCRIBE', 'SHOW', 'SET'
  ];

  const startsWithValidKeyword = validStartKeywords.some(keyword =>
    sqlUpper.startsWith(keyword)
  );

  if (!startsWithValidKeyword) {
    errors.push(
      `SQL query must start with a valid keyword (${validStartKeywords.join(', ')})`
    );
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    {
      pattern: /DROP\s+(TABLE|DATABASE|SCHEMA)/i,
      message: 'DROP operations are potentially dangerous',
    },
    {
      pattern: /DELETE\s+FROM\s+\w+\s*(?:;|$)/i,
      message: 'DELETE without WHERE clause will remove all rows',
    },
    {
      pattern: /UPDATE\s+\w+\s+SET\s+.+?(?:;|$)(?!.*WHERE)/is,
      message: 'UPDATE without WHERE clause will modify all rows',
    },
    {
      pattern: /TRUNCATE\s+TABLE/i,
      message: 'TRUNCATE will remove all rows and cannot be rolled back in some databases',
    },
    {
      pattern: /;\s*DROP/i,
      message: 'Potential SQL injection: multiple statements with DROP detected',
    },
    {
      pattern: /--/,
      message: 'SQL comment detected (--), ensure this is intentional',
    },
    {
      pattern: /\/\*/,
      message: 'SQL block comment detected (/* */), ensure this is intentional',
    },
  ];

  dangerousPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(sql)) {
      warnings.push(message);
    }
  });

  // Check for basic syntax issues
  const openParens = (sql.match(/\(/g) || []).length;
  const closeParens = (sql.match(/\)/g) || []).length;

  if (openParens !== closeParens) {
    errors.push(
      `Mismatched parentheses: ${openParens} opening, ${closeParens} closing`
    );
  }

  // Check for unbalanced quotes
  const singleQuotes = (sql.match(/'/g) || []).length;
  const doubleQuotes = (sql.match(/"/g) || []).length;

  if (singleQuotes % 2 !== 0) {
    errors.push('Unbalanced single quotes detected');
  }

  if (doubleQuotes % 2 !== 0) {
    errors.push('Unbalanced double quotes detected');
  }

  // Check for SELECT * in production queries
  if (/SELECT\s+\*\s+FROM/i.test(sql)) {
    warnings.push(
      'SELECT * is not recommended in production; specify columns explicitly'
    );
  }

  // Check for missing semicolon at the end (optional warning)
  if (!sql.trim().endsWith(';')) {
    warnings.push('SQL query should end with a semicolon');
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    message: errors.length === 0
      ? 'SQL validation successful'
      : 'SQL validation failed',
  };
}
// @ts-nocheck
