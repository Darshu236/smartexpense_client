import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarView.css';
import { fetchTransactions } from '../api/transactionApi';
import { fetchSplitExpenses } from '../api/splitExpenseApi';

const localizer = momentLocalizer(moment);

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch data from database
  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching calendar data...');
      
      // Fetch transactions
      let transactions = [];
      try {
        const transactionData = await fetchTransactions();
        console.log('📊 Raw transaction response:', transactionData);
        
        // Handle different response structures
        if (Array.isArray(transactionData)) {
          transactions = transactionData;
        } else if (transactionData?.success && transactionData?.transactions) {
          transactions = transactionData.transactions;
        } else if (transactionData?.transactions) {
          transactions = transactionData.transactions;
        } else if (transactionData?.data) {
          transactions = transactionData.data;
        }
        
        console.log('✅ Processed transactions:', transactions);
      } catch (err) {
        console.error('❌ Error fetching transactions:', err);
      }

      // Fetch split expenses
      let splitExpenses = [];
      try {
        const splitData = await fetchSplitExpenses();
        console.log('📊 Raw split expense response:', splitData);
        
        // Handle different response structures
        if (Array.isArray(splitData)) {
          splitExpenses = splitData;
        } else if (splitData?.success && splitData?.expenses) {
          splitExpenses = splitData.expenses;
        } else if (splitData?.expenses) {
          splitExpenses = splitData.expenses;
        } else if (splitData?.data) {
          splitExpenses = splitData.data;
        }
        
        console.log('✅ Processed split expenses:', splitExpenses);
      } catch (err) {
        console.warn('⚠️ Error fetching split expenses:', err);
        // Continue without split expenses if API fails
      }

      // Process events
      const transactionEvents = processTransactions(transactions);
      const splitEvents = processSplitExpenses(splitExpenses);
      
      const allEvents = [...transactionEvents, ...splitEvents];
      console.log('📅 Total calendar events:', allEvents.length, allEvents);
      
      setEvents(allEvents);
      
      if (allEvents.length === 0 && transactions.length === 0 && splitExpenses.length === 0) {
        setError('No transactions found. Add some transactions to see them on the calendar.');
      }
      
    } catch (err) {
      console.error('💥 Error in fetchCalendarData:', err);
      setError('Failed to load calendar data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Process transactions into calendar events
  const processTransactions = useCallback((transactions) => {
    if (!Array.isArray(transactions)) {
      console.warn('⚠️ Transactions is not an array:', transactions);
      return [];
    }
    
    console.log(`🔄 Processing ${transactions.length} transactions...`);
    
    return transactions.map((transaction) => {
      // Try multiple date fields
      const dateValue = transaction.date || transaction.createdAt || transaction.updatedAt;
      
      if (!dateValue) {
        console.warn('⚠️ No date found for transaction:', transaction);
        return null;
      }
      
      const eventDate = new Date(dateValue);
      
      // Validate date
      if (isNaN(eventDate.getTime())) {
        console.warn('⚠️ Invalid date for transaction:', transaction, dateValue);
        return null;
      }
      
      console.log('✅ Created event for transaction:', {
        title: transaction.description || transaction.title,
        date: eventDate,
        type: transaction.type
      });
      
      return {
        id: `transaction-${transaction._id || transaction.id || Math.random()}`,
        title: transaction.description || transaction.title || 'Transaction',
        start: eventDate,
        end: eventDate,
        allDay: true,
        type: 'transaction',
        subType: transaction.type || 'expense',
        amount: transaction.amount || 0,
        category: transaction.category,
        paymentMode: transaction.paymentMode,
        resource: transaction
      };
    }).filter(Boolean);
  }, []);

  // Process split expenses into calendar events
  const processSplitExpenses = useCallback((splitExpenses) => {
    if (!Array.isArray(splitExpenses)) {
      console.warn('⚠️ Split expenses is not an array:', splitExpenses);
      return [];
    }
    
    console.log(`🔄 Processing ${splitExpenses.length} split expenses...`);
    
    return splitExpenses.map((split) => {
      const dateValue = split.date || split.createdAt || split.updatedAt;
      
      if (!dateValue) {
        console.warn('⚠️ No date found for split expense:', split);
        return null;
      }
      
      const eventDate = new Date(dateValue);
      
      if (isNaN(eventDate.getTime())) {
        console.warn('⚠️ Invalid date for split expense:', split, dateValue);
        return null;
      }
      
      console.log('✅ Created event for split expense:', {
        title: split.description,
        date: eventDate
      });
      
      return {
        id: `split-${split._id || split.id || Math.random()}`,
        title: split.description || 'Split Expense',
        start: eventDate,
        end: eventDate,
        allDay: true,
        type: 'split',
        amount: split.totalAmount || split.amount || 0,
        participants: split.participants || [],
        resource: split
      };
    }).filter(Boolean);
  }, []);

  // Custom event style getter
  const eventStyleGetter = useCallback((event) => {
    let backgroundColor = '#6366f1';
    let textColor = '#ffffff';
    
    if (event.type === 'transaction') {
      backgroundColor = event.subType === 'income' ? '#10b981' : '#ef4444';
    } else if (event.type === 'split') {
      backgroundColor = '#f59e0b';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: textColor,
        border: 'none',
        fontSize: '12px',
        padding: '2px 4px'
      }
    };
  }, []);

  // Handle event selection
  const handleSelectEvent = useCallback((event) => {
    console.log('🖱️ Event selected:', event);
    setSelectedEvent(event);
    setShowModal(true);
  }, []);

  // Handle slot selection
  const handleSelectSlot = useCallback(({ start, end }) => {
    console.log('📍 Slot selected:', { start, end });
  }, []);

  // Calendar messages
  const messages = useMemo(() => ({
    allDay: 'All Day',
    previous: 'Previous',
    next: 'Next',
    today: 'Today',
    month: 'Month',
    week: 'Week',
    day: 'Day',
    agenda: 'Agenda',
    date: 'Date',
    time: 'Time',
    event: 'Event',
    noEventsInRange: 'No transactions found in this date range.',
    showMore: total => `+${total} more`
  }), []);

  // Component formats
  const formats = useMemo(() => ({
    monthHeaderFormat: 'MMMM YYYY',
    dayHeaderFormat: 'dddd, MMMM Do',
    dayRangeHeaderFormat: ({ start, end }) => 
      `${moment(start).format('MMM Do')} - ${moment(end).format('MMM Do, YYYY')}`,
    agendaHeaderFormat: ({ start, end }) =>
      `${moment(start).format('MMM Do')} - ${moment(end).format('MMM Do, YYYY')}`,
    eventTimeRangeFormat: () => '',
    agendaTimeFormat: 'h:mm A',
    selectRangeFormat: ({ start, end }) =>
      `${moment(start).format('MMM Do')} - ${moment(end).format('MMM Do')}`
  }), []);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Calculate stats
  const stats = useMemo(() => {
    const incomeEvents = events.filter(e => e.subType === 'income');
    const expenseEvents = events.filter(e => e.subType === 'expense');
    const splitEvents = events.filter(e => e.type === 'split');

    return {
      income: incomeEvents.length,
      expenses: expenseEvents.length,
      splits: splitEvents.length,
      totalIncome: incomeEvents.reduce((sum, e) => sum + (e.amount || 0), 0),
      totalExpenses: expenseEvents.reduce((sum, e) => sum + (e.amount || 0), 0),
      totalSplits: splitEvents.reduce((sum, e) => sum + (e.amount || 0), 0)
    };
  }, [events]);

  // Loading state
  if (loading) {
    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <h1 className="calendar-title">Financial Calendar</h1>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading calendar data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      {/* Header */}
      <div className="calendar-header">
        <h1 className="calendar-title">Financial Calendar</h1>
        <div className="calendar-stats">
          <span className="stat-item income">
            Income: {stats.income} (₹{stats.totalIncome.toLocaleString()})
          </span>
          <span className="stat-item expense">
            Expenses: {stats.expenses} (₹{stats.totalExpenses.toLocaleString()})
          </span>
          <span className="stat-item split">
            Split: {stats.splits} (₹{stats.totalSplits.toLocaleString()})
          </span>
        </div>
        <button 
          className="refresh-button"
          onClick={fetchCalendarData}
          title="Refresh calendar"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color income"></span>
          <span>Income</span>
        </div>
        <div className="legend-item">
          <span className="legend-color expense"></span>
          <span>Expenses</span>
        </div>
        <div className="legend-item">
          <span className="legend-color split"></span>
          <span>Split Expenses</span>
        </div>
      </div>

      {/* Debug info - remove in production */}
      {events.length === 0 && !loading && (
        <div className="debug-info">
          <p>ℹ️ No events to display. Check browser console (F12) for details.</p>
        </div>
      )}

      {/* Calendar */}
      <div className="calendar-wrapper">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={['month', 'week', 'day', 'agenda']}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          messages={messages}
          formats={formats}
          popup
          popupOffset={30}
          dayLayoutAlgorithm="no-overlap"
          className="custom-calendar"
        />
      </div>

      {/* Event Details Modal */}
      {showModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedEvent.type === 'split' ? 'Split Expense Details' : 'Transaction Details'}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <label>Title:</label>
                <span>{selectedEvent.title}</span>
              </div>
              <div className="detail-row">
                <label>Amount:</label>
                <span className={`amount ${selectedEvent.subType || 'neutral'}`}>
                  ₹{selectedEvent.amount?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="detail-row">
                <label>Date:</label>
                <span>{moment(selectedEvent.start).format('MMMM Do, YYYY')}</span>
              </div>
              {selectedEvent.category && (
                <div className="detail-row">
                  <label>Category:</label>
                  <span>{selectedEvent.category}</span>
                </div>
              )}
              {selectedEvent.paymentMode && (
                <div className="detail-row">
                  <label>Payment Mode:</label>
                  <span>{selectedEvent.paymentMode}</span>
                </div>
              )}
              {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                <div className="detail-row">
                  <label>Participants:</label>
                  <span>{selectedEvent.participants.length} people</span>
                </div>
              )}
              {selectedEvent.type && (
                <div className="detail-row">
                  <label>Type:</label>
                  <span className="type-badge">{selectedEvent.type}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;