import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ParsedDocument {
  content: string;
  metadata: {
    filename: string;
    type: string;
    size: number;
    parsedAt: Date;
  };
}

export async function parseDocument(file: Buffer, filename: string): Promise<ParsedDocument> {
  const ext = filename.split('.').pop()?.toLowerCase();

  let content: string;

  switch (ext) {
    case 'pdf': {
      const pdfData = await pdfParse(file);
      content = pdfData.text;
      break;
    }
    case 'docx': {
      const docxData = await mammoth.extractRawText({ buffer: file });
      content = docxData.value;
      break;
    }
    case 'txt':
    case 'md': {
      content = file.toString('utf-8');
      break;
    }
    case 'html': {
      content = file
        .toString('utf-8')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      break;
    }
    case 'csv': {
      content = file.toString('utf-8');
      break;
    }
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }

  return {
    content,
    metadata: {
      filename,
      type: ext || 'unknown',
      size: file.length,
      parsedAt: new Date(),
    },
  };
}

export function isSupportedFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['pdf', 'docx', 'txt', 'md', 'html', 'csv'].includes(ext || '');
}
