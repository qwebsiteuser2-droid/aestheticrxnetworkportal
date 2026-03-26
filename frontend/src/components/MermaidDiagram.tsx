'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className = '' }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'Arial, sans-serif',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });

    const renderChart = async () => {
      if (chartRef.current && chart) {
        try {
          // Clear previous content
          chartRef.current.innerHTML = '';
          
          // Generate unique ID for this chart
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Render the chart
          const { svg } = await mermaid.render(id, chart);
          chartRef.current.innerHTML = svg;
        } catch (error: unknown) {
          console.error('Error rendering Mermaid diagram:', error);
          chartRef.current.innerHTML = `
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-red-600 text-sm">
                <strong>Error rendering diagram:</strong> ${error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <details class="mt-2">
                <summary class="text-red-500 text-xs cursor-pointer">Show diagram code</summary>
                <pre class="mt-2 p-2 bg-gray-100 text-xs overflow-auto">${chart}</pre>
              </details>
            </div>
          `;
        }
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div 
      ref={chartRef} 
      className={`mermaid-diagram ${className}`}
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '200px',
        width: '100%'
      }}
    />
  );
};

export default MermaidDiagram;
