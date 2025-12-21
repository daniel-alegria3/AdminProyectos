const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Create a mock request and response for testing
const createMockReqRes = () => {
  const req = {
    session: {},
    body: {},
  };
  
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
  };
  
  return { req, res };
};

describe('User Authentication Middleware', () => {
  let userAuth;
  
  beforeEach(() => {
    jest.resetModules();
    jest.unmock('../../middlewares/userAuth');
    userAuth = require('../../middlewares/userAuth');
  });
  
  describe('requireLogin middleware', () => {
    it('should return 401 when user is not logged in', () => {
      const { req, res } = createMockReqRes();
      const next = jest.fn();
      
      userAuth.requireLogin(req, res, next);
      
      expect(res.statusCode).toBe(401);
      expect(res.jsonData.success).toBe(false);
      expect(res.jsonData.message).toBe('No ha iniciado sesion');
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should call next() when user is logged in', () => {
      const { req, res } = createMockReqRes();
      req.session.user_id = 1;
      const next = jest.fn();
      
      userAuth.requireLogin(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('requireAdmin middleware', () => {
    it('should return 401 when user is not admin', () => {
      const { req, res } = createMockReqRes();
      const next = jest.fn();
      
      userAuth.requireAdmin(req, res, next);
      
      expect(res.statusCode).toBe(401);
      expect(res.jsonData.success).toBe(false);
      expect(res.jsonData.message).toBe('Acceso denegado');
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should call next() when user is admin', () => {
      const { req, res } = createMockReqRes();
      req.session.is_admin = true;
      const next = jest.fn();
      
      userAuth.requireAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('isLoggedIn endpoint', () => {
    it('should return success false when not logged in', () => {
      const { req, res } = createMockReqRes();
      
      userAuth.isLoggedIn(req, res);
      
      expect(res.jsonData.success).toBe(false);
    });
    
    it('should return success true when logged in', () => {
      const { req, res } = createMockReqRes();
      req.session.user_id = 1;
      
      userAuth.isLoggedIn(req, res);
      
      expect(res.jsonData.success).toBe(true);
    });
  });
  
  describe('isAdmin endpoint', () => {
    it('should return success false when user is not admin', () => {
      const { req, res } = createMockReqRes();
      
      userAuth.isAdmin(req, res);
      
      expect(res.jsonData.success).toBe(false);
    });
    
    it('should return success true when user is admin', () => {
      const { req, res } = createMockReqRes();
      req.session.is_admin = true;
      
      userAuth.isAdmin(req, res);
      
      expect(res.jsonData.success).toBe(true);
    });
  });
  
  describe('init method', () => {
    it('should setup session middleware on router', () => {
      const mockRouter = {
        use: jest.fn(),
      };
      
      userAuth.init(mockRouter);
      
      expect(mockRouter.use).toHaveBeenCalled();
    });
  });
});
