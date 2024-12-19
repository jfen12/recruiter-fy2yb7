/**
 * @fileoverview Custom React hook for form state management with comprehensive validation
 * and error handling capabilities. Implements performance-optimized form handling with
 * type safety and security controls.
 * @version 1.0.0
 */

import { useState, useCallback, useEffect, ChangeEvent, FocusEvent, FormEvent } from 'react'; // ^18.0.0
import { z } from 'zod'; // ^3.21.4
import { validateEmail, validateRequiredField } from '../utils/validation';

/**
 * Props interface for useForm hook configuration
 */
interface UseFormProps<T extends Record<string, any>> {
  initialValues: T;
  validationSchema: z.ZodSchema;
  onSubmit: (values: T) => void | Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateDebounceMs?: number;
}

/**
 * Interface for form state management
 */
interface FormState<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

/**
 * Return type for useForm hook with enhanced functionality
 */
interface UseFormReturn<T> extends FormState<T> {
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldTouched: (field: keyof T, touched?: boolean) => void;
  resetForm: () => void;
  validateField: (field: keyof T) => Promise<void>;
  validateForm: () => Promise<boolean>;
}

/**
 * Custom hook for comprehensive form state management with validation
 * @template T - Type of form values
 * @param props - Form configuration props
 * @returns Form state and handlers
 */
export function useForm<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit,
  validateOnChange = true,
  validateOnBlur = true,
  validateDebounceMs = 300
}: UseFormProps<T>): UseFormReturn<T> {
  // Initialize form state with type safety
  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isValid: false,
    isSubmitting: false,
    isDirty: false
  });

  // Validation timer for debouncing
  const [validationTimer, setValidationTimer] = useState<NodeJS.Timeout | null>(null);

  /**
   * Validates a single field with error handling
   */
  const validateField = useCallback(async (field: keyof T): Promise<void> => {
    try {
      const fieldSchema = validationSchema.shape[field as string];
      if (!fieldSchema) return;

      await fieldSchema.parseAsync(formState.values[field]);
      setFormState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [field]: ''
        }
      }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        setFormState(prev => ({
          ...prev,
          errors: {
            ...prev.errors,
            [field]: error.errors[0]?.message || 'Invalid value'
          }
        }));
      }
    }
  }, [formState.values, validationSchema]);

  /**
   * Validates entire form and returns validation status
   */
  const validateForm = useCallback(async (): Promise<boolean> => {
    try {
      await validationSchema.parseAsync(formState.values);
      setFormState(prev => ({
        ...prev,
        errors: {},
        isValid: true
      }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.reduce((acc, curr) => ({
          ...acc,
          [curr.path[0]]: curr.message
        }), {});
        
        setFormState(prev => ({
          ...prev,
          errors,
          isValid: false
        }));
      }
      return false;
    }
  }, [formState.values, validationSchema]);

  /**
   * Debounced field validation handler
   */
  const debouncedValidation = useCallback((field: keyof T) => {
    if (validationTimer) {
      clearTimeout(validationTimer);
    }

    const timer = setTimeout(() => {
      validateField(field);
    }, validateDebounceMs);

    setValidationTimer(timer);
  }, [validateField, validateDebounceMs, validationTimer]);

  /**
   * Handles input change events with validation
   */
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setFormState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        [name]: fieldValue
      },
      isDirty: true
    }));

    if (validateOnChange) {
      debouncedValidation(name as keyof T);
    }
  }, [validateOnChange, debouncedValidation]);

  /**
   * Handles input blur events with validation
   */
  const handleBlur = useCallback((e: FocusEvent<HTMLInputElement>): void => {
    const { name } = e.target;

    setFormState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [name]: true
      }
    }));

    if (validateOnBlur) {
      validateField(name as keyof T);
    }
  }, [validateOnBlur, validateField]);

  /**
   * Handles form submission with validation
   */
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    setFormState(prev => ({
      ...prev,
      isSubmitting: true
    }));

    try {
      const isValid = await validateForm();
      if (!isValid) {
        throw new Error('Form validation failed');
      }

      await onSubmit(formState.values);

      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        isDirty: false
      }));
    } catch (error) {
      setFormState(prev => ({
        ...prev,
        isSubmitting: false
      }));
      throw error;
    }
  }, [formState.values, validateForm, onSubmit]);

  /**
   * Programmatically sets a field value
   */
  const setFieldValue = useCallback((field: keyof T, value: any): void => {
    setFormState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        [field]: value
      },
      isDirty: true
    }));

    if (validateOnChange) {
      debouncedValidation(field);
    }
  }, [validateOnChange, debouncedValidation]);

  /**
   * Programmatically sets a field's touched state
   */
  const setFieldTouched = useCallback((field: keyof T, touched: boolean = true): void => {
    setFormState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [field]: touched
      }
    }));
  }, []);

  /**
   * Resets form to initial state
   */
  const resetForm = useCallback((): void => {
    setFormState({
      values: initialValues,
      errors: {},
      touched: {},
      isValid: false,
      isSubmitting: false,
      isDirty: false
    });
  }, [initialValues]);

  // Cleanup validation timer on unmount
  useEffect(() => {
    return () => {
      if (validationTimer) {
        clearTimeout(validationTimer);
      }
    };
  }, [validationTimer]);

  return {
    ...formState,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldTouched,
    resetForm,
    validateField,
    validateForm
  };
}