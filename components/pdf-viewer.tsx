"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfViewerProps = {
  url: string;
  className?: string;
};

export function PdfViewer({ url, className }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setLoading(false);
  }, []);

  const goToPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));
  const zoomIn = () => setScale((s) => Math.min(2.0, s + 0.2));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.2));

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Controls */}
      <div className="sticky top-0 z-10 flex w-full items-center justify-between rounded-xl border border-primary/8 bg-surface px-4 py-2.5 shadow-sm mb-4">
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/10 text-text-muted transition hover:bg-muted-cream hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[7rem] text-center text-sm font-medium text-foreground">
            Page {pageNumber} / {numPages || "…"}
          </span>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/10 text-text-muted transition hover:bg-muted-cream hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/10 text-text-muted transition hover:bg-muted-cream hover:text-foreground disabled:opacity-30"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-[3.5rem] text-center text-xs font-semibold text-text-muted">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 2.0}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/10 text-text-muted transition hover:bg-muted-cream hover:text-foreground disabled:opacity-30"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="w-full overflow-auto rounded-2xl border border-primary/8 bg-white shadow-sm">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        )}
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={() => setLoading(false)}
          loading=""
          className="flex justify-center py-4"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            className="shadow-lg"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Page thumbnails strip */}
      {numPages > 1 && (
        <div className="mt-4 flex w-full gap-2 overflow-x-auto pb-2">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pg) => (
            <button
              key={pg}
              onClick={() => setPageNumber(pg)}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                pg === pageNumber
                  ? "border-primary shadow-md shadow-primary/15"
                  : "border-primary/10 opacity-60 hover:opacity-100 hover:border-primary/30"
              )}
            >
              <Document file={url} loading="">
                <Page
                  pageNumber={pg}
                  width={80}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
              <span
                className={cn(
                  "absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[10px] font-bold text-white",
                  pg === pageNumber && "bg-primary"
                )}
              >
                {pg}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
