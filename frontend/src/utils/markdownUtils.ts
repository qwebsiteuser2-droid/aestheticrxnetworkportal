// Utility functions for processing markdown content with Mermaid diagrams

export interface ProcessedContent {
  content: string;
  diagrams: Array<{
    id: string;
    code: string;
    placeholder: string;
  }>;
}

export const processMarkdownWithDiagrams = (markdown: string): ProcessedContent => {
  const diagrams: Array<{ id: string; code: string; placeholder: string }> = [];
  let processedContent = markdown;

  // Find all Mermaid code blocks
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  let match;
  let diagramIndex = 0;

  while ((match = mermaidRegex.exec(markdown)) !== null) {
    const fullMatch = match[0];
    const diagramCode = match[1].trim();
    const diagramId = `mermaid-diagram-${diagramIndex++}`;
    
    // Create placeholder for the diagram
    const placeholder = `<!-- MERMAID_DIAGRAM_${diagramId} -->`;
    
    diagrams.push({
      id: diagramId,
      code: diagramCode,
      placeholder
    });
    
    // Replace the mermaid code block with placeholder
    processedContent = processedContent.replace(fullMatch, placeholder);
  }

  return {
    content: processedContent,
    diagrams
  };
};

export const renderMarkdownWithDiagrams = (
  content: string,
  diagrams: Array<{ id: string; code: string; placeholder: string }>
): string => {
  let renderedContent = content;

  // Replace placeholders with rendered diagrams
  diagrams.forEach(diagram => {
    const diagramHtml = `
      <div class="mermaid-container my-4 p-4 bg-gray-50 rounded-lg border">
        <div class="mermaid-diagram" data-diagram-id="${diagram.id}">
          <!-- Diagram will be rendered here by React component -->
        </div>
        <details class="mt-2">
          <summary class="text-xs text-gray-500 cursor-pointer">Show diagram code</summary>
          <pre class="mt-2 p-2 bg-white text-xs overflow-auto border rounded">${diagram.code}</pre>
        </details>
      </div>
    `;
    renderedContent = renderedContent.replace(diagram.placeholder, diagramHtml);
  });

  return renderedContent;
};

export const extractMermaidDiagrams = (content: string): Array<{ id: string; code: string }> => {
  const diagrams: Array<{ id: string; code: string }> = [];
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  let match;
  let diagramIndex = 0;

  while ((match = mermaidRegex.exec(content)) !== null) {
    const diagramCode = match[1].trim();
    diagrams.push({
      id: `mermaid-diagram-${diagramIndex++}`,
      code: diagramCode
    });
  }

  return diagrams;
};
