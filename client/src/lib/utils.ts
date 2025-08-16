import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date range string
 */
export function formatDateRange(startDate?: string | Date | null, endDate?: string | Date | null): string {
  if (!startDate) return "No dates set";
  
  // Handle various date input types more robustly
  let start: Date;
  try {
    // Support ISO date strings or Date objects
    start = startDate instanceof Date ? startDate : new Date(startDate);
    
    // Check if date is valid
    if (isNaN(start.getTime())) {
      console.error('Invalid start date:', startDate);
      return "No dates set";
    }
  } catch (error) {
    console.error('Error parsing start date:', error);
    return "No dates set";
  }
  
  // If no end date, just return the start date
  if (!endDate) {
    return formatDate(start);
  }
  
  // Parse end date
  let end: Date;
  try {
    end = endDate instanceof Date ? endDate : new Date(endDate);
    
    // Check if date is valid
    if (isNaN(end.getTime())) {
      console.error('Invalid end date:', endDate);
      return formatDate(start);
    }
  } catch (error) {
    console.error('Error parsing end date:', error);
    return formatDate(start);
  }
  
  // Same month and year
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
  }
  
  // Same year but different months
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} - ${end.toLocaleDateString('en-US', { month: 'short' })} ${end.getDate()}, ${start.getFullYear()}`;
  }
  
  // Different years
  return `${formatDate(start)} - ${formatDate(end)}`;
}

/**
 * Formats a single date
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Formats time for chat messages
 */
export function formatTime(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Formats a timestamp relative to current time (e.g. "2 hours ago")
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDays = Math.round(diffHr / 24);
  
  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHr < 24) {
    return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

/**
 * Truncates text to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generates user initials from name
 */
export function getUserInitials(name: string): string {
  if (!name) return 'U';
  
  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Calculates individual shares for expense splitting
 */
export function calculateExpenseShares(amount: number, participants: number): number {
  return parseFloat((amount / participants).toFixed(2));
}

/**
 * Generates a random color class for categorization
 */
export function getRandomColorClass(): string {
  const colors = ['blue', 'green', 'purple', 'amber', 'pink', 'indigo', 'cyan'];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Formats currency amounts
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}
