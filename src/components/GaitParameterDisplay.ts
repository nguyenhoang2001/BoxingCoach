/**
 * GaitParameterDisplay - Real-time gait parameter visualization
 * Displays temporal, spatial, and biomechanical parameters with confidence indicators
 * Includes trend charts and statistical analysis
 */

import { 
  GaitParameters, 
  ParameterStatistics, 
  VisualizationSettings,
  TemporalParameters,
  SpatialParameters,
  QualityMetrics
} from '../types/gait';

export interface ParameterDisplayConfig {
  container: HTMLElement;
  showTrends: boolean;
  showStatistics: boolean;
  updateInterval: number;
  historyLength: number;
}

export interface ParameterChart {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  data: number[];
  maxDataPoints: number;
  color: string;
  label: string;
}

export class GaitParameterDisplay {
  private container: HTMLElement;
  private config: ParameterDisplayConfig;
  private settings: VisualizationSettings;
  private parameters: Map<string, ParameterStatistics> = new Map();
  private charts: Map<string, ParameterChart> = new Map();
  private updateTimer: number | null = null;

  // Parameter definitions with normal ranges
  private readonly parameterDefinitions = {
    cadence: { 
      label: 'Cadence', 
      unit: 'steps/min', 
      normalRange: [100, 120], 
      color: '#4CAF50',
      precision: 1
    },
    strideTime: { 
      label: 'Stride Time', 
      unit: 's', 
      normalRange: [1.0, 1.2], 
      color: '#2196F3',
      precision: 2
    },
    stepTime: { 
      label: 'Step Time', 
      unit: 's', 
      normalRange: [0.5, 0.6], 
      color: '#FF9800',
      precision: 2
    },
    strideLength: { 
      label: 'Stride Length', 
      unit: 'm', 
      normalRange: [1.2, 1.5], 
      color: '#9C27B0',
      precision: 2
    },
    stepLength: { 
      label: 'Step Length', 
      unit: 'm', 
      normalRange: [0.6, 0.75], 
      color: '#E91E63',
      precision: 2
    },
    stepWidth: { 
      label: 'Step Width', 
      unit: 'm', 
      normalRange: [0.08, 0.12], 
      color: '#00BCD4',
      precision: 3
    },
    velocity: { 
      label: 'Gait Velocity', 
      unit: 'm/s', 
      normalRange: [1.2, 1.5], 
      color: '#8BC34A',
      precision: 2
    },
    symmetryIndex: { 
      label: 'Symmetry Index', 
      unit: '%', 
      normalRange: [0, 5], 
      color: '#FFC107',
      precision: 1
    },
    variabilityIndex: { 
      label: 'Variability Index', 
      unit: '%', 
      normalRange: [0, 5], 
      color: '#FF5722',
      precision: 1
    }
  };

  constructor(config: ParameterDisplayConfig, settings: VisualizationSettings) {
    this.config = config;
    this.settings = settings;
    this.container = config.container;
    this.initializeUI();
    this.startUpdateTimer();
  }

  private initializeUI(): void {
    this.container.innerHTML = `
      <div class="gait-parameter-display">
        <div class="parameter-header">
          <h2>Gait Parameters</h2>
          <div class="quality-indicator">
            <span class="quality-label">Quality:</span>
            <div class="quality-bar">
              <div class="quality-fill"></div>
            </div>
            <span class="quality-value">--</span>
          </div>
        </div>
        
        <div class="parameter-tabs">
          <button class="tab-button active" data-tab="temporal">Temporal</button>
          <button class="tab-button" data-tab="spatial">Spatial</button>
          <button class="tab-button" data-tab="analysis">Analysis</button>
        </div>

        <div class="parameter-content">
          <div class="tab-content active" id="temporal-tab">
            <div class="parameter-grid">
              ${this.createParameterCards(['cadence', 'strideTime', 'stepTime'])}
            </div>
          </div>
          
          <div class="tab-content" id="spatial-tab">
            <div class="parameter-grid">
              ${this.createParameterCards(['strideLength', 'stepLength', 'stepWidth', 'velocity'])}
            </div>
          </div>
          
          <div class="tab-content" id="analysis-tab">
            <div class="parameter-grid">
              ${this.createParameterCards(['symmetryIndex', 'variabilityIndex'])}
            </div>
            <div class="analysis-charts">
              ${this.createAnalysisCharts()}
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.initializeCharts();
  }

  private createParameterCards(parameterIds: string[]): string {
    return parameterIds.map(id => {
      const def = this.parameterDefinitions[id];
      return `
        <div class="parameter-card" data-parameter="${id}">
          <div class="parameter-header">
            <h3>${def.label}</h3>
            <div class="parameter-status">
              <span class="status-indicator"></span>
            </div>
          </div>
          
          <div class="parameter-value">
            <span class="value-number">--</span>
            <span class="value-unit">${def.unit}</span>
          </div>
          
          <div class="parameter-details">
            <div class="confidence-indicator">
              <span class="confidence-label">Confidence:</span>
              <div class="confidence-bar">
                <div class="confidence-fill"></div>
              </div>
              <span class="confidence-value">--%</span>
            </div>
            
            <div class="normal-range">
              <span class="range-label">Normal:</span>
              <span class="range-value">${def.normalRange[0]}-${def.normalRange[1]} ${def.unit}</span>
            </div>
            
            <div class="statistics" style="display: ${this.config.showStatistics ? 'block' : 'none'}">
              <div class="stat-item">
                <span class="stat-label">Mean:</span>
                <span class="stat-value stat-mean">--</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Std:</span>
                <span class="stat-value stat-std">--</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">CV:</span>
                <span class="stat-value stat-cv">--%</span>
              </div>
            </div>
          </div>
          
          <div class="parameter-trend" style="display: ${this.config.showTrends ? 'block' : 'none'}">
            <canvas class="trend-chart" width="200" height="60"></canvas>
          </div>
        </div>
      `;
    }).join('');
  }

  private createAnalysisCharts(): string {
    return `
      <div class="analysis-chart-container">
        <div class="chart-section">
          <h3>Parameter Trends</h3>
          <canvas id="trend-analysis-chart" width="400" height="200"></canvas>
        </div>
        
        <div class="chart-section">
          <h3>Gait Cycle Analysis</h3>
          <canvas id="cycle-analysis-chart" width="400" height="200"></canvas>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // Tab switching
    const tabButtons = this.container.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabName = target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Parameter card interactions
    const parameterCards = this.container.querySelectorAll('.parameter-card');
    parameterCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const parameter = target.dataset.parameter;
        this.onParameterClick(parameter);
      });
    });
  }

  private initializeCharts(): void {
    // Initialize trend charts for each parameter
    Object.keys(this.parameterDefinitions).forEach(paramId => {
      const card = this.container.querySelector(`[data-parameter="${paramId}"]`);
      if (card) {
        const canvas = card.querySelector('.trend-chart') as HTMLCanvasElement;
        if (canvas) {
          const ctx = canvas.getContext('2d')!;
          const def = this.parameterDefinitions[paramId];
          
          this.charts.set(paramId, {
            canvas,
            ctx,
            data: [],
            maxDataPoints: 50,
            color: def.color,
            label: def.label
          });
        }
      }
    });

    // Initialize analysis charts
    const trendAnalysisCanvas = this.container.querySelector('#trend-analysis-chart') as HTMLCanvasElement;
    if (trendAnalysisCanvas) {
      const ctx = trendAnalysisCanvas.getContext('2d')!;
      this.charts.set('trend-analysis', {
        canvas: trendAnalysisCanvas,
        ctx,
        data: [],
        maxDataPoints: 100,
        color: '#333',
        label: 'Combined Trends'
      });
    }
  }

  private switchTab(tabName: string): void {
    // Update button states
    const buttons = this.container.querySelectorAll('.tab-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    const activeButton = this.container.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) activeButton.classList.add('active');

    // Update content visibility
    const contents = this.container.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    const activeContent = this.container.querySelector(`#${tabName}-tab`);
    if (activeContent) activeContent.classList.add('active');
  }

  private onParameterClick(parameter: string): void {
    // Handle parameter card click - could show detailed view
    console.log(`Parameter clicked: ${parameter}`);
  }

  /**
   * Update gait parameters display
   */
  public updateParameters(parameters: GaitParameters, quality: QualityMetrics): void {
    // Update quality indicator
    this.updateQualityIndicator(quality);

    // Update individual parameters
    Object.entries(parameters).forEach(([key, value]) => {
      if (key in this.parameterDefinitions && typeof value === 'number') {
        this.updateParameter(key, value, parameters.confidence);
      }
    });
  }

  private updateQualityIndicator(quality: QualityMetrics): void {
    const qualityBar = this.container.querySelector('.quality-fill') as HTMLElement;
    const qualityValue = this.container.querySelector('.quality-value') as HTMLElement;
    
    if (qualityBar && qualityValue) {
      const overallQuality = quality.overallQuality * 100;
      qualityBar.style.width = `${overallQuality}%`;
      qualityBar.style.backgroundColor = this.getQualityColor(quality.overallQuality);
      qualityValue.textContent = `${overallQuality.toFixed(0)}%`;
    }
  }

  private getQualityColor(quality: number): string {
    if (quality > 0.8) return '#4CAF50';  // Green
    if (quality > 0.6) return '#FFC107';  // Yellow
    if (quality > 0.4) return '#FF9800';  // Orange
    return '#F44336';                     // Red
  }

  private updateParameter(paramId: string, value: number, confidence: number): void {
    const card = this.container.querySelector(`[data-parameter="${paramId}"]`) as HTMLElement;
    if (!card) return;

    const def = this.parameterDefinitions[paramId];
    
    // Update parameter statistics
    this.updateParameterStatistics(paramId, value, confidence);
    
    // Update display values
    const valueElement = card.querySelector('.value-number') as HTMLElement;
    const confidenceBar = card.querySelector('.confidence-fill') as HTMLElement;
    const confidenceValue = card.querySelector('.confidence-value') as HTMLElement;
    const statusIndicator = card.querySelector('.status-indicator') as HTMLElement;
    
    if (valueElement) {
      valueElement.textContent = value.toFixed(def.precision);
    }
    
    if (confidenceBar && confidenceValue) {
      const confidencePercent = confidence * 100;
      confidenceBar.style.width = `${confidencePercent}%`;
      confidenceBar.style.backgroundColor = this.getConfidenceColor(confidence);
      confidenceValue.textContent = `${confidencePercent.toFixed(0)}%`;
    }
    
    if (statusIndicator) {
      statusIndicator.style.backgroundColor = this.getParameterStatusColor(paramId, value);
    }
    
    // Update statistics display
    this.updateParameterStatisticsDisplay(paramId, card);
    
    // Update trend chart
    if (this.config.showTrends) {
      this.updateTrendChart(paramId, value);
    }
  }

  private updateParameterStatistics(paramId: string, value: number, confidence: number): void {
    let stats = this.parameters.get(paramId);
    
    if (!stats) {
      stats = {
        mean: value,
        std: 0,
        min: value,
        max: value,
        coefficient_of_variation: 0,
        samples: 1,
        history: [value]
      };
    } else {
      // Update running statistics
      stats.history.push(value);
      if (stats.history.length > this.config.historyLength) {
        stats.history.shift();
      }
      
      stats.samples = stats.history.length;
      stats.mean = stats.history.reduce((sum, val) => sum + val, 0) / stats.samples;
      stats.min = Math.min(...stats.history);
      stats.max = Math.max(...stats.history);
      
      // Calculate standard deviation
      const variance = stats.history.reduce((sum, val) => sum + Math.pow(val - stats.mean, 2), 0) / stats.samples;
      stats.std = Math.sqrt(variance);
      
      // Calculate coefficient of variation
      stats.coefficient_of_variation = stats.mean !== 0 ? (stats.std / stats.mean) * 100 : 0;
    }
    
    this.parameters.set(paramId, stats);
  }

  private updateParameterStatisticsDisplay(paramId: string, card: HTMLElement): void {
    const stats = this.parameters.get(paramId);
    if (!stats) return;

    const meanElement = card.querySelector('.stat-mean') as HTMLElement;
    const stdElement = card.querySelector('.stat-std') as HTMLElement;
    const cvElement = card.querySelector('.stat-cv') as HTMLElement;
    
    const def = this.parameterDefinitions[paramId];
    
    if (meanElement) {
      meanElement.textContent = stats.mean.toFixed(def.precision);
    }
    
    if (stdElement) {
      stdElement.textContent = stats.std.toFixed(def.precision);
    }
    
    if (cvElement) {
      cvElement.textContent = stats.coefficient_of_variation.toFixed(1);
    }
  }

  private getConfidenceColor(confidence: number): string {
    if (confidence > 0.8) return '#4CAF50';
    if (confidence > 0.6) return '#FFC107';
    if (confidence > 0.4) return '#FF9800';
    return '#F44336';
  }

  private getParameterStatusColor(paramId: string, value: number): string {
    const def = this.parameterDefinitions[paramId];
    const [min, max] = def.normalRange;
    
    if (value >= min && value <= max) {
      return '#4CAF50';  // Green - normal
    } else if (value < min * 0.8 || value > max * 1.2) {
      return '#F44336';  // Red - significantly abnormal
    } else {
      return '#FFC107';  // Yellow - slightly abnormal
    }
  }

  private updateTrendChart(paramId: string, value: number): void {
    const chart = this.charts.get(paramId);
    if (!chart) return;

    // Add new data point
    chart.data.push(value);
    if (chart.data.length > chart.maxDataPoints) {
      chart.data.shift();
    }

    // Redraw chart
    this.drawTrendChart(chart);
  }

  private drawTrendChart(chart: ParameterChart): void {
    const { canvas, ctx, data, color } = chart;
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (data.length < 2) return;

    // Calculate scales
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const range = maxValue - minValue || 1;
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw trend line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - minValue) / range) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw data points
    ctx.fillStyle = color;
    data.forEach((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - minValue) / range) * height;
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  private startUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    this.updateTimer = window.setInterval(() => {
      this.updateDisplay();
    }, this.config.updateInterval);
  }

  private updateDisplay(): void {
    // Update any time-based display elements
    // This could include refreshing statistics, updating animations, etc.
  }

  /**
   * Get current parameter statistics
   */
  public getParameterStatistics(): Map<string, ParameterStatistics> {
    return new Map(this.parameters);
  }

  /**
   * Reset all statistics
   */
  public resetStatistics(): void {
    this.parameters.clear();
    this.charts.forEach(chart => {
      chart.data = [];
    });
  }

  /**
   * Update settings
   */
  public updateSettings(newSettings: Partial<VisualizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Update visibility based on settings
    const statisticsElements = this.container.querySelectorAll('.statistics');
    statisticsElements.forEach(elem => {
      (elem as HTMLElement).style.display = this.settings.showParameters ? 'block' : 'none';
    });
  }

  /**
   * Export parameter data
   */
  public exportData(): { parameters: Map<string, ParameterStatistics>, timestamp: number } {
    return {
      parameters: new Map(this.parameters),
      timestamp: Date.now()
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    this.parameters.clear();
    this.charts.clear();
  }
}