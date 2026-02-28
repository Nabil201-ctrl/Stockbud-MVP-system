import { Injectable } from '@nestjs/common';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    BorderStyle,
    TabStopPosition,
    TabStopType,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ShadingType,
} from 'docx';

export interface DocxReportData {
    title: string;
    type: string;
    generatedAt: string;
    content: string;
    stats?: Record<string, any>;
    shopName?: string;
    userName?: string;
}

@Injectable()
export class DocxGeneratorService {

    /**
     * Generate a DOCX buffer from report data, return as base64 string
     */
    async generateDocx(data: DocxReportData): Promise<string> {
        const sections = this.parseMarkdownToDocx(data.content);

        const children: any[] = [];

        // Title
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'STOCKBUD',
                        bold: true,
                        size: 20,
                        color: '9CA3AF',
                        font: 'Calibri',
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 },
            }),
        );

        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: data.title,
                        bold: true,
                        size: 48,
                        color: '1E40AF',
                        font: 'Calibri',
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
            }),
        );

        // Metadata line
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `Report Type: ${data.type.toUpperCase()}  |  Generated: ${new Date(data.generatedAt).toLocaleDateString('en-US', {
                            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}`,
                        size: 20,
                        color: '6B7280',
                        font: 'Calibri',
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
            }),
        );

        if (data.userName) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Prepared for: ${data.userName}`,
                            size: 22,
                            color: '374151',
                            italics: true,
                            font: 'Calibri',
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                }),
            );
        }

        // Horizontal rule
        children.push(
            new Paragraph({
                border: {
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
                },
                spacing: { after: 400 },
            }),
        );

        // Content sections from markdown
        children.push(...sections);

        // Stats appendix
        if (data.stats && Object.keys(data.stats).length > 0) {
            children.push(
                new Paragraph({
                    border: {
                        bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
                    },
                    spacing: { before: 600, after: 400 },
                }),
            );

            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: 'APPENDIX: KEY METRICS',
                            bold: true,
                            size: 24,
                            color: '374151',
                            font: 'Calibri',
                        }),
                    ],
                    spacing: { after: 200 },
                }),
            );

            // Stats as table
            const statsRows = Object.entries(data.stats).map(([key, value]) => {
                const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
                const formattedValue = typeof value === 'number'
                    ? (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('margin')
                        ? `$${value.toLocaleString()}`
                        : value.toLocaleString())
                    : String(value);

                return new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({
                                children: [new TextRun({ text: formattedKey, bold: true, size: 20, font: 'Calibri' })],
                            })],
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            shading: { type: ShadingType.SOLID, color: 'F3F4F6' },
                        }),
                        new TableCell({
                            children: [new Paragraph({
                                children: [new TextRun({ text: formattedValue, size: 20, font: 'Consolas' })],
                            })],
                            width: { size: 50, type: WidthType.PERCENTAGE },
                        }),
                    ],
                });
            });

            if (statsRows.length > 0) {
                children.push(
                    new Table({
                        rows: statsRows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                );
            }
        }

        // Footer
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `\n\n© ${new Date().getFullYear()} StockBud — Smart Inventory Intelligence`,
                        size: 16,
                        color: '9CA3AF',
                        italics: true,
                        font: 'Calibri',
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 600 },
            }),
        );

        const doc = new Document({
            sections: [{
                properties: {},
                children,
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        return buffer.toString('base64');
    }

    /**
     * Parse markdown content into docx paragraphs
     */
    private parseMarkdownToDocx(content: string): Paragraph[] {
        if (!content) return [];

        const paragraphs: Paragraph[] = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) {
                paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
                continue;
            }

            // Heading 1
            if (trimmed.startsWith('# ')) {
                paragraphs.push(new Paragraph({
                    children: [new TextRun({
                        text: trimmed.replace(/^#\s+/, ''),
                        bold: true,
                        size: 36,
                        color: '1E40AF',
                        font: 'Calibri',
                    })],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 },
                }));
                continue;
            }

            // Heading 2
            if (trimmed.startsWith('## ')) {
                paragraphs.push(new Paragraph({
                    children: [new TextRun({
                        text: trimmed.replace(/^##\s+/, ''),
                        bold: true,
                        size: 30,
                        color: '1E3A8A',
                        font: 'Calibri',
                    })],
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 150 },
                }));
                continue;
            }

            // Heading 3
            if (trimmed.startsWith('### ')) {
                paragraphs.push(new Paragraph({
                    children: [new TextRun({
                        text: trimmed.replace(/^###\s+/, ''),
                        bold: true,
                        size: 26,
                        color: '374151',
                        font: 'Calibri',
                    })],
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 },
                }));
                continue;
            }

            // Bullet point
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const bulletContent = trimmed.replace(/^[-*]\s+/, '');
                paragraphs.push(new Paragraph({
                    children: this.parseInlineFormatting(bulletContent),
                    bullet: { level: 0 },
                    spacing: { after: 60 },
                }));
                continue;
            }

            // Numbered list
            const numberedMatch = trimmed.match(/^\d+\.\s+(.*)/);
            if (numberedMatch) {
                paragraphs.push(new Paragraph({
                    children: this.parseInlineFormatting(numberedMatch[1]),
                    numbering: { reference: 'default-numbering', level: 0 },
                    spacing: { after: 60 },
                }));
                continue;
            }

            // Regular paragraph
            paragraphs.push(new Paragraph({
                children: this.parseInlineFormatting(trimmed),
                spacing: { after: 120 },
            }));
        }

        return paragraphs;
    }

    /**
     * Parse inline bold/italic formatting from markdown  
     */
    private parseInlineFormatting(text: string): TextRun[] {
        const runs: TextRun[] = [];
        // Simple regex to handle **bold** and *italic*
        const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

        for (const part of parts) {
            if (part.startsWith('**') && part.endsWith('**')) {
                runs.push(new TextRun({
                    text: part.slice(2, -2),
                    bold: true,
                    size: 22,
                    font: 'Calibri',
                }));
            } else if (part.startsWith('*') && part.endsWith('*')) {
                runs.push(new TextRun({
                    text: part.slice(1, -1),
                    italics: true,
                    size: 22,
                    font: 'Calibri',
                }));
            } else if (part) {
                runs.push(new TextRun({
                    text: part,
                    size: 22,
                    font: 'Calibri',
                    color: '374151',
                }));
            }
        }

        return runs.length > 0 ? runs : [new TextRun({ text, size: 22, font: 'Calibri' })];
    }
}
