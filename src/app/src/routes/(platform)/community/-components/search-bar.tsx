"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useDebounce } from "#/hooks/use-debounce";

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
      <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pr-9 pl-9" onChange={(e) => setValue(e.target.value)} placeholder={placeholder} value={value} />
      {value && (
        <Button
          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
          onClick={handleClear}
          size="icon"
          variant="ghost"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
