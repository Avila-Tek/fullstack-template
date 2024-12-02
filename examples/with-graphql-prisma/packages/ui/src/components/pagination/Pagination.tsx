'use client';

import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface PaginationProps {
  count: number;
  customPrev?: React.ReactNode;
  customNext?: React.ReactNode;
  activeStyle?: string;
}

interface PaginationButtonProps {
  label: ReactNode;
  isActive: boolean;
  activeStyle: string;
  onClick: () => void;
}

function PaginationButton({
  label,
  isActive,
  activeStyle,
  onClick,
}: PaginationButtonProps) {
  return (
    <button
      type="button"
      className={twMerge(
        `border rounded px-4 py-2 bg-white text-inherit`,
        `${isActive && activeStyle}`
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function Pagination({
  count,
  activeStyle = 'bg-blue-500 text-white',
  customNext,
  customPrev,
}: PaginationProps) {
  const [page, setPage] = React.useState(1);
  const pageNumbers: number[] = [];

  for (let i = 1; i <= count; i += 1) {
    pageNumbers.push(i);
  }

  const handleClick = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= count) {
      setPage(pageNumber);
    }
  };

  const renderPageNumbers = () => {
    const totalPages = count;
    const displayLimit = 5; // Maximum number of pages to display in between ellipses
    const sideLimit = Math.floor(displayLimit / 2);
    const currentPageIndex = page - 1;
    const firstPageIndex = 0;
    const lastPageIndex = totalPages - 1;
    const pages = [];

    if (totalPages <= displayLimit) {
      // Display all pages without ellipses
      return pageNumbers.map((number) => (
        <PaginationButton
          key={number}
          activeStyle={activeStyle}
          label={number.toString()}
          onClick={() => handleClick(number)}
          isActive={page === number}
        />
      ));
    }
    // Display pages with ellipses
    if (currentPageIndex <= sideLimit) {
      // Display first "displayLimit" pages without ellipses
      for (let i = 0; i < displayLimit && i < totalPages; i += 1) {
        pages.push(
          <PaginationButton
            key={i + 1}
            activeStyle={activeStyle}
            label={i + 1}
            onClick={() => handleClick(i + 1)}
            isActive={currentPageIndex === i}
          />
        );
      }
      if (lastPageIndex > displayLimit) {
        pages.push(
          <div
            key="ellipsis-end"
            className="border rounded px-4 py-2 bg-white text-inherit"
          >
            ...
          </div>
        );
        pages.push(
          <PaginationButton
            key={totalPages}
            activeStyle={activeStyle}
            label={totalPages}
            isActive={page === totalPages}
            onClick={() => handleClick(totalPages)}
          />
        );
      }
    } else if (currentPageIndex >= lastPageIndex - sideLimit) {
      if (firstPageIndex < lastPageIndex - displayLimit) {
        pages.push(
          <PaginationButton
            key={1}
            activeStyle={activeStyle}
            label={1}
            isActive={page === 1}
            onClick={() => handleClick(1)}
          />
        );
        pages.push(
          <div
            key="ellipsis-start"
            className="border rounded px-4 py-2 bg-white text-inherit"
          >
            ...
          </div>
        );
      }

      for (let i = lastPageIndex - displayLimit; i <= lastPageIndex; i += 1) {
        pages.push(
          <PaginationButton
            key={i + 1}
            label={i + 1}
            isActive={page === i + 1}
            activeStyle={activeStyle}
            onClick={() => handleClick(i + 1)}
          />
        );
      }
    } else {
      const startPageIndex =
        currentPageIndex - sideLimit + (currentPageIndex > sideLimit ? 1 : 0);
      const endPageIndex =
        currentPageIndex +
        sideLimit -
        (currentPageIndex < lastPageIndex - sideLimit ? 1 : 0);

      if (startPageIndex > firstPageIndex) {
        pages.push(
          <PaginationButton
            key={1}
            label={1}
            activeStyle={activeStyle}
            isActive={page === 1}
            onClick={() => handleClick(1)}
          />
        );
        pages.push(
          <button
            type="button"
            key="ellipsis-start"
            className="border rounded px-4 py-2 bg-white text-inherit cursor-default select-none"
            disabled
          >
            ...
          </button>
        );
      }

      for (let i = startPageIndex; i <= endPageIndex; i += 1) {
        pages.push(
          <PaginationButton
            label={i + 1}
            activeStyle={activeStyle}
            isActive={page === i + 1}
            onClick={() => handleClick(i + 1)}
          />
        );
      }

      if (endPageIndex < lastPageIndex) {
        pages.push(
          <button
            type="button"
            key="ellipsis-end"
            className="border rounded px-4 py-2 bg-white text-inherit cursor-default select-none"
            disabled
          >
            ...
          </button>
        );
        pages.push(
          <PaginationButton
            label={totalPages}
            activeStyle={activeStyle}
            isActive={page === totalPages}
            onClick={() => handleClick(totalPages)}
          />
        );
      }
    }

    return pages;
  };

  return (
    <nav className="flex space-x-2">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => handleClick(page - 1)}
        className="border rounded px-4 py-2 bg-white text-inherit disabled:text-gray-300"
      >
        {customPrev || 'Previous'}
      </button>
      {renderPageNumbers()}
      <button
        type="button"
        disabled={page === count}
        onClick={() => handleClick(page + 1)}
        className="border rounded px-4 py-2 bg-white text-inherit disabled:text-gray-300"
      >
        {customNext || 'Next'}
      </button>
    </nav>
  );
}
