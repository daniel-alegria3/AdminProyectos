import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { provideZonelessChangeDetection } from '@angular/core';

import { AuthService, AuthResponse, RegisterRequest, LoginRequest } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:5000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, provideZonelessChangeDetection()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);

    // Handle the constructor's checkSession() call
    try {
      const checkSessionReq = httpMock.expectOne(`${apiUrl}/user/is_logged_in`);
      checkSessionReq.flush({ success: false });
    } catch {
      // If no request was made, that's fine
    }
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding HTTP requests
  });

  // Service Creation
  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have API URL configured', () => {
      expect(service['apiUrl']).toBe(apiUrl);
    });

    it('should initialize currentUser signal as readonly', () => {
      const currentUser = service.currentUser;
      expect(currentUser()).toBeNull();
    });

    it('should initialize userId computed as readonly', () => {
      const userId = service.userId;
      expect(userId()).toBeNull();
    });
  });

  // Check Session
  describe('checkSession()', () => {
    it('should make GET request to /user/is_logged_in', () => {
      service.checkSession().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/is_logged_in`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);

      req.flush({ success: false });
    });

    it('should update currentUser signal on successful session check', () => {
      const response: AuthResponse = {
        success: true,
        message: 'User is logged in',
        data: { user_id: 1, is_admin: true },
      };

      service.checkSession().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/is_logged_in`);
      req.flush(response);

      const currentUser = service.getCurrentUser();
      expect(currentUser).toBeTruthy();
      expect(currentUser?.user_id).toBe(1);
      expect(currentUser?.is_admin).toBe(true);
      expect(currentUser?.is_logged_in).toBe(true);
    });

    it('should set currentUser to null on failed session check', () => {
      const response: AuthResponse = {
        success: false,
        message: 'Not logged in',
      };

      service.checkSession().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/is_logged_in`);
      req.flush(response);

      expect(service.getCurrentUser()).toBeNull();
    });

    it('should set currentUser to null on error', () => {
      service.checkSession().subscribe({
        error: () => {
          // Handle error
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/user/is_logged_in`);
      req.error(new ErrorEvent('Network error'));

      expect(service.getCurrentUser()).toBeNull();
    });

    it('should handle missing user_id in response data', () => {
      const response: AuthResponse = {
        success: true,
        message: 'Logged in',
        data: { is_admin: false },
      };

      service.checkSession().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/is_logged_in`);
      req.flush(response);

      const currentUser = service.getCurrentUser();
      expect(currentUser?.user_id).toBe(0);
      expect(currentUser?.is_admin).toBe(false);
    });

    it('should handle missing is_admin in response data', () => {
      const response: AuthResponse = {
        success: true,
        message: 'Logged in',
        data: { user_id: 1 },
      };

      service.checkSession().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/is_logged_in`);
      req.flush(response);

      const currentUser = service.getCurrentUser();
      expect(currentUser?.is_admin).toBe(false);
    });
  });

  // Register
  describe('register()', () => {
    it('should make POST request to /user/register', () => {
      const userData: RegisterRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'ValidPassword123!',
      };

      service.register(userData).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(userData);
      expect(req.request.withCredentials).toBe(true);

      req.flush({ success: true, message: 'Registration successful' });
    });

    it('should include optional phone_number in registration', () => {
      const userData: RegisterRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'ValidPassword123!',
        phone_number: '1234567890',
      };

      service.register(userData).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/register`);
      expect(req.request.body.phone_number).toBe('1234567890');

      req.flush({ success: true, message: 'Registration successful' });
    });

    it('should return successful registration response', (done) => {
      const userData: RegisterRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'ValidPassword123!',
      };

      const expectedResponse: AuthResponse = {
        success: true,
        message: 'Registration successful',
      };

      service.register(userData).subscribe((response) => {
        expect(response).toEqual(expectedResponse);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/user/register`);
      req.flush(expectedResponse);
    });

    it('should return failed registration response', (done) => {
      const userData: RegisterRequest = {
        name: 'John Doe',
        email: 'existing@example.com',
        password: 'ValidPassword123!',
      };

      const expectedResponse: AuthResponse = {
        success: false,
        message: 'Email already registered',
      };

      service.register(userData).subscribe((response) => {
        expect(response.success).toBe(false);
        expect(response.message).toBe('Email already registered');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/user/register`);
      req.flush(expectedResponse);
    });

    it('should throw error on network failure', (done) => {
      const userData: RegisterRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'ValidPassword123!',
      };

      service.register(userData).subscribe({
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/user/register`);
      req.error(new ErrorEvent('Network error'));
    });
  });

  // Login
  describe('login()', () => {
    it('should make POST request to /user/login', () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };

      service.login(credentials).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      expect(req.request.withCredentials).toBe(true);

      req.flush({ success: true, message: 'Login successful' });
    });

    it('should update currentUser signal on successful login', () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };

      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: false },
      };

      service.login(credentials).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/login`);
      req.flush(response);

      const currentUser = service.getCurrentUser();
      expect(currentUser).toBeTruthy();
      expect(currentUser?.user_id).toBe(1);
      expect(currentUser?.is_admin).toBe(false);
      expect(currentUser?.is_logged_in).toBe(true);
    });

    it('should not update currentUser signal on failed login', () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      const response: AuthResponse = {
        success: false,
        message: 'Invalid credentials',
      };

      service.login(credentials).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/login`);
      req.flush(response);

      expect(service.getCurrentUser()).toBeNull();
    });

    it('should return successful login response', (done) => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };

      const expectedResponse: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: false },
      };

      service.login(credentials).subscribe((response) => {
        expect(response).toEqual(expectedResponse);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/user/login`);
      req.flush(expectedResponse);
    });

    it('should distinguish between admin and non-admin users', () => {
      const credentials: LoginRequest = {
        email: 'admin@example.com',
        password: 'ValidPassword123!',
      };

      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: true },
      };

      service.login(credentials).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/login`);
      req.flush(response);

      const currentUser = service.getCurrentUser();
      expect(currentUser?.is_admin).toBe(true);
    });
  });

  // Logout
  describe('logout()', () => {
    it('should make POST request to /user/logout', () => {
      service.logout().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      expect(req.request.withCredentials).toBe(true);

      req.flush({ success: true });
    });

    it('should clear currentUser signal on logout', () => {
      // First set a user
      const loginResponse: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: false },
      };

      service.login({ email: 'test@example.com', password: 'ValidPassword123!' }).subscribe();
      let req = httpMock.expectOne(`${apiUrl}/user/login`);
      req.flush(loginResponse);

      expect(service.getCurrentUser()).toBeTruthy();

      // Now logout
      service.logout().subscribe();
      req = httpMock.expectOne(`${apiUrl}/user/logout`);
      req.flush({ success: true });

      expect(service.getCurrentUser()).toBeNull();
    });

    it('should return logout response', (done) => {
      const expectedResponse = { success: true };

      service.logout().subscribe((response) => {
        expect(response).toEqual(expectedResponse);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/user/logout`);
      req.flush(expectedResponse);
    });
  });

  // Get Current User
  describe('getCurrentUser()', () => {
    it('should return null when no user is logged in', () => {
      const currentUser = service.getCurrentUser();
      expect(currentUser).toBeNull();
    });

    it('should return current user after login', () => {
      const loginResponse: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 5, is_admin: true },
      };

      service.login({ email: 'test@example.com', password: 'ValidPassword123!' }).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/login`);
      req.flush(loginResponse);

      const currentUser = service.getCurrentUser();
      expect(currentUser?.user_id).toBe(5);
      expect(currentUser?.is_admin).toBe(true);
    });

    it('should return null after logout', () => {
      const loginResponse: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 5, is_admin: true },
      };

      service.login({ email: 'test@example.com', password: 'ValidPassword123!' }).subscribe();
      let req = httpMock.expectOne(`${apiUrl}/user/login`);
      req.flush(loginResponse);

      service.logout().subscribe();
      req = httpMock.expectOne(`${apiUrl}/user/logout`);
      req.flush({ success: true });

      expect(service.getCurrentUser()).toBeNull();
    });
  });

  // Is Logged In
  describe('isLoggedIn()', () => {
    it('should return true when user is logged in', async () => {
      const checkSessionResponse: AuthResponse = {
        success: true,
        message: 'User is logged in',
        data: { user_id: 1, is_admin: false },
      };

      const promise = service.isLoggedIn();

      // Handle both the constructor's checkSession and the method call
      const requests = httpMock.match(`${apiUrl}/user/is_logged_in`);
      requests.forEach((req) => req.flush(checkSessionResponse));

      const result = await promise;
      expect(result).toBe(true);
    });

    it('should return false when user is not logged in', async () => {
      const promise = service.isLoggedIn();

      const requests = httpMock.match(`${apiUrl}/user/is_logged_in`);
      requests.forEach((req) => req.flush({ success: false, message: 'Not logged in' }));

      const result = await promise;
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const promise = service.isLoggedIn();

      const requests = httpMock.match(`${apiUrl}/user/is_logged_in`);
      if (requests.length > 0) {
        requests[requests.length - 1].error(new ErrorEvent('Network error'));
      }

      const result = await promise;
      expect(result).toBe(false);
    });
  });

  // Is Admin
  describe('isAdmin()', () => {
    it('should return true when user is admin', async () => {
      const checkSessionResponse: AuthResponse = {
        success: true,
        message: 'User is logged in',
        data: { user_id: 1, is_admin: true },
      };

      const promise = service.isAdmin();

      const requests = httpMock.match(`${apiUrl}/user/is_logged_in`);
      requests.forEach((req) => req.flush(checkSessionResponse));

      const result = await promise;
      expect(result).toBe(true);
    });

    it('should return false when user is not admin', async () => {
      const checkSessionResponse: AuthResponse = {
        success: true,
        message: 'User is logged in',
        data: { user_id: 1, is_admin: false },
      };

      const promise = service.isAdmin();

      const requests = httpMock.match(`${apiUrl}/user/is_logged_in`);
      requests.forEach((req) => req.flush(checkSessionResponse));

      const result = await promise;
      expect(result).toBe(false);
    });

    it('should return false when not logged in', async () => {
      const promise = service.isAdmin();

      const requests = httpMock.match(`${apiUrl}/user/is_logged_in`);
      requests.forEach((req) => req.flush({ success: false, message: 'Not logged in' }));

      const result = await promise;
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const promise = service.isAdmin();

      const requests = httpMock.match(`${apiUrl}/user/is_logged_in`);
      if (requests.length > 0) {
        requests[requests.length - 1].error(new ErrorEvent('Network error'));
      }

      const result = await promise;
      expect(result).toBe(false);
    });
  });

  // Computed Signals
  describe('Computed Signals', () => {
    it('should compute userId from currentUser', () => {
      const loginResponse: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 42, is_admin: false },
      };

      service.login({ email: 'test@example.com', password: 'ValidPassword123!' }).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/login`);
      req.flush(loginResponse);

      expect(service.userId()).toBe(42);
    });

    it('should return null for userId when not logged in', () => {
      expect(service.userId()).toBeNull();
    });

    it('should update userId when currentUser changes', () => {
      const loginResponse: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: false },
      };

      service.login({ email: 'test@example.com', password: 'ValidPassword123!' }).subscribe();
      let req = httpMock.expectOne(`${apiUrl}/user/login`);
      req.flush(loginResponse);

      expect(service.userId()).toBe(1);

      service.logout().subscribe();
      req = httpMock.expectOne(`${apiUrl}/user/logout`);
      req.flush({ success: true });

      expect(service.userId()).toBeNull();
    });
  });

  // Integration Tests
  describe('Integration Tests', () => {
    it('should handle complete login flow', () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };

      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: false },
      };

      // Login
      service.login(credentials).subscribe();
      const loginReq = httpMock.expectOne(`${apiUrl}/user/login`);
      loginReq.flush(response);

      // Verify user is set
      expect(service.getCurrentUser()).toBeTruthy();
      expect(service.userId()).toBe(1);

      // Logout
      service.logout().subscribe();
      const logoutReq = httpMock.expectOne(`${apiUrl}/user/logout`);
      logoutReq.flush({ success: true });

      // Verify user is cleared
      expect(service.getCurrentUser()).toBeNull();
      expect(service.userId()).toBeNull();
    });

    it('should handle failed login followed by successful login', () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };

      // First failed login
      service.login({ ...credentials, password: 'WrongPassword' }).subscribe();
      let req = httpMock.expectOne(`${apiUrl}/user/login`);
      req.flush({ success: false, message: 'Invalid credentials' });

      expect(service.getCurrentUser()).toBeNull();

      // Then successful login
      service.login(credentials).subscribe();
      req = httpMock.expectOne(`${apiUrl}/user/login`);
      req.flush({
        success: true,
        message: 'Login successful',
        data: { user_id: 1, is_admin: false },
      });

      expect(service.getCurrentUser()).toBeTruthy();
    });
  });
});
