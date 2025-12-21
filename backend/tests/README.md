# Backend Test Suite

This directory contains unit and integration tests for the AdminProyectos backend using Jest and Supertest.

## Structure

```
tests/
├── README.md                           # This file
├── setup.js                            # Jest setup and global configuration
├── helpers/                            # Test utilities and mocks
│   ├── db.mock.js                     # Database mock
│   └── testApp.js                     # Test Express app factory
├── routes/                            # Route integration tests
│   └── authRoutes.test.js             # Authentication route tests
├── controllers/                       # Controller unit tests
│   ├── userController.test.js         # User controller tests
│   ├── projectController.test.js      # Project controller tests
│   ├── taskController.test.js         # Task controller tests
│   └── fileController.test.js         # File controller tests
├── middlewares/                       # Middleware tests
│   └── userAuth.test.js               # Authentication middleware tests
└── integration/                       # Integration tests
    └── generalRoutes.integration.test.js  # Complete routes integration tests
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run specific test file
```bash
npm test -- authRoutes.test.js
```

### Run tests with coverage
```bash
npm test -- --coverage
```

## Test Coverage

The test suite covers:

### Authentication Routes
- User registration validation
- User login validation
- Session state checks
- Admin/login requirement checks
- Logout functionality

### User Controller Tests
- User creation (admin only)
- User updates (admin/self)
- User deletion (with self-deletion prevention)
- User status updates
- User retrieval (all users, single user, current user)

### Project Controller Tests
- Project creation
- Project updates
- Project listing (all, personal)
- Project details retrieval
- Project task listing
- User assignment to projects

### Task Controller Tests
- Task creation
- Task updates
- Task status updates
- Task listing (user, project)
- Task details retrieval
- User assignment to tasks

### File Controller Tests
- File downloads
- File uploads to projects
- File uploads to tasks
- File size and type validation

### Middleware Tests
- Authentication requirement checks
- Admin role verification
- Session management
- Cookie handling

### Integration Tests
- Complete route workflows
- Input validation across routes
- Protected route access control
- Query parameter handling

## Writing New Tests

### Example: Testing a Protected Route

```javascript
describe('GET /protected/route', () => {
  it('should return 401 when not logged in', async () => {
    const response = await request(app)
      .get('/protected/route');
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
  
  it('should succeed when authenticated', async () => {
    mockExecute.mockResolvedValue([
      [{ /* data */ }]
    ]);
    
    const response = await request(app)
      .get('/protected/route')
      .set('Cookie', 'valid-session-cookie');
    
    expect(response.status).toBe(200);
  });
});
```

### Example: Testing with Database Mocks

```javascript
describe('GET /users', () => {
  it('should call database correctly', async () => {
    mockExecute.mockResolvedValue([
      [{
        user_id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      }]
    ]);
    
    // Make request...
    
    expect(mockExecute).toHaveBeenCalledWith(
      'SELECT * FROM User',
      []
    );
  });
});
```

## Mocking

### Database Mocking

The test suite uses `db.mock.js` to mock database operations:

```javascript
const { mockExecute, mockQuery } = require('../helpers/db.mock');

// Mock successful query result
mockExecute.mockResolvedValue([
  [{ id: 1, name: 'Test' }]
]);

// Mock query error
mockExecute.mockRejectedValue(new Error('Database error'));
```

### Session Handling

Session setup in tests is limited due to express-session's complexity. For comprehensive session testing:

```javascript
it('should maintain session', async () => {
  const agent = request.agent(app);
  
  // First request sets session
  await agent.post('/user/login').send(credentials);
  
  // Second request uses same session
  const response = await agent.get('/user/is_logged_in');
  expect(response.body.success).toBe(true);
});
```

## Known Limitations

1. **Session Testing**: Full session persistence across requests is limited in unit tests. Integration tests with proper session stores are recommended for production use.

2. **File Upload Testing**: Multer file handling in tests requires proper multipart setup. Current tests validate authentication and parameter checks.

3. **Database Transactions**: Tests mock database calls. For database-specific transaction tests, use an actual test database.

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm test -- --coverage
```

## Best Practices

1. **Always clear mocks** in `beforeEach()`
2. **Test both success and failure cases**
3. **Validate input** before testing logic
4. **Use descriptive test names**
5. **Keep tests isolated** - one concern per test
6. **Mock external dependencies** - database, external APIs
7. **Test authentication** on protected routes
8. **Verify error responses** have proper HTTP status codes

## Troubleshooting

### Tests timeout
Increase timeout in `setup.js`:
```javascript
jest.setTimeout(15000);
```

### Mock not working
Ensure mock is required before the module that uses it:
```javascript
jest.mock('../../database/db', () => {
  const { dbMock } = require('../helpers/db.mock');
  return dbMock;
});

const controller = require('../../controllers/generalController');
```

### Session not persisting
Use `request.agent()` for multi-request session tests:
```javascript
const agent = request.agent(app);
await agent.post('/login').send(credentials);
await agent.get('/protected'); // Session persists
```
