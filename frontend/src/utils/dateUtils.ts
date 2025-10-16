/**
 * Date utility functions for consistent date handling across the application
 */

/**
 * Gets the current system date in YYYY-MM-DD format
 * @returns Current date as a string in YYYY-MM-DD format
 */
export const getCurrentDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a date string for display
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string
 */
export const formatDateForDisplay = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

/**
 * Formats a date for input fields (YYYY-MM-DD)
 * @param date - Date object or date string
 * @returns Formatted date string for input fields
 */
export const formatDateForInput = (date: Date | string): string => {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().split('T')[0];
};

/**
 * Validates if a date string is in the correct format and is valid
 * @param dateString - Date string to validate
 * @returns True if valid, false otherwise
 */
export const isValidDate = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Gets the start of today (midnight)
 * @returns Date object for start of today
 */
export const getStartOfToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Gets the end of today (23:59:59.999)
 * @returns Date object for end of today
 */
export const getEndOfToday = (): Date => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
};

/**
 * Checks if a date is today
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns True if the date is today
 */
export const isToday = (dateString: string): boolean => {
  const currentDate = getCurrentDate();
  return dateString === currentDate;
};

/**
 * Adds days to a date
 * @param dateString - Date string in YYYY-MM-DD format
 * @param days - Number of days to add (can be negative)
 * @returns New date string in YYYY-MM-DD format
 */
export const addDays = (dateString: string, days: number): string => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return formatDateForInput(date);
};