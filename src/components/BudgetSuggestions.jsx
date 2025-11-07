import React from 'react';

const BudgetSuggestions = ({ suggestions }) => {
  if (!suggestions || suggestions.length === 0) {
    return <p>No budget suggestions available.</p>;
  }

  return (
    <div>
      <h3>Budget Suggestions</h3>
      <ul>
        {suggestions.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default BudgetSuggestions;
