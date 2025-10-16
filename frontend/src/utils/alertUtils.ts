// Alert utility to replace browser's alert(), confirm(), and prompt()
// Import this in components that need to show alerts without the full notification system

export const showAlert = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  // For now, fall back to browser alert
  // TODO: Replace with a global notification system or toast
  alert(message);
};

export const showConfirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const result = confirm(message);
    resolve(result);
  });
};

export const showPrompt = (message: string, defaultValue?: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const result = prompt(message, defaultValue);
    resolve(result);
  });
};

// Enhanced versions that return promises for better async handling
export const asyncAlert = (message: string): Promise<void> => {
  return new Promise((resolve) => {
    alert(message);
    resolve();
  });
};

// Usage examples:
// import { showAlert, showConfirm, showPrompt } from '../utils/alertUtils';
// 
// showAlert('Success message!', 'success');
// 
// const confirmed = await showConfirm('Are you sure?');
// if (confirmed) { ... }
//
// const input = await showPrompt('Enter name:');
// if (input) { ... }