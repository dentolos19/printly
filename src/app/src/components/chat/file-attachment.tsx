"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, File, FileAudio, FileImage, FileText, FileVideo, ExternalLink } from "lucide-react";

export interface FileAttachmentProps {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return FileImage;
  if (fileType.startsWith("video/")) return FileVideo;
  if (fileType.startsWith("audio/")) return FileAudio;
  if (fileType === "application/pdf" || fileType.includes("document") || fileType.includes("text")) return FileText;
  return File;
}

function isImageType(fileType: string): boolean {
  return fileType.startsWith("image/");
}

function isVideoType(fileType: string): boolean {
  return fileType.startsWith("video/");
}

export function FileAttachment({ url, fileName, fileType, fileSize, className }: FileAttachmentProps) {
  const Icon = getFileIcon(fileType);

  // Image preview
  if (isImageType(fileType)) {
    return (
      <div className={cn("group relative max-w-xs overflow-hidden rounded-lg", className)}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt={fileName}
            className="max-h-60 w-auto rounded-lg object-contain transition-opacity group-hover:opacity-90"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <ExternalLink className="h-6 w-6 text-white" />
          </div>
        </a>
        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
          <span className="truncate">{fileName}</span>
          <span>•</span>
          <span>{formatFileSize(fileSize)}</span>
        </div>
      </div>
    );
  }

  // Video preview
  if (isVideoType(fileType)) {
    return (
      <div className={cn("max-w-sm overflow-hidden rounded-lg", className)}>
        <video src={url} controls className="max-h-60 w-auto rounded-lg" preload="metadata">
          Your browser does not support the video tag.
        </video>
        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
          <span className="truncate">{fileName}</span>
          <span>•</span>
          <span>{formatFileSize(fileSize)}</span>
        </div>
      </div>
    );
  }

  // Generic file
  return (
    <div className={cn("bg-muted/30 flex items-center gap-3 rounded-lg border p-3", className)}>
      <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        <Icon className="text-primary h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>
        <p className="text-muted-foreground text-xs">{formatFileSize(fileSize)}</p>
      </div>
      <Button variant="ghost" size="icon" className="shrink-0" asChild>
        <a href={url} download={fileName} target="_blank" rel="noopener noreferrer">
          <Download className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}
