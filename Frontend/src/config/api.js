// Centralized API and Backend URL configuration
export const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
export const API_BASE = `${BACKEND_URL}/api`;
