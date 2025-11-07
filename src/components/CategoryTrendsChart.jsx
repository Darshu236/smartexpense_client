// src/components/CategoryTrendsChart.jsx
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const CategoryTrendsChart = ({ trends }) => {
  const categories = Object.keys(trends);

  const datasets = categories.map((category, index) => {
    const data = trends[category];
    const sortedMonths = Object.keys(data).sort();

    return {
      label: category,
      data: sortedMonths.map((month) => data[month]),
      borderColor: `hsl(${(index * 77) % 360}, 70%, 50%)`,
      tension: 0.3,
      fill: false,
    };
  });

  const labels = Object.keys(
    Object.values(trends)[0] || {}
  ).sort(); // use months from the first category

  const chartData = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'var(--text-main)',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'var(--text-main)',
        },
      },
      y: {
        ticks: {
          color: 'var(--text-main)',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 8 }}>
      <h3 style={{ marginBottom: 12 }}>📊 Monthly Expense Trends</h3>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default CategoryTrendsChart;
