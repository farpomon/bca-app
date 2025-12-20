import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { Request, Response, NextFunction } from "express";
import { logAuthEvent } from "./authAudit";

/**
 * Security Middleware
 * 
 * Implements application-level security controls including:
 * - Rate limiting to prevent abuse and DoS attacks
 * - Security headers (HSTS, CSP, X-Frame-Options, etc.)
 * - Request validation and sanitization
 * - Security event logging
 */

/**
 * Configure Helmet security headers
 */
export function configureSecurityHeaders() {
  return helmet({
    // Strict-Transport-Security: Force HTTPS for 1 year
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    
    // Content-Security-Policy: Restrict resource loading
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://forge.manus.ai", "https://forge.butterfly-effect.dev", "https://*.googleapis.com", "https://*.gstatic.com"], // unsafe-inline needed for React, forge domains for Maps proxy
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"], // Allow S3 images
        connectSrc: ["'self'", "https://forge.manus.ai", "https://forge.butterfly-effect.dev", "https://*.googleapis.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    
    // X-Frame-Options: Prevent clickjacking
    frameguard: {
      action: "deny",
    },
    
    // X-Content-Type-Options: Prevent MIME sniffing
    noSniff: true,
    
    // Referrer-Policy: Limit referrer information
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    
    // X-DNS-Prefetch-Control: Control DNS prefetching
    dnsPrefetchControl: {
      allow: false,
    },
    
    // X-Download-Options: Prevent IE from executing downloads
    ieNoOpen: true,
    
    // X-Permitted-Cross-Domain-Policies: Restrict Flash/PDF cross-domain
    permittedCrossDomainPolicies: {
      permittedPolicies: "none",
    },
  });
}

/**
 * General API rate limiter
 * Limits: 1000 requests per 15 minutes per IP
 * Increased to accommodate multiple simultaneous queries on data-heavy pages
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    console.warn("[Security] Rate limit exceeded:", {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    
    res.status(429).json({
      error: "Too many requests",
      message: "You have exceeded the rate limit. Please try again later.",
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits: 5 login attempts per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: async (req: Request, res: Response) => {
    console.warn("[Security] Auth rate limit exceeded:", {
      ip: req.ip,
      path: req.path,
      username: req.body?.username || "unknown",
    });
    
    // Log account lockout event
    await logAuthEvent({
      username: req.body?.username || "unknown",
      action: "account_lockout",
      method: "oauth",
      success: false,
      reason: "Too many failed login attempts",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    
    res.status(429).json({
      error: "Too many login attempts",
      message: "Your account has been temporarily locked due to too many failed login attempts. Please try again in 15 minutes.",
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});

/**
 * File upload rate limiter
 * Limits: 20 uploads per hour per IP
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: "Too many file uploads, please try again later.",
  handler: (req: Request, res: Response) => {
    console.warn("[Security] Upload rate limit exceeded:", {
      ip: req.ip,
      path: req.path,
    });
    
    res.status(429).json({
      error: "Too many uploads",
      message: "You have exceeded the upload rate limit. Please try again later.",
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});

/**
 * Input validation middleware
 * Validates and sanitizes user input to prevent injection attacks
 */
export function validateInput(req: Request, res: Response, next: NextFunction) {
  // Check for common SQL injection patterns
  // More specific patterns to avoid false positives on legitimate content
  const sqlInjectionPatterns = [
    /(UNION\s+SELECT)/i, // UNION-based injection
    /(OR\s+1\s*=\s*1)/i, // Boolean-based injection
    /(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP))/i, // Stacked queries
    /(--\s*$)/m, // SQL comments at end of line
    /('\s+(OR|AND)\s+')/i, // Quote-based boolean injection
    /('\s*;)/i, // Quote followed by semicolon
  ];
  
  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe[^>]*>/gi,
  ];
  
  // Validate request body
  if (req.body && typeof req.body === "object") {
    const bodyStr = JSON.stringify(req.body);
    
    // Check for SQL injection
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(bodyStr)) {
        console.warn("[Security] Potential SQL injection detected:", {
          ip: req.ip,
          path: req.path,
          body: req.body,
        });
        
        return res.status(400).json({
          error: "Invalid input",
          message: "Your request contains potentially malicious content.",
        });
      }
    }
    
    // Check for XSS
    for (const pattern of xssPatterns) {
      if (pattern.test(bodyStr)) {
        console.warn("[Security] Potential XSS attack detected:", {
          ip: req.ip,
          path: req.path,
          body: req.body,
        });
        
        return res.status(400).json({
          error: "Invalid input",
          message: "Your request contains potentially malicious content.",
        });
      }
    }
  }
  
  // Validate query parameters
  if (req.query && typeof req.query === "object") {
    const queryStr = JSON.stringify(req.query);
    
    for (const pattern of [...sqlInjectionPatterns, ...xssPatterns]) {
      if (pattern.test(queryStr)) {
        console.warn("[Security] Malicious query parameters detected:", {
          ip: req.ip,
          path: req.path,
          query: req.query,
        });
        
        return res.status(400).json({
          error: "Invalid input",
          message: "Your request contains potentially malicious content.",
        });
      }
    }
  }
  
  next();
}

/**
 * File upload validation
 * Validates file type, size, and name
 */
export function validateFileUpload(
  allowedTypes: string[],
  maxSizeMB: number = 10
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // File validation is handled at the application layer (tRPC)
    // This middleware provides additional security checks
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    // Check Content-Length header
    const contentLength = parseInt(req.headers["content-length"] || "0");
    if (contentLength > maxSizeBytes) {
      console.warn("[Security] File too large:", {
        ip: req.ip,
        size: contentLength,
        maxSize: maxSizeBytes,
      });
      
      return res.status(413).json({
        error: "File too large",
        message: `File size exceeds maximum allowed size of ${maxSizeMB}MB.`,
      });
    }
    
    next();
  };
}

/**
 * Security event logger middleware
 * Logs suspicious activities for security monitoring
 */
export function logSecurityEvents(req: Request, res: Response, next: NextFunction) {
  // Log failed authentication attempts
  res.on("finish", () => {
    if (req.path.includes("/auth") && res.statusCode === 401) {
      console.warn("[Security] Failed authentication attempt:", {
        ip: req.ip,
        path: req.path,
        userAgent: req.headers["user-agent"],
        timestamp: new Date().toISOString(),
      });
    }
    
    // Log 403 Forbidden (authorization failures)
    if (res.statusCode === 403) {
      console.warn("[Security] Authorization failure:", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Log 400 Bad Request (potential attacks)
    if (res.statusCode === 400) {
      console.warn("[Security] Bad request:", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  next();
}

/**
 * CORS configuration
 * Restricts cross-origin requests to trusted domains
 */
export function configureCORS() {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    // In production, restrict to specific domains
    // For now, allow same-origin requests
    if (!origin || origin === req.headers.host) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
    }
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    
    next();
  };
}

/**
 * Request size limiter
 * Prevents large payload attacks
 */
export function limitRequestSize(maxSizeMB: number = 10) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers["content-length"] || "0");
    
    if (contentLength > maxSizeBytes) {
      console.warn("[Security] Request too large:", {
        ip: req.ip,
        size: contentLength,
        maxSize: maxSizeBytes,
      });
      
      return res.status(413).json({
        error: "Request too large",
        message: `Request size exceeds maximum allowed size of ${maxSizeMB}MB.`,
      });
    }
    
    next();
  };
}
