import React, { useEffect, useRef } from 'react';

/**
 * A simple markdown renderer that converts common markdown to HTML.
 * Supports: headers, bold, italic, lists, code blocks, and links.
 * Also renders Mermaid diagrams if present.
 */
const MarkdownRenderer = ({ content, isDarkMode = false }) => {
    const mermaidRef = useRef(null);

    useEffect(() => {
        // Initialize Mermaid if there are any mermaid blocks
        if (content?.includes('```mermaid') && window.mermaid) {
            window.mermaid.init(undefined, mermaidRef.current?.querySelectorAll('.mermaid'));
        }
    }, [content]);

    if (!content) return null;

    // Parse markdown to HTML
    const parseMarkdown = (text) => {
        let html = text;

        // Escape HTML to prevent XSS
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Code blocks with language (including mermaid)
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            if (lang === 'mermaid') {
                return `<div class="mermaid my-4">${code.trim()}</div>`;
            }
            return `<pre class="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto my-3 text-sm"><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
        });

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

        // Headers (## Header)
        html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>');

        // Bold (**text** or __text__)
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
        html = html.replace(/__([^_]+)__/g, '<strong class="font-semibold">$1</strong>');

        // Italic (*text* or _text_)
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

        // Unordered lists (- item or * item)
        html = html.replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
        // Wrap consecutive <li> in <ul>
        html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="my-2 space-y-1">$&</ul>');

        // Ordered lists (1. item)
        html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

        // Horizontal rule
        html = html.replace(/^---$/gm, '<hr class="my-4 border-gray-300 dark:border-gray-600" />');

        // Links [text](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>');

        // Line breaks (preserve paragraph structure)
        html = html.replace(/\n\n/g, '</p><p class="mb-3">');
        html = html.replace(/\n/g, '<br />');

        // Wrap in paragraph
        html = `<p class="mb-3">${html}</p>`;

        return html;
    };

    const htmlContent = parseMarkdown(content);

    return (
        <div
            ref={mermaidRef}
            className={`markdown-content prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
};

export default MarkdownRenderer;
