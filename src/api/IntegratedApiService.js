// IntegratedApiService.js - Complete integration between debt management and split expenses
import enhancedDebtApiService from './EnhancedDebtApiService';
import splitExpenseApiService from './splitExpenseApiService';

class IntegratedApiService {
  constructor() {
    this.debtService = enhancedDebtApiService;
    this.splitExpenseService = splitExpenseApiService;
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  log(level, message, data = null) {
    if (!this.debugMode) return;
    
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[35m',    // Magenta
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      success: '\x1b[32m', // Green
      reset: '\x1b[0m'     // Reset
    };
    
    console.log(`${colors[level]}[${timestamp}] [IntegratedAPI] ${message}${colors.reset}`, data || '');
  }

  // MAIN INTEGRATION METHOD - Create split expense with automatic debt creation
  async createSplitExpenseWithDebts(expenseData) {
    try {
      this.log('info', 'Starting integrated split expense creation', {
        totalAmount: expenseData.totalAmount,
        participantCount: expenseData.splits?.length || 0,
        description: expenseData.description
      });

      // Step 1: Get current user info
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('Current user not found. Please ensure you are logged in.');
      }

      this.log('info', 'Current user identified', {
        userId: currentUser.userId || currentUser._id,
        name: currentUser.name,
        email: currentUser.email
      });

      // Step 2: Validate the expense data
      const validation = this.validateSplitExpenseData(expenseData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 3: Create the split expense record
      this.log('info', 'Creating split expense record...');
      const expenseResult = await this.splitExpenseService.createSplitExpense(expenseData);

      if (!expenseResult.success) {
        throw new Error(expenseResult.message || 'Failed to create split expense');
      }

      const createdExpense = expenseResult.expense || expenseResult;
      this.log('success', 'Split expense created successfully', {
        expenseId: createdExpense._id,
        description: createdExpense.description,
        totalAmount: createdExpense.totalAmount
      });

      // Step 4: Create individual debts for each participant
      const debtResults = await this.createDebtsFromSplitExpense(
        createdExpense, 
        expenseData, 
        currentUser
      );

      this.log('info', 'Debt creation completed', {
        successfulDebts: debtResults.successfulDebts.length,
        failedDebts: debtResults.failedDebts.length,
        totalParticipants: expenseData.splits?.length || 0
      });

      // Step 5: Return comprehensive result
      const result = {
        success: true,
        expense: createdExpense,
        debts: debtResults.successfulDebts,
        failedDebts: debtResults.failedDebts,
        summary: {
          expenseId: createdExpense._id,
          totalAmount: expenseData.totalAmount,
          participantCount: expenseData.splits?.length || 0,
          debtsCreated: debtResults.successfulDebts.length,
          debtsFailed: debtResults.failedDebts.length,
          hasErrors: debtResults.failedDebts.length > 0
        }
      };

      this.log('success', 'Split expense integration completed', result.summary);
      return result;

    } catch (error) {
      this.log('error', 'Split expense integration failed', error.message);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  // Create debts from split expense with comprehensive error handling
  async createDebtsFromSplitExpense(expense, expenseData, currentUser) {
    const successfulDebts = [];
    const failedDebts = [];

    this.log('info', 'Creating debts for split expense', {
      expenseId: expense._id,
      totalParticipants: expenseData.splits?.length || 0
    });

    if (!expenseData.splits || expenseData.splits.length === 0) {
      this.log('warn', 'No splits found in expense data');
      return { successfulDebts, failedDebts };
    }

    // Process each split participant
    for (const split of expenseData.splits) {
      try {
        // Validate split data
        if (!split.friendId && !split.friendEmail) {
          throw new Error(`Missing friend identifier for split: ${JSON.stringify(split)}`);
        }

        if (!split.amount || split.amount <= 0) {
          throw new Error(`Invalid amount for split: ${split.amount}`);
        }

        // Create comprehensive debt data
        const debtData = {
          friendEmail: split.friendEmail,
          friendId: split.friendId,
          amount: parseFloat(split.amount),
          description: `Split expense: ${expense.description}`,
          type: 'owe-me', // Current user paid, so others owe them
          status: 'pending',
          dueDate: expense.dueDate || null,
          metadata: {
            splitExpenseId: expense._id,
            originalExpenseDescription: expense.description,
            originalTotalAmount: expenseData.totalAmount,
            splitType: expenseData.splitType || 'equal',
            createdVia: 'split_expense_integration',
            participantCount: expenseData.splits.length + 1,
            splitTimestamp: new Date().toISOString(),
            payerUserId: currentUser.userId || currentUser._id,
            payerName: currentUser.name,
            payerEmail: currentUser.email,
            friendName: split.friendName
          }
        };

        this.log('info', 'Creating debt for participant', {
          participantId: split.friendId,
          participantName: split.friendName,
          participantEmail: split.friendEmail,
          amount: split.amount
        });

        // Create the debt using the enhanced debt service
        const debtResponse = await this.debtService.createManualDebt(debtData);

        if (debtResponse && debtResponse.success) {
          const createdDebt = debtResponse.debt;
          successfulDebts.push(createdDebt);
          
          this.log('success', 'Debt created successfully', {
            debtId: createdDebt._id,
            participantId: split.friendId,
            amount: createdDebt.amount
          });
        } else {
          throw new Error(debtResponse?.message || 'Debt creation returned unsuccessful');
        }

      } catch (debtError) {
        this.log('error', 'Failed to create debt for participant', {
          participantId: split.friendId,
          participantName: split.friendName,
          error: debtError.message
        });

        failedDebts.push({
          participantId: split.friendId,
          participantName: split.friendName || 'Unknown',
          participantEmail: split.friendEmail,
          amount: split.amount,
          error: debtError.message,
          timestamp: new Date().toISOString()
        });
      }

      // Small delay to prevent API overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      successfulDebts,
      failedDebts,
      summary: {
        totalAttempted: expenseData.splits.length,
        successful: successfulDebts.length,
        failed: failedDebts.length,
        successRate: expenseData.splits.length > 0 ? (successfulDebts.length / expenseData.splits.length * 100).toFixed(1) : 0
      }
    };
  }

  // Delete split expense and all related debts
  async deleteSplitExpenseAndRelatedDebts(expenseId) {
    try {
      this.log('info', 'Deleting split expense and related debts', { expenseId });

      // Step 1: Find related debts
      const relatedDebts = await this.findRelatedDebts(expenseId);
      this.log('info', `Found ${relatedDebts.length} related debts to delete`);

      // Step 2: Delete related debts
      const debtDeletionResults = await this.deleteRelatedDebts(relatedDebts);

      // Step 3: Delete the split expense
      const expenseResult = await this.splitExpenseService.deleteSplitExpense(expenseId);

      if (!expenseResult.success) {
        throw new Error(expenseResult.message || 'Failed to delete split expense');
      }

      this.log('success', 'Split expense and related debts deleted', {
        expenseId,
        debtsDeleted: debtDeletionResults.successful,
        debtsFailed: debtDeletionResults.failed
      });

      return {
        success: true,
        expenseDeleted: true,
        debtsDeleted: debtDeletionResults.successful,
        debtDeletionsFailed: debtDeletionResults.failed,
        summary: {
          expenseId,
          totalDebtsFound: relatedDebts.length,
          debtsSuccessfullyDeleted: debtDeletionResults.successful,
          debtsFailedToDelete: debtDeletionResults.failed
        }
      };

    } catch (error) {
      this.log('error', 'Failed to delete split expense and related debts', error.message);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  // Find debts related to a specific split expense
  async findRelatedDebts(expenseId) {
    try {
      const debtsOwedToMe = await this.debtService.fetchDebtsOwedToMe();
      
      if (!debtsOwedToMe.success) {
        this.log('warn', 'Could not fetch debts to find related ones', debtsOwedToMe.message);
        return [];
      }

      const relatedDebts = (debtsOwedToMe.debts || []).filter(debt => 
        debt.metadata?.splitExpenseId === expenseId
      );

      this.log('info', `Found ${relatedDebts.length} related debts for expense ${expenseId}`);
      return relatedDebts;

    } catch (error) {
      this.log('error', 'Error finding related debts', error.message);
      return [];
    }
  }

  // Delete multiple related debts
  async deleteRelatedDebts(debts) {
    let successful = 0;
    let failed = 0;

    for (const debt of debts) {
      try {
        const deleteResult = await this.debtService.deleteDebt(debt._id);
        if (deleteResult.success) {
          successful++;
          this.log('success', `Deleted related debt ${debt._id}`);
        } else {
          failed++;
          this.log('error', `Failed to delete related debt ${debt._id}`, deleteResult.message);
        }
      } catch (error) {
        failed++;
        this.log('error', `Error deleting related debt ${debt._id}`, error.message);
      }

      // Small delay between deletions
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { successful, failed };
  }

  // UTILITY AND HELPER METHODS
  getCurrentUser() {
    try {
      const sources = ['user', 'currentUser', 'auth'];
      for (const source of sources) {
        const stored = localStorage.getItem(source) || sessionStorage.getItem(source);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.userId || parsed._id || parsed.id)) {
            return parsed;
          }
        }
      }
      return null;
    } catch (error) {
      this.log('warn', 'Error parsing stored user data', error.message);
      return null;
    }
  }

  formatCurrency(amount) {
    const currency = localStorage.getItem('userCurrency') || 'USD';
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount) || 0);
  }

  // Check authentication status across all services
  checkIntegratedAuthStatus() {
    const debtAuthStatus = this.debtService.checkAuthStatus();
    const splitExpenseAuthStatus = this.splitExpenseService.checkAuthStatus();
    
    return {
      isAuthenticated: debtAuthStatus.isAuthenticated && splitExpenseAuthStatus.isAuthenticated,
      debtService: debtAuthStatus,
      splitExpenseService: splitExpenseAuthStatus,
      user: debtAuthStatus.user,
      hasConsistentAuth: debtAuthStatus.hasToken === splitExpenseAuthStatus.hasToken
    };
  }

  // Refresh all integrated data
  async refreshAllData() {
    try {
      this.log('info', 'Refreshing all integrated data...');
      
      const refreshPromises = [
        this.debtService.fetchDebtsOwedToMe(),
        this.debtService.fetchDebtsOwedByMe(),
        this.splitExpenseService.fetchSplitExpenses()
      ];
      
      const results = await Promise.allSettled(refreshPromises);
      
      const refreshSummary = {
        debtsOwedToMe: results[0].status === 'fulfilled' ? results[0].value : null,
        debtsOwedByMe: results[1].status === 'fulfilled' ? results[1].value : null,
        splitExpenses: results[2].status === 'fulfilled' ? results[2].value : null,
        errors: results.filter(r => r.status === 'rejected').map(r => r.reason)
      };
      
      this.log('success', 'Data refresh completed', {
        debtsOwedCount: refreshSummary.debtsOwedToMe?.debts?.length || 0,
        debtsOwedByCount: refreshSummary.debtsOwedByMe?.debts?.length || 0,
        splitExpensesCount: refreshSummary.splitExpenses?.expenses?.length || 0,
        errorCount: refreshSummary.errors.length
      });
      
      return {
        success: true,
        data: refreshSummary,
        hasErrors: refreshSummary.errors.length > 0
      };
      
    } catch (error) {
      this.log('error', 'Data refresh failed', error.message);
      return {
        success: false,
        message: error.message,
        hasErrors: true
      };
    }
  }

  // Get comprehensive debt summary including split expense connections
  async getComprehensiveDebtSummary() {
    try {
      this.log('info', 'Getting comprehensive debt summary...');
      
      const [owedToMeResult, owedByMeResult, splitExpensesResult] = await Promise.allSettled([
        this.debtService.fetchDebtsOwedToMe(),
        this.debtService.fetchDebtsOwedByMe(),
        this.splitExpenseService.fetchSplitExpenses()
      ]);
      
      const debtsOwedToMe = owedToMeResult.status === 'fulfilled' ? 
        (owedToMeResult.value.debts || []) : [];
      const debtsOwedByMe = owedByMeResult.status === 'fulfilled' ? 
        (owedByMeResult.value.debts || []) : [];
      const splitExpenses = splitExpensesResult.status === 'fulfilled' ? 
        (splitExpensesResult.value.expenses || []) : [];

      // Categorize debts by origin
      const splitExpenseDebts = debtsOwedToMe.filter(debt => 
        debt.metadata && debt.metadata.splitExpenseId
      );
      const regularDebts = debtsOwedToMe.filter(debt => 
        !debt.metadata || !debt.metadata.splitExpenseId
      );

      // Calculate comprehensive totals
      const totalOwedToMe = debtsOwedToMe.reduce((sum, debt) => sum + (debt.amount || 0), 0);
      const totalOwedByMe = debtsOwedByMe.reduce((sum, debt) => sum + (debt.amount || 0), 0);
      const totalFromSplitExpenses = splitExpenseDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
      const netBalance = totalOwedToMe - totalOwedByMe;
      const totalSplitExpenseAmount = splitExpenses.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);

      const summary = {
        debtsOwedToMe: {
          total: debtsOwedToMe,
          count: debtsOwedToMe.length,
          amount: totalOwedToMe,
          fromSplitExpenses: splitExpenseDebts.length,
          regular: regularDebts.length,
          splitExpenseAmount: totalFromSplitExpenses,
          regularAmount: totalOwedToMe - totalFromSplitExpenses
        },
        debtsOwedByMe: {
          total: debtsOwedByMe,
          count: debtsOwedByMe.length,
          amount: totalOwedByMe
        },
        splitExpenses: {
          total: splitExpenses,
          count: splitExpenses.length,
          totalAmount: totalSplitExpenseAmount,
          averageAmount: splitExpenses.length > 0 ? totalSplitExpenseAmount / splitExpenses.length : 0
        },
        summary: {
          netBalance: netBalance,
          totalDebts: debtsOwedToMe.length + debtsOwedByMe.length,
          splitExpenseDebtsAmount: totalFromSplitExpenses,
          splitExpenseContribution: totalOwedToMe > 0 ? 
            (totalFromSplitExpenses / totalOwedToMe * 100).toFixed(1) : 0,
          integrationHealth: {
            splitExpensesWithDebts: splitExpenses.filter(exp => 
              debtsOwedToMe.some(debt => debt.metadata?.splitExpenseId === exp._id)
            ).length,
            orphanedDebts: splitExpenseDebts.filter(debt => 
              !splitExpenses.some(exp => exp._id === debt.metadata.splitExpenseId)
            ).length
          }
        }
      };

      this.log('success', 'Comprehensive debt summary generated', {
        totalDebts: summary.summary.totalDebts,
        netBalance: summary.summary.netBalance,
        splitExpenseContribution: summary.summary.splitExpenseContribution + '%',
        integrationHealth: summary.summary.integrationHealth
      });

      return {
        success: true,
        summary: summary
      };

    } catch (error) {
      this.log('error', 'Failed to get comprehensive debt summary', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Validate split expense data before creation
  validateSplitExpenseData(expenseData) {
    const errors = [];
    
    if (!expenseData.description || expenseData.description.trim().length === 0) {
      errors.push('Description is required');
    }
    
    if (!expenseData.totalAmount || isNaN(parseFloat(expenseData.totalAmount)) || parseFloat(expenseData.totalAmount) <= 0) {
      errors.push('Valid total amount is required');
    }
    
    if (!expenseData.splits || !Array.isArray(expenseData.splits) || expenseData.splits.length === 0) {
      errors.push('At least one participant is required');
    }
    
    // Validate each split
    expenseData.splits?.forEach((split, index) => {
      if (!split.friendId && !split.friendEmail) {
        errors.push(`Participant ${index + 1} must have either a friend ID or email`);
      }
      
      if (!split.amount || isNaN(parseFloat(split.amount)) || parseFloat(split.amount) <= 0) {
        errors.push(`Participant ${index + 1} must have a valid amount`);
      }
      
      if (split.friendEmail && !this.isValidEmail(split.friendEmail)) {
        errors.push(`Participant ${index + 1} must have a valid email address`);
      }
    });
    
    // Validate total amounts match (allowing for small rounding differences)
    if (expenseData.splits && expenseData.totalAmount) {
      const totalSplitAmount = expenseData.splits.reduce((sum, split) => sum + parseFloat(split.amount || 0), 0);
      const difference = Math.abs(parseFloat(expenseData.totalAmount) - totalSplitAmount);
      
      if (difference > 0.01) {
        errors.push(`Total amount (${expenseData.totalAmount}) must equal sum of splits (${totalSplitAmount.toFixed(2)})`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Debug integration status and connectivity
  async debugIntegration() {
    console.group('🔍 Integration Debug Information');
    
    try {
      // Check authentication status
      const authStatus = this.checkIntegratedAuthStatus();
      console.log('Authentication Status:', authStatus);
      
      // Test service connectivity
      console.log('Testing service connectivity...');
      const debtServiceTest = await this.debtService.testConnection();
      const splitServiceTest = await this.splitExpenseService.testConnection();
      
      console.log('Debt Service Test:', debtServiceTest);
      console.log('Split Expense Service Test:', splitServiceTest);
      
      // Get comprehensive summary
      const summary = await this.getComprehensiveDebtSummary();
      console.log('Comprehensive Summary:', summary);
      
      // Show integration health
      const integrationHealth = {
        bothServicesAuthenticated: authStatus.isAuthenticated,
        servicesConsistent: authStatus.hasConsistentAuth,
        debtServiceAvailable: debtServiceTest.success,
        splitServiceAvailable: splitServiceTest.success,
        currentUser: this.getCurrentUser(),
        recommendations: []
      };

      if (!integrationHealth.bothServicesAuthenticated) {
        integrationHealth.recommendations.push('Please log in to enable full integration');
      }
      if (!integrationHealth.servicesConsistent) {
        integrationHealth.recommendations.push('Authentication tokens may be inconsistent between services');
      }
      if (!integrationHealth.debtServiceAvailable) {
        integrationHealth.recommendations.push('Debt service appears to be unavailable');
      }
      if (!integrationHealth.splitServiceAvailable) {
        integrationHealth.recommendations.push('Split expense service appears to be unavailable');
      }

      console.log('Integration Health:', integrationHealth);
      
    } catch (error) {
      console.error('Debug integration failed:', error);
    }
    
    console.groupEnd();
  }
}

// Export singleton instance
const integratedApiService = new IntegratedApiService();
export default integratedApiService;