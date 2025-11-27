/**
 * Form Handling - Patterns for form validation and management
 */

export interface FormField {
  name: string;
  type: "text" | "email" | "password" | "number" | "select" | "checkbox" | "radio" | "textarea" | "date";
  label: string;
  placeholder?: string;
  required?: boolean;
  validation?: ValidationRule[];
  options?: SelectOption[]; // For select, radio
  defaultValue?: any;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface ValidationRule {
  type: "required" | "email" | "min" | "max" | "minLength" | "maxLength" | "pattern" | "custom";
  value?: any;
  message: string;
}

export interface FormSpec {
  name: string;
  fields: FormField[];
  submitLabel?: string;
  onSubmit: string; // Function name
}

/**
 * Generate React Hook Form setup (Recommended)
 */
export function generateReactHookForm(spec: FormSpec): string {
  return `/**
 * ${spec.name} Form
 * Built with React Hook Form + Zod validation
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Validation schema
const ${spec.name}Schema = z.object({
${spec.fields.map(field => generateZodField(field)).join('\n')}
});

type ${spec.name}FormData = z.infer<typeof ${spec.name}Schema>;

export function ${spec.name}() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<${spec.name}FormData>({
    resolver: zodResolver(${spec.name}Schema),
    defaultValues: {
${spec.fields.map(field => `      ${field.name}: ${field.defaultValue ? JSON.stringify(field.defaultValue) : "''"},`).join('\n')}
    },
  });

  const onSubmit = async (data: ${spec.name}FormData) => {
    try {
      await ${spec.onSubmit}(data);
      reset(); // Reset form on success
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
${spec.fields.map(field => generateFormField(field)).join('\n\n')}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary"
      >
        {isSubmitting ? 'Submitting...' : '${spec.submitLabel || 'Submit'}'}
      </button>
    </form>
  );
}
`;
}

function generateZodField(field: FormField): string {
  let validation = '';

  switch (field.type) {
    case 'email':
      validation = 'z.string().email("Invalid email address")';
      break;
    case 'number':
      validation = 'z.number()';
      break;
    case 'checkbox':
      validation = 'z.boolean()';
      break;
    default:
      validation = 'z.string()';
  }

  // Add validation rules
  if (field.validation) {
    field.validation.forEach(rule => {
      switch (rule.type) {
        case 'required':
          validation += `.min(1, "${rule.message}")`;
          break;
        case 'minLength':
          validation += `.min(${rule.value}, "${rule.message}")`;
          break;
        case 'maxLength':
          validation += `.max(${rule.value}, "${rule.message}")`;
          break;
        case 'pattern':
          validation += `.regex(${rule.value}, "${rule.message}")`;
          break;
      }
    });
  } else if (!field.required) {
    validation += '.optional()';
  }

  return `  ${field.name}: ${validation},`;
}

function generateFormField(field: FormField): string {
  if (field.type === 'select') {
    return `      <div>
        <label htmlFor="${field.name}" className="block text-sm font-medium">
          ${field.label} ${field.required ? '*' : ''}
        </label>
        <select
          id="${field.name}"
          {...register('${field.name}')}
          className="input"
        >
          <option value="">Select...</option>
${field.options?.map(opt => `          <option value="${opt.value}">${opt.label}</option>`).join('\n') || ''}
        </select>
        {errors.${field.name} && (
          <span className="text-red-500 text-sm">{errors.${field.name}?.message}</span>
        )}
      </div>`;
  }

  if (field.type === 'textarea') {
    return `      <div>
        <label htmlFor="${field.name}" className="block text-sm font-medium">
          ${field.label} ${field.required ? '*' : ''}
        </label>
        <textarea
          id="${field.name}"
          {...register('${field.name}')}
          placeholder="${field.placeholder || ''}"
          className="input"
          rows={4}
        />
        {errors.${field.name} && (
          <span className="text-red-500 text-sm">{errors.${field.name}?.message}</span>
        )}
      </div>`;
  }

  if (field.type === 'checkbox') {
    return `      <div className="flex items-center">
        <input
          id="${field.name}"
          type="checkbox"
          {...register('${field.name}')}
          className="checkbox"
        />
        <label htmlFor="${field.name}" className="ml-2 text-sm">
          ${field.label} ${field.required ? '*' : ''}
        </label>
        {errors.${field.name} && (
          <span className="text-red-500 text-sm ml-2">{errors.${field.name}?.message}</span>
        )}
      </div>`;
  }

  return `      <div>
        <label htmlFor="${field.name}" className="block text-sm font-medium">
          ${field.label} ${field.required ? '*' : ''}
        </label>
        <input
          id="${field.name}"
          type="${field.type}"
          {...register('${field.name}')}
          placeholder="${field.placeholder || ''}"
          className="input"
        />
        {errors.${field.name} && (
          <span className="text-red-500 text-sm">{errors.${field.name}?.message}</span>
        )}
      </div>`;
}

/**
 * Form patterns
 */
export const formPatterns = {
  /**
   * Multi-step Form
   */
  multiStep: `// Multi-step Form Pattern
export function MultiStepForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});

  const handleNext = (data: any) => {
    setFormData({ ...formData, ...data });
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = async (finalData: any) => {
    const completeData = { ...formData, ...finalData };
    await api.submitForm(completeData);
  };

  return (
    <div>
      {step === 1 && <Step1Form onNext={handleNext} />}
      {step === 2 && <Step2Form onNext={handleNext} onBack={handleBack} />}
      {step === 3 && <Step3Form onSubmit={handleSubmit} onBack={handleBack} />}
    </div>
  );
}`,

  /**
   * Dynamic Form Fields
   */
  dynamicFields: `// Dynamic Fields Pattern
export function DynamicForm() {
  const { register, control, handleSubmit } = useForm();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(\`items.\${index}.name\`)} />
          <button type="button" onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ name: "" })}>
        Add Item
      </button>
      <button type="submit">Submit</button>
    </form>
  );
}`,

  /**
   * File Upload with Preview
   */
  fileUpload: `// File Upload Pattern
export function FileUploadForm() {
  const [preview, setPreview] = useState<string | null>(null);
  const { register, handleSubmit } = useForm();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    formData.append('file', data.file[0]);
    await api.uploadFile(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        type="file"
        {...register('file')}
        onChange={handleFileChange}
        accept="image/*"
      />
      {preview && <img src={preview} alt="Preview" className="w-48 h-48" />}
      <button type="submit">Upload</button>
    </form>
  );
}`,

  /**
   * Dependent Fields
   */
  dependentFields: `// Dependent Fields Pattern
export function DependentFieldsForm() {
  const { register, watch, handleSubmit } = useForm();
  const country = watch('country');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <select {...register('country')}>
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </select>

      {country === 'us' && (
        <select {...register('state')}>
          <option value="ca">California</option>
          <option value="ny">New York</option>
        </select>
      )}

      {country === 'ca' && (
        <select {...register('province')}>
          <option value="on">Ontario</option>
          <option value="bc">British Columbia</option>
        </select>
      )}

      <button type="submit">Submit</button>
    </form>
  );
}`,

  /**
   * Debounced Validation
   */
  debouncedValidation: `// Debounced Validation Pattern
export function DebouncedValidationForm() {
  const { register, setError, clearErrors } = useForm();
  const [isChecking, setIsChecking] = useState(false);

  const checkEmailAvailability = useMemo(
    () =>
      debounce(async (email: string) => {
        setIsChecking(true);
        try {
          const available = await api.checkEmail(email);
          if (!available) {
            setError('email', {
              type: 'manual',
              message: 'Email already exists',
            });
          } else {
            clearErrors('email');
          }
        } finally {
          setIsChecking(false);
        }
      }, 500),
    []
  );

  return (
    <form>
      <input
        {...register('email')}
        onChange={(e) => checkEmailAvailability(e.target.value)}
      />
      {isChecking && <span>Checking...</span>}
    </form>
  );
}`,
};

/**
 * Generate form validation utilities
 */
export function generateValidationUtils(): string {
  return `/**
 * Form Validation Utilities
 */

// Common validation patterns
export const validationPatterns = {
  email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$/i,
  phone: /^[\\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$/,
  url: /^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$/,
  postalCode: /^[0-9]{5}(-[0-9]{4})?$/,
  creditCard: /^[0-9]{13,19}$/,
};

// Custom validation functions
export const validators = {
  minLength: (min: number) => (value: string) =>
    value.length >= min || \`Must be at least \${min} characters\`,

  maxLength: (max: number) => (value: string) =>
    value.length <= max || \`Must be at most \${max} characters\`,

  matches: (pattern: RegExp, message: string) => (value: string) =>
    pattern.test(value) || message,

  oneOf: (options: string[], message: string) => (value: string) =>
    options.includes(value) || message,

  passwordStrength: (value: string) => {
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*]/.test(value);

    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!hasUpperCase) return 'Password must contain uppercase letter';
    if (!hasLowerCase) return 'Password must contain lowercase letter';
    if (!hasNumbers) return 'Password must contain number';
    if (!hasSpecialChar) return 'Password must contain special character';

    return true;
  },

  matchField: (fieldName: string) => (value: string, values: any) =>
    value === values[fieldName] || \`Must match \${fieldName}\`,
};
`;
}

/**
 * Form best practices
 */
export const formBestPractices = {
  validation: [
    "Validate on blur, not on every keystroke",
    "Show validation errors inline near the field",
    "Use clear, actionable error messages",
    "Validate on submit before API call",
    "Use schema validation (Zod, Yup) for type safety",
  ],

  ux: [
    "Disable submit button while submitting",
    "Show loading state during submission",
    "Reset form after successful submission",
    "Preserve form data on navigation (auto-save)",
    "Use appropriate input types (email, tel, date)",
  ],

  accessibility: [
    "Use <label> for every input",
    "Link errors to fields with aria-describedby",
    "Announce errors to screen readers",
    "Ensure keyboard navigation works",
    "Provide clear focus indicators",
  ],

  performance: [
    "Debounce expensive validations",
    "Use controlled components only when needed",
    "Memoize validation functions",
    "Split large forms into steps",
    "Lazy load form fields if many",
  ],
};
