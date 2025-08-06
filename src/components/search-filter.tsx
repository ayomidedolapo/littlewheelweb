/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import InputSearch from "@littlewheel/components/input-search";
import InputDatev2 from "@littlewheel/components/input-date-v1";
import { debounce } from "@littlewheel/lib/debounce";
import { cn } from "@littlewheel/lib/utils";

type SearchFilterProps = {
  baseEndpoint: string; // e.g., "/campaign/user"
  search?: boolean;
  useDate?: boolean;
  containerClassName?: string;
  datesClassName?: string; // Optional class for date inputs container

  onEndpointChange: (endpoint: string) => void;
  onFiltersChange?: (params: {
    query?: string;
    fromDate?: Date | null;
    toDate?: Date | null;
    debouncedQuery?: string;
    isSearching?: boolean;
    clearFilters?: () => void;
  }) => void;

  // UI customizations
  searchPlaceholder?: string;
  startDateLabel?: string;
  endDateLabel?: string;
};

const SearchFilter = ({
  baseEndpoint,
  search = true,
  useDate = true,
  containerClassName,
  datesClassName = "bg-white rounded-full",
  onEndpointChange,
  onFiltersChange,
  searchPlaceholder = "Search ...",
  startDateLabel = "Start Date",
  endDateLabel = "End Date",
}: SearchFilterProps) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const debouncedSearch = useCallback((q: string) => {
    debounce((val: string) => setDebouncedQuery(val), 500)(q);
  }, []);

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.append("query", debouncedQuery);
    if (fromDate)
      params.append("fromDate", fromDate.toISOString().slice(0, 10));
    if (toDate) params.append("toDate", toDate.toISOString().slice(0, 10));
    params.append("page", "1");
    params.append("limit", "30");
    return params.toString();
  };

  const clearFilters = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setFromDate(null);
    setToDate(null);
  }, []);

  useEffect(() => {
    const isSearching = Boolean(debouncedQuery || fromDate || toDate);
    const endpoint = isSearching
      ? `${baseEndpoint}/search?${buildSearchParams()}`
      : `${baseEndpoint}/all`;
    onEndpointChange(endpoint);

    if (onFiltersChange) {
      onFiltersChange({
        query,
        fromDate,
        toDate,
        debouncedQuery,
        isSearching,
        clearFilters,
      });
    }
  }, [debouncedQuery, fromDate, toDate, query, clearFilters]);

  const handleSearchClick = (val: string) => {
    setQuery(val);
    setDebouncedQuery(val); // skip debounce if clicked
  };

  const handleDateChange = (
    setter: (date: Date | null) => void,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setter(e.target.value ? new Date(e.target.value) : null);
  };

  return (
    <div className={cn("flex flex-col gap-4", containerClassName)}>
      {search && (
        <InputSearch
          className="max-w-[400px] w-full"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClickSearch={handleSearchClick}
        />
      )}
      {useDate && (
        <div
          className={cn(
            "grid grid-cols-2 gap-2 bg-white rounded-full",
            datesClassName
          )}
        >
          <InputDatev2
            label={startDateLabel}
            placeholder="Select start date"
            name="fromDate"
            className="bg-white rounded-full"
            onChange={(e) => handleDateChange(setFromDate, e)}
            defaultValue={fromDate || undefined}
          />
          <InputDatev2
            label={endDateLabel}
            placeholder="Select end date"
            name="toDate"
            minDate={fromDate || undefined}
            className="bg-white rounded-full"
            onChange={(e) => handleDateChange(setToDate, e)}
            defaultValue={toDate || undefined}
          />
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
