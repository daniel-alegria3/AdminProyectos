// Mock database module
const mockExecute = jest.fn();
const mockQuery = jest.fn();

const dbMock = {
  execute: mockExecute,
  query: mockQuery,
};

module.exports = {
  dbMock,
  mockExecute,
  mockQuery,
};
