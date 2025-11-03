/**
 * Claim Validation
 * Business logic for validating claim data
 */

import { CLAIM_VALIDATION } from '@/constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ClaimValidator {
  /**
   * Validate claim text
   */
  validateText(text: string): ValidationResult {
    const errors: string[] = [];

    if (!text || text.trim().length === 0) {
      errors.push('Claim text is required');
    } else if (text.length < CLAIM_VALIDATION.MIN_LENGTH) {
      errors.push(`Claim text must be at least ${CLAIM_VALIDATION.MIN_LENGTH} characters`);
    } else if (text.length > CLAIM_VALIDATION.MAX_LENGTH) {
      errors.push(`Claim text must be less than ${CLAIM_VALIDATION.MAX_LENGTH} characters`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate confidence score
   */
  validateConfidence(confidence: number): ValidationResult {
    const errors: string[] = [];

    if (confidence < CLAIM_VALIDATION.MIN_CONFIDENCE || confidence > CLAIM_VALIDATION.MAX_CONFIDENCE) {
      errors.push(`Confidence must be between ${CLAIM_VALIDATION.MIN_CONFIDENCE} and ${CLAIM_VALIDATION.MAX_CONFIDENCE}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate entire claim
   */
  validate(claim: { text: string; confidence?: number }): ValidationResult {
    const textValidation = this.validateText(claim.text);
    const errors = [...textValidation.errors];

    if (claim.confidence !== undefined) {
      const confidenceValidation = this.validateConfidence(claim.confidence);
      errors.push(...confidenceValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
