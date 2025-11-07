// Save as: src/utils/receiptParsingUtils.js

/**
 * Client-side receipt parsing utilities with Tesseract.js integration
 */

import Tesseract from 'tesseract.js';

// Advanced text parsing for receipts (same as server version)
const parseReceiptTextAdvanced = (text) => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let totalAmount = null;
  let subtotal = null;
  let tax = null;
  let tip = null;
  let description = '';
  let date = null;
  let items = [];
  let merchantName = '';

  // Enhanced patterns for different receipt formats
  const totalPatterns = [
    /(?:total|amount due|balance|grand total)[:\s]*\$?(\d+\.?\d*)/i,
    /^total\s*(\d+\.\d{2})$/i,
    /\btotal\s*\$(\d+\.\d{2})/i,
    /(?:^|\s)total(?:\s|:)*\$?(\d+\.\d{2})/i
  ];

  const subtotalPatterns = [
    /(?:subtotal|sub-total|sub total)[:\s]*\$?(\d+\.?\d*)/i
  ];

  const taxPatterns = [
    /(?:tax|hst|gst|pst|sales tax|vat)[:\s]*\$?(\d+\.?\d*)/i
  ];

  const tipPatterns = [
    /(?:tip|gratuity)[:\s]*\$?(\d+\.?\d*)/i
  ];

  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /(\d{4}-\d{1,2}-\d{1,2})/,
    /(\d{1,2}\.\d{1,2}\.\d{2,4})/
  ];

  // Extract merchant name (usually in first few lines)
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (line.length > 2 && line.length < 50 && 
        /^[A-Za-z\s&'.-]+$/.test(line) && 
        !datePatterns.some(p => p.test(line)) &&
        !line.toLowerCase().includes('receipt')) {
      merchantName = line;
      description = `Expense at ${line}`;
      break;
    }
  }

  // Extract amounts and date
  for (const line of lines) {
    // Total amount
    if (!totalAmount) {
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1]);
          if (amount > 0 && amount < 10000) {
            totalAmount = amount;
            break;
          }
        }
      }
    }

    // Subtotal
    if (!subtotal) {
      for (const pattern of subtotalPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1]);
          if (amount > 0 && amount <= (totalAmount || 10000)) {
            subtotal = amount;
            break;
          }
        }
      }
    }

    // Tax
    if (!tax) {
      for (const pattern of taxPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1]);
          if (amount >= 0 && amount <= (totalAmount || 1000)) {
            tax = amount;
            break;
          }
        }
      }
    }

    // Tip
    if (!tip) {
      for (const pattern of tipPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1]);
          if (amount >= 0 && amount <= (totalAmount || 1000)) {
            tip = amount;
            break;
          }
        }
      }
    }

    // Date
    if (!date) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          date = match[1];
          break;
        }
      }
    }

    // Items (more sophisticated parsing)
    const itemMatch = line.match(/^(.+?)\s+\$?(\d+\.?\d*)$/);
    if (itemMatch && !totalPatterns.some(p => p.test(line))) {
      const itemName = itemMatch[1].trim();
      const itemPrice = parseFloat(itemMatch[2]);
      
      if (itemPrice > 0 && 
          itemPrice < (totalAmount || 1000) && 
          itemName.length > 1 &&
          !['tax', 'tip', 'subtotal', 'total', 'change', 'cash'].some(word => 
            itemName.toLowerCase().includes(word))) {
        items.push({
          name: itemName,
          price: itemPrice
        });
      }
    }
  }

  // Validation and cleanup
  if (subtotal && tax && !totalAmount) {
    totalAmount = subtotal + tax + (tip || 0);
  }

  return {
    description: description || merchantName || 'Receipt expense',
    totalAmount: totalAmount ? parseFloat(totalAmount.toFixed(2)) : null,
    subtotal: subtotal ? parseFloat(subtotal.toFixed(2)) : null,
    tax: tax ? parseFloat(tax.toFixed(2)) : null,
    tip: tip ? parseFloat(tip.toFixed(2)) : null,
    items: items,
    merchantName: merchantName || null,
    date: date || null,
    itemCount: items.length
  };
};

// Client-side OCR with Tesseract.js
const scanReceiptWithTesseract = async (file) => {
  try {
    console.log('Starting Tesseract OCR...');
    
    // Convert file to image URL for Tesseract
    const imageUrl = URL.createObjectURL(file);
    
    // Use Tesseract to extract text
    const { data: { text } } = await Tesseract.recognize(
      imageUrl,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    
    // Clean up the object URL
    URL.revokeObjectURL(imageUrl);
    
    console.log('Extracted text:', text);
    
    // Parse the extracted text
    const parsedData = parseReceiptTextAdvanced(text);
    console.log('Parsed receipt data:', parsedData);
    
    return {
      success: true,
      data: parsedData,
      rawText: text
    };
    
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    return {
      success: false,
      message: 'Failed to scan receipt with OCR: ' + error.message
    };
  }
};

// Validate extracted receipt data
const validateReceiptData = (data) => {
  const errors = [];
  
  if (!data.totalAmount || data.totalAmount <= 0) {
    errors.push('Could not extract total amount from receipt');
  }
  
  if (data.totalAmount > 10000) {
    errors.push('Total amount seems unusually high, please verify');
  }
  
  if (data.subtotal && data.tax) {
    const calculatedTotal = data.subtotal + data.tax + (data.tip || 0);
    const difference = Math.abs(calculatedTotal - data.totalAmount);
    if (difference > 0.02) { // Allow for rounding differences
      errors.push('Subtotal, tax, and total amounts do not add up correctly');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: []
  };
};

// Format currency values
const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return null;
  }
  return parseFloat(amount.toFixed(2));
};

// Clean and normalize text
const normalizeText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/[^\w\s$.,:-]/g, '') // Remove special characters except common ones
    .trim();
};

export {
  scanReceiptWithTesseract,
  parseReceiptTextAdvanced,
  validateReceiptData,
  formatCurrency,
  normalizeText
};