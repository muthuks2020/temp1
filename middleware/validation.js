// middleware/validation.js — express-validator wrapper
'use strict';

const { validationResult, param } = require('express-validator');

/**
 * validateRequest
 * Runs the provided array of express-validator checks.
 * On failure, returns 422 with a structured error array.
 * On success, calls next().
 *
 * Usage:
 *   router.post('/path', validateRequest([
 *     body('email').isEmail().withMessage('Must be a valid email address'),
 *   ]), controller);
 */
function validateRequest(checks) {
  return [
    ...checks,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          error:   true,
          message: 'Validation failed.',
          code:    'VALIDATION_ERROR',
          details: errors.array().map((e) => ({
            field:   e.path || e.param || e.type,
            message: e.msg,
          })),
        });
      }
      return next();
    },
  ];
}

/**
 * Reusable UUID param validator.
 * Usage: validateRequest([isUuidParam('id')])
 */
function isUuidParam(paramName) {
  return param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`);
}

module.exports = { validateRequest, isUuidParam };
