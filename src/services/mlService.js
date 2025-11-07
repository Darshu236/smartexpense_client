// services/mlService.js
import axios from 'axios';

class MLService {
  constructor() {
    this.ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    this.client = axios.create({
      baseURL: this.ML_SERVICE_URL,
      timeout: 30000, // 30 seconds timeout
    });
  }

  async trainCategoryModel(transactions) {
    try {
      console.log('Training category model with', transactions.length, 'transactions');
      const response = await this.client.post('/train_category_model', {
        transactions: transactions.map(t => ({
          title: t.title,
          category: t.category,
          amount: t.amount,
          date: t.date
        }))
      });
      return response.data;
    } catch (error) {
      console.error('Error training category model:', error.message);
      return { success: false, error: error.message };
    }
  }

  async predictCategory(title) {
    try {
      const response = await this.client.post('/predict_category', { title });
      return response.data;
    } catch (error) {
      console.error('Error predicting category:', error.message);
      return null;
    }
  }

  async detectAnomalies(transactions) {
    try {
      const response = await this.client.post('/detect_anomalies', { transactions });
      return response.data;
    } catch (error) {
      console.error('Error detecting anomalies:', error.message);
      return { anomalies: [], count: 0 };
    }
  }

  async analyzeSpendingHabits(transactions) {
    try {
      const response = await this.client.post('/analyze_spending_habits', { transactions });
      return response.data;
    } catch (error) {
      console.error('Error analyzing spending habits:', error.message);
      return null;
    }
  }

  async forecastExpenses(transactions, daysAhead = 30) {
    try {
      const response = await this.client.post('/forecast_expenses', {
        transactions,
        days_ahead: daysAhead
      });
      return response.data;
    } catch (error) {
      console.error('Error forecasting expenses:', error.message);
      return null;
    }
  }

  async getRecommendations(transactions, budgetInfo = {}) {
    try {
      const response = await this.client.post('/get_recommendations', {
        transactions,
        budget_info: budgetInfo
      });
      return response.data;
    } catch (error) {
      console.error('Error getting recommendations:', error.message);
      return { recommendations: [], count: 0 };
    }
  }

  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

export default new MLService();