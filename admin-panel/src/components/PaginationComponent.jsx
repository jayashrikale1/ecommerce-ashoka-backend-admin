import React from 'react';
import { Pagination } from 'react-bootstrap';

const PaginationComponent = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Logic to show limited page numbers with ellipsis
  const getPageNumbers = () => {
    const delta = 2;
    const left = currentPage - delta;
    const right = currentPage + delta + 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const pages = getPageNumbers();

  return (
    <div className="d-flex justify-content-center mt-4">
      <Pagination>
        <Pagination.First 
          onClick={() => onPageChange(1)} 
          disabled={currentPage === 1} 
        />
        <Pagination.Prev 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1} 
        />
        
        {pages.map((page, idx) => (
          page === '...' ? (
            <Pagination.Ellipsis key={`ellipsis-${idx}`} disabled />
          ) : (
            <Pagination.Item 
              key={page} 
              active={page === currentPage}
              onClick={() => onPageChange(page)}
            >
              {page}
            </Pagination.Item>
          )
        ))}

        <Pagination.Next 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages} 
        />
        <Pagination.Last 
          onClick={() => onPageChange(totalPages)} 
          disabled={currentPage === totalPages} 
        />
      </Pagination>
    </div>
  );
};

export default PaginationComponent;
