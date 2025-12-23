/**
 * Error Display Component - Shows application errors and error recovery status
 * Provides user-friendly error messages and recovery actions
 */

import React from 'react';
import { AppError } from '../types';
import './ErrorDisplay.css';

interface ErrorDisplayProps {
  errors: AppError[];
  onDismiss: (errorId: string) => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errors,
  onDismiss,
  className
}) => {
  const getSeverityIcon = (severity: string): string => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '❌';
      case 'medium': return '⚠️';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  };

  const getSeverityClass = (severity: string): string => {
    return `error-${severity}`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (errors.length === 0) return null;

  return (
    <div className={`error-display ${className || ''}`}>
      <div className="error-header">
        <h3>System Errors ({errors.length})</h3>
        <button 
          className="dismiss-all"
          onClick={() => errors.forEach(error => onDismiss(error.id))}
          title="Dismiss all errors"
        >
          Clear All
        </button>
      </div>

      <div className="error-list">
        {errors.map(error => (
          <div 
            key={error.id} 
            className={`error-item ${getSeverityClass(error.severity)}`}
            data-testid="error-message"
          >
            <div className="error-content">
              <div className="error-main">
                <span className="error-icon">{getSeverityIcon(error.severity)}</span>
                <div className="error-text">
                  <div className="error-message">{error.message}</div>
                  <div className="error-meta">
                    <span className="error-type">{error.type}</span>
                    <span className="error-time">{formatTimestamp(error.timestamp)}</span>
                    {error.recoverable && (
                      <span className="error-recoverable">Recoverable</span>
                    )}
                  </div>
                </div>
              </div>
              
              {error.details && (
                <div className="error-details">
                  <details>
                    <summary>Details</summary>
                    <pre>{JSON.stringify(error.details, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>

            <button 
              className="error-dismiss"
              onClick={() => onDismiss(error.id)}
              title="Dismiss this error"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};