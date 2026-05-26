import { describe, expect, it } from 'vitest';
import { buildPagination } from '../../src/pagination/index';

describe('buildPagination', () => {
  it('returns correct count and items', () => {
    const result = buildPagination(['a', 'b'], 20, { page: 1, perPage: 10 });
    expect(result.count).toBe(20);
    expect(result.items).toEqual(['a', 'b']);
  });

  it('computes pageCount from total and perPage', () => {
    const result = buildPagination([], 25, { page: 1, perPage: 10 });
    expect(result.pageInfo.pageCount).toBe(3);
  });

  it('sets hasPreviousPage to false on first page', () => {
    const result = buildPagination([], 20, { page: 1, perPage: 10 });
    expect(result.pageInfo.hasPreviousPage).toBe(false);
  });

  it('sets hasPreviousPage to true beyond first page', () => {
    const result = buildPagination([], 20, { page: 2, perPage: 10 });
    expect(result.pageInfo.hasPreviousPage).toBe(true);
  });

  it('sets hasNextPage to false on last page', () => {
    const result = buildPagination([], 20, { page: 2, perPage: 10 });
    expect(result.pageInfo.hasNextPage).toBe(false);
  });

  it('sets hasNextPage to true before last page', () => {
    const result = buildPagination([], 20, { page: 1, perPage: 10 });
    expect(result.pageInfo.hasNextPage).toBe(true);
  });

  it('sets itemCount to the length of items passed', () => {
    const result = buildPagination(['x', 'y', 'z'], 100, {
      page: 1,
      perPage: 10,
    });
    expect(result.pageInfo.itemCount).toBe(3);
  });

  it('reflects currentPage and perPage in pageInfo', () => {
    const result = buildPagination([], 50, { page: 3, perPage: 5 });
    expect(result.pageInfo.currentPage).toBe(3);
    expect(result.pageInfo.perPage).toBe(5);
  });

  it('handles total 0 with pageCount 0', () => {
    const result = buildPagination([], 0, { page: 1, perPage: 10 });
    expect(result.pageInfo.pageCount).toBe(0);
    expect(result.pageInfo.hasNextPage).toBe(false);
  });
});
