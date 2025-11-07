// utils/splitExpenseNotificationHandler.js - Handle notifications for split expenses

import { sendExpenseNotification } from '../api/notificationApi';

/**
 * Send notifications to all participants of a split expense
 * @param {Object} splitExpense - The created split expense
 * @param {Array} participants - Array of participants with their details
 * @param {String} creatorName - Name of the person who created the expense
 */
export const notifyParticipants = async (splitExpense, participants, creatorName) => {
  try {
    const notifications = [];
    
    for (const participant of participants) {
      // Skip the creator
      if (participant.userId === splitExpense.createdBy) {
        continue;
      }

      // Skip if participant already paid
      if (participant.paid) {
        continue;
      }

      const notificationData = {
        expenseId: splitExpense._id,
        friendIds: [participant.userId],
        type: 'expense_split',
        data: {
          splitExpenseId: splitExpense._id,
          description: splitExpense.description,
          totalAmount: splitExpense.totalAmount,
          yourShare: participant.amount,
          creatorName: creatorName,
          category: splitExpense.category,
          date: splitExpense.date
        }
      };

      const result = await sendExpenseNotification(notificationData);
      
      if (result.success) {
        notifications.push({
          userId: participant.userId,
          success: true
        });
        console.log(`✅ Notification sent to user ${participant.userId}`);
      } else {
        notifications.push({
          userId: participant.userId,
          success: false,
          error: result.message
        });
        console.warn(`⚠️ Failed to notify user ${participant.userId}:`, result.message);
      }
    }

    return {
      success: true,
      notificationsSent: notifications.filter(n => n.success).length,
      totalParticipants: participants.length - 1, // Exclude creator
      details: notifications
    };

  } catch (error) {
    console.error('❌ Error sending notifications:', error);
    return {
      success: false,
      message: error.message,
      notificationsSent: 0
    };
  }
};

/**
 * Send payment reminder notification
 * @param {String} debtId - The debt ID
 * @param {String} debtorName - Name of the person who owes money
 * @param {Number} amount - Amount owed
 * @param {String} description - Debt description
 */
export const sendPaymentReminder = async (debtId, debtorId, debtorName, amount, description) => {
  try {
    const notificationData = {
      expenseId: debtId,
      friendIds: [debtorId],
      type: 'payment_reminder',
      data: {
        debtId,
        amount,
        description,
        debtorName,
        reminderDate: new Date().toISOString()
      }
    };

    const result = await sendExpenseNotification(notificationData);
    
    if (result.success) {
      console.log(`✅ Payment reminder sent to ${debtorName}`);
      return { success: true };
    } else {
      console.warn(`⚠️ Failed to send payment reminder:`, result.message);
      return { success: false, message: result.message };
    }

  } catch (error) {
    console.error('❌ Error sending payment reminder:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Notify creditor when debt is paid
 * @param {String} debtId - The debt ID
 * @param {String} creditorId - ID of the person who was owed money
 * @param {String} debtorName - Name of the person who paid
 * @param {Number} amount - Amount paid
 * @param {String} description - Debt description
 */
export const notifyDebtPaid = async (debtId, creditorId, debtorName, amount, description) => {
  try {
    const notificationData = {
      expenseId: debtId,
      friendIds: [creditorId],
      type: 'debt_paid',
      data: {
        debtId,
        amount,
        description,
        debtorName,
        paidDate: new Date().toISOString()
      }
    };

    const result = await sendExpenseNotification(notificationData);
    
    if (result.success) {
      console.log(`✅ Payment notification sent to creditor`);
      return { success: true };
    } else {
      console.warn(`⚠️ Failed to send payment notification:`, result.message);
      return { success: false, message: result.message };
    }

  } catch (error) {
    console.error('❌ Error sending payment notification:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Create a formatted notification message for split expenses
 */
export const formatSplitExpenseMessage = (splitExpense, userShare) => {
  const totalAmount = splitExpense.totalAmount.toFixed(2);
  const share = userShare.toFixed(2);
  const creator = splitExpense.createdBy?.name || 'Someone';
  
  return {
    title: 'New Split Expense',
    message: `${creator} added you to "${splitExpense.description}". Your share: $${share} of $${totalAmount}`,
    priority: 'medium'
  };
};

/**
 * Create a formatted notification message for payment reminders
 */
export const formatPaymentReminderMessage = (debt, creditorName) => {
  const amount = debt.amount.toFixed(2);
  
  return {
    title: 'Payment Reminder',
    message: `${creditorName} is reminding you about "${debt.description}" - $${amount}`,
    priority: 'high'
  };
};

/**
 * Create a formatted notification message for debt paid
 */
export const formatDebtPaidMessage = (debt, debtorName) => {
  const amount = debt.amount.toFixed(2);
  
  return {
    title: 'Payment Received',
    message: `${debtorName} paid you $${amount} for "${debt.description}"`,
    priority: 'medium'
  };
};

export default {
  notifyParticipants,
  sendPaymentReminder,
  notifyDebtPaid,
  formatSplitExpenseMessage,
  formatPaymentReminderMessage,
  formatDebtPaidMessage
};