/**
 * Bookmark Request Validation
 * 
 * Validates incoming bookmark creation requests.
 * Returns validation errors if the request is invalid.
 */

import type { CreateBookmarkRequest, ValidationError } from '../../types/bookmark';

/**
 * Maximum field lengths
 */
const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_SUMMARY_LENGTH = 10000;
const MAX_TAG_LENGTH = 100;
const MAX_TAGS_COUNT = 20;

/**
 * URL validation regex
 * Matches http:// or https:// URLs
 */
const URL_REGEX = /^https?:\/\/.+/i;

/**
 * Result of validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: CreateBookmarkRequest;
}

/**
 * Validate a bookmark creation request
 */
export function validateCreateBookmarkRequest(body: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check if body is an object
  if (typeof body !== 'object' || body === null) {
    return {
      valid: false,
      errors: [{ field: 'body', message: 'Request body must be a JSON object' }],
    };
  }
  
  const data = body as Record<string, unknown>;
  
  // Validate url (required, must be valid URL format)
  if (!data.url) {
    errors.push({ field: 'url', message: 'url is required' });
  } else if (typeof data.url !== 'string') {
    errors.push({ field: 'url', message: 'url must be a string' });
  } else if (!URL_REGEX.test(data.url)) {
    errors.push({ field: 'url', message: 'url must be a valid URL (http:// or https://)' });
  } else if (data.url.length > MAX_URL_LENGTH) {
    errors.push({ field: 'url', message: `url must be at most ${MAX_URL_LENGTH} characters` });
  }
  
  // Validate title (required)
  if (!data.title) {
    errors.push({ field: 'title', message: 'title is required' });
  } else if (typeof data.title !== 'string') {
    errors.push({ field: 'title', message: 'title must be a string' });
  } else if (data.title.length > MAX_TITLE_LENGTH) {
    errors.push({ field: 'title', message: `title must be at most ${MAX_TITLE_LENGTH} characters` });
  }
  
  // Validate description (optional)
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push({ field: 'description', message: 'description must be a string' });
    } else if (data.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push({ field: 'description', message: `description must be at most ${MAX_DESCRIPTION_LENGTH} characters` });
    }
  }
  
  // Validate summary (required)
  if (!data.summary) {
    errors.push({ field: 'summary', message: 'summary is required' });
  } else if (typeof data.summary !== 'string') {
    errors.push({ field: 'summary', message: 'summary must be a string' });
  } else if (data.summary.length > MAX_SUMMARY_LENGTH) {
    errors.push({ field: 'summary', message: `summary must be at most ${MAX_SUMMARY_LENGTH} characters` });
  }
  
  // Validate summary_zh (required)
  if (!data.summary_zh) {
    errors.push({ field: 'summary_zh', message: 'summary_zh is required' });
  } else if (typeof data.summary_zh !== 'string') {
    errors.push({ field: 'summary_zh', message: 'summary_zh must be a string' });
  } else if (data.summary_zh.length > MAX_SUMMARY_LENGTH) {
    errors.push({ field: 'summary_zh', message: `summary_zh must be at most ${MAX_SUMMARY_LENGTH} characters` });
  }
  
  // Validate tags (required, must be array)
  if (data.tags === undefined) {
    errors.push({ field: 'tags', message: 'tags is required' });
  } else if (!Array.isArray(data.tags)) {
    errors.push({ field: 'tags', message: 'tags must be an array' });
  } else {
    if (data.tags.length > MAX_TAGS_COUNT) {
      errors.push({ field: 'tags', message: `tags must have at most ${MAX_TAGS_COUNT} items` });
    }
    
    for (let i = 0; i < data.tags.length; i++) {
      const tag = data.tags[i];
      if (typeof tag !== 'string') {
        errors.push({ field: `tags[${i}]`, message: 'each tag must be a string' });
      } else if (tag.length === 0) {
        errors.push({ field: `tags[${i}]`, message: 'tags cannot be empty strings' });
      } else if (tag.length > MAX_TAG_LENGTH) {
        errors.push({ field: `tags[${i}]`, message: `each tag must be at most ${MAX_TAG_LENGTH} characters` });
      }
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Build validated request object
  const validatedRequest: CreateBookmarkRequest = {
    url: data.url as string,
    title: data.title as string,
    description: data.description as string | undefined,
    summary: data.summary as string,
    summary_zh: data.summary_zh as string,
    tags: data.tags as string[],
  };
  
  return {
    valid: true,
    errors: [],
    data: validatedRequest,
  };
}

/**
 * Validate URL query parameter for GET requests
 */
export function validateUrlQueryParam(url: string | null): ValidationResult {
  if (!url) {
    return {
      valid: false,
      errors: [{ field: 'url', message: 'url query parameter is required' }],
    };
  }
  
  if (!URL_REGEX.test(url)) {
    return {
      valid: false,
      errors: [{ field: 'url', message: 'url must be a valid URL (http:// or https://)' }],
    };
  }
  
  return { valid: true, errors: [] };
}
