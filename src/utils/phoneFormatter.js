// frontend/src/utils/phoneFormatter.js
import { parsePhoneNumber, isValidPhoneNumber, AsYouType } from 'libphonenumber-js';

/**
 * Format phone number as user types
 */
export const formatPhoneAsYouType = (value, country = 'US') => {
  const formatter = new AsYouType(country);
  return formatter.input(value);
};

/**
 * Format phone number to E.164 format for API
 */
export const formatPhoneForAPI = (phone, country = 'US') => {
  try {
    if (!phone) return '';
    
    const phoneNumber = parsePhoneNumber(phone, country);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.format('E.164'); // +1234567890
    }
    return phone;
  } catch (error) {
    return phone;
  }
};

/**
 * Validate phone number
 */
export const validatePhone = (phone) => {
  try {
    if (!phone) return false;
    return isValidPhoneNumber(phone);
  } catch (error) {
    return false;
  }
};

/**
 * Format phone number for display
 */
export const formatPhoneForDisplay = (phone, country = 'US') => {
  try {
    const phoneNumber = parsePhoneNumber(phone, country);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.formatInternational(); // +1 234 567 8900
    }
    return phone;
  } catch (error) {
    return phone;
  }
};

/**
 * Get phone number country code
 */
export const getPhoneCountryCode = (phone) => {
  try {
    const phoneNumber = parsePhoneNumber(phone);
    return phoneNumber ? phoneNumber.country : null;
  } catch (error) {
    return null;
  }
};

export default {
  formatPhoneAsYouType,
  formatPhoneForAPI,
  validatePhone,
  formatPhoneForDisplay,
  getPhoneCountryCode
};