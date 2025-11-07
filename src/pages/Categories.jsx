// src/pages/Categories.jsx - COMPLETE CORRECTED VERSION
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CategoryAPI from '../api/categoryApi';
import { Plus, Tag, Trash2, Pencil, Save, X, Brain, Target, RefreshCw } from 'lucide-react';
import './Categories.css';
import TokenManager from '../utils/tokenManager';

const defaultForm = {
  name: '',
  type: 'need',
  icon: 'Tag',
  color: '#3b82f6',
  keywords: ''
};

const Categories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const checkAuthentication = async () => {
    console.log('🔍 Starting authentication check...');
    
    const token = TokenManager.getToken();
    const user = TokenManager.getUser();
    
    console.log('Token status:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      hasUser: !!user,
      userId: user?._id || user?.userId || 'none'
    });
    
    if (!token) {
      console.log('❌ No authentication token found');
      setAuthError(true);
      setIsAuthenticated(false);
      setError('Please log in to access categories');
      setInitializing(false);
      return false;
    }

    try {
      console.log('🔐 Validating token with API call...');
      await CategoryAPI.list();
      console.log('✅ Token validation successful');
      setIsAuthenticated(true);
      setAuthError(false);
      setError('');
      setInitializing(false);
      return true;
    } catch (apiError) {
      console.error('❌ Token validation failed:', apiError.message);
      
      if (apiError.message.includes('401') || 
          apiError.message.includes('Unauthorized') ||
          apiError.message.includes('Authentication') ||
          apiError.message.includes('token')) {
        console.log('🔐 Authentication error detected - clearing tokens');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        setAuthError(true);
        setIsAuthenticated(false);
        setError('Session expired. Please log in again.');
      } else {
        console.log('⚠️ Non-auth error - keeping auth state');
        setIsAuthenticated(true);
        setAuthError(false);
        setError(`Connection error: ${apiError.message}`);
      }
      
      setInitializing(false);
      return false;
    }
  };

  useEffect(() => {
    checkAuthentication();
  }, []);

  const load = async (showLoading = true) => {
    if (!isAuthenticated) {
      console.log('❌ Cannot load data - not authenticated');
      return;
    }

    if (showLoading) setLoading(true);
    setError('');
    
    try {
      console.log('📡 Loading categories...');
      const cats = await CategoryAPI.list();
      
      console.log('✅ Data loaded successfully:', {
        categories: cats.length
      });
      
      setCategories(cats);
      setAuthError(false);
    } catch (e) {
      console.error('❌ Error loading data:', e);
      
      if (e.message.includes('401') || 
          e.message.includes('Unauthorized') ||
          e.message.includes('token') ||
          e.response?.status === 401) {
        console.log('🔐 Authentication error detected during load');
        setAuthError(true);
        setIsAuthenticated(false);
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      } else {
        setError(`Failed to load categories: ${e.message}`);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !initializing) {
      load();
    }
  }, [isAuthenticated, initializing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('Please log in to manage categories');
      return;
    }

    setSaving(true);
    setError('');
    
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        icon: form.icon || 'Tag',
        color: form.color,
        keywords: String(form.keywords || '').split(',').map(s => s.trim()).filter(Boolean)
      };
      
      console.log('💾 Saving category:', editingId ? 'UPDATE' : 'CREATE', payload);
      
      if (editingId) {
        await CategoryAPI.update(editingId, payload);
        console.log('✅ Category updated successfully');
      } else {
        await CategoryAPI.create(payload);
        console.log('✅ Category created successfully');
      }
      
      setForm(defaultForm);
      setEditingId(null);
      await load(false);
    } catch (e) {
      console.error('❌ Error saving category:', e);
      
      if (e.message.includes('401') || e.message.includes('token')) {
        setAuthError(true);
        setIsAuthenticated(false);
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      } else {
        setError(`Failed to save category: ${e.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat) => {
    console.log('✏️ Starting edit for category:', cat.name);
    setEditingId(cat._id);
    setForm({
      name: cat.name,
      type: cat.type,
      icon: cat.icon || 'Tag',
      color: cat.color || '#3b82f6',
      keywords: (cat.keywords || []).join(', ')
    });
  };

  const cancelEdit = () => {
    console.log('❌ Cancelling edit');
    setEditingId(null);
    setForm(defaultForm);
    setError('');
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this category? This action cannot be undone.')) return;
    
    try {
      console.log('🗑️ Removing category:', id);
      await CategoryAPI.remove(id);
      console.log('✅ Category removed successfully');
      await load(false);
    } catch (e) {
      console.error('❌ Error removing category:', e);
      
      if (e.message.includes('401') || e.message.includes('token')) {
        setAuthError(true);
        setIsAuthenticated(false);
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      } else {
        setError(`Failed to remove category: ${e.message}`);
      }
    }
  };

  const handleLogin = () => {
    console.log('🔐 Redirecting to login...');
    navigate('/login');
  };

  const handleRetry = async () => {
    console.log('🔄 Retrying authentication and data load...');
    setError('');
    setInitializing(true);
    
    const success = await checkAuthentication();
    if (success) {
      await load();
    }
  };

  if (initializing) {
    return (
      <div className="cat-container">
        <div className="loading-screen">
          <RefreshCw size={32} className="spin" />
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (authError && !isAuthenticated) {
    return (
      <div className="cat-container">
        <div className="auth-error">
          <h2>Authentication Required</h2>
          <p>{error || 'You need to be logged in to access this page.'}</p>
          <div className="auth-actions">
            <button onClick={handleLogin} className="btn primary">
              Go to Login
            </button>
            <button onClick={handleRetry} className="btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cat-container">
      <div className="cat-header">
        <h1>Category Management</h1>
        <p className="subtitle">Manage your spending and income categories</p>
      </div>

      <div className="cat-stats">
        <div className="cat-stat">
          <Tag />
          <div>
            <div className="stat-label">Total Categories</div>
            <div className="stat-value">{categories.length}</div>
          </div>
        </div>
        <div className="cat-stat">
          <Brain />
          <div>
            <div className="stat-label">Needs</div>
            <div className="stat-value">{categories.filter(c => c.type === 'need').length}</div>
          </div>
        </div>
        <div className="cat-stat">
          <Target />
          <div>
            <div className="stat-label">Wants</div>
            <div className="stat-value">{categories.filter(c => c.type === 'want').length}</div>
          </div>
        </div>
      </div>

      {error && !authError && (
        <div className="error">
          {error}
          <button onClick={handleRetry} className="btn-retry">
            Retry
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2>{editingId ? 'Edit Category' : 'Create Category'}</h2>
        </div>
        <form className="cat-form" onSubmit={handleSubmit}>
          <div className="row">
            <label>Name</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g., Food & Dining"
              disabled={saving}
            />
          </div>
          <div className="row">
            <label>Type</label>
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              disabled={saving}
            >
              <option value="need">Need</option>
              <option value="want">Want</option>
            </select>
          </div>
          <div className="row">
            <label>Color</label>
            <input
              type="color"
              value={form.color}
              onChange={e => setForm({ ...form, color: e.target.value })}
              disabled={saving}
            />
          </div>
          <div className="row">
            <label>Keywords (comma-separated)</label>
            <input
              value={form.keywords}
              onChange={e => setForm({ ...form, keywords: e.target.value })}
              placeholder="swiggy, zomato, pizza"
              disabled={saving}
            />
          </div>
          <div className="actions">
            {editingId ? (
              <>
                <button disabled={saving} className="btn primary" type="submit">
                  <Save size={16}/> {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn" onClick={cancelEdit} disabled={saving}>
                  <X size={16}/> Cancel
                </button>
              </>
            ) : (
              <button disabled={saving} className="btn primary" type="submit">
                <Plus size={16}/> {saving ? 'Adding...' : 'Add Category'}
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Your Categories</h2>
        </div>

        {loading ? (
          <div className="empty">Loading…</div>
        ) : categories.length === 0 ? (
          <div className="empty">No categories yet. Add your first above.</div>
        ) : (
          <div className="cat-grid">
            {categories.map(c => (
              <div key={c._id} className="cat-item" style={{ borderColor: c.color }}>
                <div className="cat-item-head">
                  <div className="cat-name">
                    <span className="dot" style={{ background: c.color }} />
                    {c.name} <small>({c.type})</small>
                  </div>
                  <div className="cat-actions">
                    <button className="icon" onClick={() => startEdit(c)}>
                      <Pencil size={16}/>
                    </button>
                    <button className="icon danger" onClick={() => remove(c._id)}>
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>

                {c.keywords?.length ? (
                  <div className="keywords">
                    <Tag size={14}/> {c.keywords.join(', ')}
                  </div>
                ) : (
                  <div className="keywords none">No keywords</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;