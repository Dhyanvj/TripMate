import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook to determine if viewport is mobile size
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on initial load
    checkMobile();

    // Add event listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Hook to track previous page for back navigation
 */
export function usePreviousRoute() {
  const [prevRoute, setPrevRoute] = useState<string | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    setPrevRoute(location);
  }, [location]);

  return prevRoute;
}

/**
 * Hook for handling form submissions with loading state
 */
export function useFormSubmit<T>(
  submitFn: (data: T) => Promise<any>,
  onSuccess?: () => void
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: T) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await submitFn(data);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting, error };
}

/**
 * Hook to debounce a value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
