import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, ExternalLink, Loader2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { type DocumentChunk } from '@/types';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PDFViewerPanelProps {
  chunk: DocumentChunk | null;
  onClose: () => void;
}

export default function PDFViewerPanel({ chunk, onClose }: PDFViewerPanelProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [pageInput, setPageInput] = useState<string>('1');
  const [renderedSize, setRenderedSize] = useState<{ width: number; height: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const fileUrl = chunk?.source
    ? `/api/pdf/${encodeURIComponent(chunk.source)}?category=${encodeURIComponent(chunk.category ?? 'concall')}`
    : null;

  useEffect(() => {
    if (chunk) {
      const initial = chunk.page ?? 1;
      setCurrentPage(initial);
      setPageInput(String(initial));
      setNumPages(0);
      setScale(1.2);
      setLoadError(null);
      bodyRef.current?.scrollTo({ top: 0 });
    }
  }, [chunk]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const goPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goNext = () => setCurrentPage(p => Math.min(numPages || p, p + 1));
  const zoomIn = () => setScale(s => Math.min(3, +(s + 0.2).toFixed(2)));
  const zoomOut = () => setScale(s => Math.max(0.4, +(s - 0.2).toFixed(2)));

  const handlePageInputCommit = () => {
    const n = parseInt(pageInput, 10);
    if (!isNaN(n) && n >= 1 && n <= numPages) {
      setCurrentPage(n);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const showHighlight =
    chunk?.bbox &&
    chunk.page_width &&
    chunk.page_height &&
    chunk.page === currentPage &&
    renderedSize;

  let highlightStyle: React.CSSProperties | null = null;
  if (showHighlight && chunk && renderedSize) {
    const scaleX = renderedSize.width / (chunk.page_width as number);
    const scaleY = renderedSize.height / (chunk.page_height as number);
    const bbox = chunk.bbox!;
    highlightStyle = {
      position: 'absolute',
      left: bbox.x * scaleX,
      top: bbox.y * scaleY,
      width: bbox.w * scaleX,
      height: bbox.h * scaleY,
      backgroundColor: 'rgba(253, 224, 71, 0.35)',
      border: '1.5px solid rgba(234, 179, 8, 0.9)',
      borderRadius: 2,
      pointerEvents: 'none',
      boxShadow: '0 0 0 2px rgba(253, 224, 71, 0.15)',
    };
  }

  return (
    <Sheet open={!!chunk} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-[640px] sm:max-w-[720px] p-0 flex flex-col bg-card border-border [&>button]:hidden"
      >
        {chunk && (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] text-muted-foreground tracking-wider">DOCUMENT</p>
                <p className="font-mono text-xs text-foreground truncate" title={chunk.source}>
                  {chunk.source}
                </p>
                {chunk.date && (
                  <p className="font-mono text-[9px] text-primary/80 mt-0.5">{chunk.date}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div
              ref={bodyRef}
              className="flex-1 overflow-auto bg-secondary/20 flex justify-center"
            >
              {fileUrl && (
                <Document
                  file={fileUrl}
                  onLoadSuccess={({ numPages: n }) => { setNumPages(n); setLoadError(null); }}
                  onLoadError={(err) => setLoadError(err.message || 'Failed to load PDF')}
                  loading={
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      <span className="font-mono text-xs">Loading PDF…</span>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                      <p className="font-mono text-xs text-destructive mb-2">Failed to load PDF</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{loadError}</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-2">
                        Check that DEFINE_EDGE_API_KEY is set on the backend.
                      </p>
                    </div>
                  }
                >
                  <div className="relative my-4 shadow-lg">
                    <Page
                      pageNumber={currentPage}
                      scale={scale}
                      onRenderSuccess={(page) => {
                        setRenderedSize({ width: page.width, height: page.height });
                      }}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                    {highlightStyle && <div style={highlightStyle} />}
                  </div>
                </Document>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border bg-card flex-shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={goPrev}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                <input
                  type="text"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={handlePageInputCommit}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePageInputCommit(); }}
                  className="w-10 text-center bg-secondary/40 border border-border rounded px-1 py-0.5 font-mono text-[11px] text-foreground outline-none focus:border-primary/50"
                />
                <span className="font-mono text-[10px] text-muted-foreground">
                  / {numPages || '—'}
                </span>
                <button
                  onClick={goNext}
                  disabled={!numPages || currentPage >= numPages}
                  className="p-1.5 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={zoomOut}
                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="font-mono text-[10px] text-muted-foreground w-10 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground font-mono text-[10px]"
                  title="Open original"
                >
                  <ExternalLink size={12} />
                  Open
                </a>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
