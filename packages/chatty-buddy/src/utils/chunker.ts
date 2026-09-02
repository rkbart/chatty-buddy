export interface Chunk {
  id: string;
  content: string;
  metadata: {
    filename: string;
    chunkIndex: number;
    startOffset: number;
    endOffset: number;
  };
}

export function chunkText(
  text: string,
  filename: string,
  chunkSize: number = 500,
  chunkOverlap: number = 50
): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const content = text.slice(start, end);

    // Try to break at sentence boundary
    let actualEnd = end;
    if (end < text.length) {
      const lastPeriod = content.lastIndexOf('.');
      const lastNewline = content.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);

      // Only break early if we're at least 70% through the chunk
      if (breakPoint > chunkSize * 0.7) {
        actualEnd = start + breakPoint + 1;
      }
    }

    chunks.push({
      id: `${filename}-${chunkIndex}`,
      content: text.slice(start, actualEnd),
      metadata: {
        filename,
        chunkIndex,
        startOffset: start,
        endOffset: actualEnd,
      },
    });

    start = actualEnd - chunkOverlap;
    if (start >= text.length) break;
    chunkIndex++;
  }

  return chunks;
}
