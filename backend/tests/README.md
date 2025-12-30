# Backend Tests

This folder contains comprehensive Jest tests for the backend API routes using Supertest.

## Configuration

### Server URL

The tests are configured to hit a running server. By default, tests connect to `http://localhost:5000`.

To change the server URL, set the `TEST_SERVER_URL` environment variable:

```bash
TEST_SERVER_URL=http://localhost:3000 npm run test
```

## Test Files

- **auth.test.js** - Authentication routes (register, login, logout, is_logged_in, is_admin)
- **users.test.js** - User management routes (CRUD operations, admin functions)
- **projects.test.js** - Project routes (create, read, update, delete, assign users)
- **tasks.test.js** - Task routes (create, read, update, delete, assign users, status updates)
- **files.test.js** - File upload and management routes

## Requirements

The backend server must be running before running tests:

```bash
npm start
```

In another terminal:

```bash
npm run test
```

Or with watch mode:

```bash
npm run test:watch
```

## Test Coverage

Tests cover:
- ✅ Route accessibility (authentication checks)
- ✅ Valid request handling
- ✅ Invalid/missing parameter validation
- ✅ Session management
- ✅ CRUD operations
- ✅ Authorization (admin routes)
- ✅ File uploads and downloads
- ✅ Edge cases and error conditions

## Notes

- Tests use `supertest.agent()` to maintain session cookies across requests
- Each test file creates its own test data to avoid dependencies
- Tests use timestamps in email/names to prevent duplicate key violations
- No mocking is done - tests hit the actual database and routes
