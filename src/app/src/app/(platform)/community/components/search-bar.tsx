"use client";

import { Input } from "@/components/ui/input";
import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export function SearchBar({ placeholder = "Search posts...", onSearch, debounceMs = 300 }: SearchBarProps) {
  const [value, setValue] = useState("");
  const debouncedValue = useDebounce(value, debounceMs);

  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  const handleClear = () => {
    setValue("");
    onSearch("");
  };

  return (
    <div className="relative">
      <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9 pr-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
          onClick={handleClear}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
