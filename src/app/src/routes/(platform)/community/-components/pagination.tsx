"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "#/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-6">
      <Button disabled={page === 1} onClick={() => onPageChange(page - 1)} size="sm" variant="outline">
        <ChevronLeftIcon className="mr-1 h-4 w-4" />
        Previous
      </Button>
      <span className="flex items-center px-4 text-muted-foreground text-sm">
        Page {page} of {totalPages}
      </span>
      <Button disabled={page === totalPages} onClick={() => onPageChange(page + 1)} size="sm" variant="outline">
        Next
        <ChevronRightIcon className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
