import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/hljs';

// atelierLakesideDark, nord, dracula

export default function CodeBlock({ code }: { code: string }) {
  return (
    <SyntaxHighlighter language="tsx" style={nord} wrapLines showLineNumbers>
      {code}
    </SyntaxHighlighter>
  );
}
