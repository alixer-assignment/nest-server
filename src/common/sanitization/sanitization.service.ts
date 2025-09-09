import { Injectable } from '@nestjs/common';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

@Injectable()
export class SanitizationService {
  private readonly window = new JSDOM('').window;
  private readonly purify = DOMPurify(this.window as any);

  constructor() {
    // Configure DOMPurify with strict settings
    this.purify.setConfig({
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
      KEEP_CONTENT: true, // Keep text content
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      SANITIZE_DOM: true,
      FORBID_TAGS: [
        'script',
        'object',
        'embed',
        'link',
        'style',
        'iframe',
        'form',
        'input',
        'button',
      ],
      FORBID_ATTR: [
        'onerror',
        'onload',
        'onclick',
        'onmouseover',
        'onfocus',
        'onblur',
        'onchange',
        'onsubmit',
      ],
    });
  }

  /**
   * Sanitize text input to prevent XSS attacks
   */
  sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // First, escape HTML entities
    const escaped = this.escapeHtml(input);

    // Then sanitize with DOMPurify
    const sanitized = this.purify.sanitize(escaped);

    // Additional cleanup: remove any remaining HTML-like content
    const cleaned = sanitized
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/data:/gi, '') // Remove data: protocols
      .replace(/vbscript:/gi, '') // Remove vbscript: protocols
      .trim();

    return cleaned;
  }

  /**
   * Sanitize message body specifically
   */
  sanitizeMessageBody(body: string): string {
    if (!body || typeof body !== 'string') {
      return '';
    }

    // Allow some basic formatting for messages
    const config = {
      ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'br', 'p'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      SANITIZE_DOM: true,
      FORBID_TAGS: [
        'script',
        'object',
        'embed',
        'link',
        'style',
        'iframe',
        'form',
        'input',
        'button',
        'img',
        'a',
      ],
      FORBID_ATTR: [
        'onerror',
        'onload',
        'onclick',
        'onmouseover',
        'onfocus',
        'onblur',
        'onchange',
        'onsubmit',
        'href',
        'src',
      ],
    };

    const purify = DOMPurify(this.window as any);
    purify.setConfig(config);

    const sanitized = purify.sanitize(body);

    // Additional cleanup
    const cleaned = sanitized
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();

    return cleaned;
  }

  /**
   * Sanitize room name
   */
  sanitizeRoomName(name: string): string {
    if (!name || typeof name !== 'string') {
      return '';
    }

    // Room names should be plain text only
    return this.sanitizeText(name).substring(0, 100); // Limit length
  }

  /**
   * Sanitize user input for search/filter
   */
  sanitizeSearchInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return this.sanitizeText(input).substring(0, 200); // Limit length
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, (s) => map[s]);
  }

  /**
   * Validate if input contains only safe characters
   */
  isSafeInput(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<link/i,
      /<style/i,
      /<form/i,
      /<input/i,
      /<button/i,
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Get sanitization statistics
   */
  getSanitizationStats(): {
    totalSanitizations: number;
    dangerousInputsBlocked: number;
  } {
    // In a real implementation, you'd track these metrics
    return {
      totalSanitizations: 0,
      dangerousInputsBlocked: 0,
    };
  }
}
