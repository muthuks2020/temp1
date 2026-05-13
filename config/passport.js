// config/passport.js — Microsoft Azure AD SSO via passport-azure-ad
'use strict';

const passport = require('passport');
const { OIDCStrategy } = require('passport-azure-ad');
const logger = require('./logger');
const userService = require('../services/userService');

/**
 * Initialise and register the Azure AD OIDC strategy.
 * Must be called once during app startup after env vars are loaded.
 */
function configurePassport() {
  if (
    !process.env.AZURE_CLIENT_ID ||
    !process.env.AZURE_CLIENT_SECRET ||
    !process.env.AZURE_TENANT_ID ||
    !process.env.AZURE_REDIRECT_URI
  ) {
    logger.error(
      'Azure AD configuration incomplete. AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, ' +
      'AZURE_TENANT_ID, and AZURE_REDIRECT_URI must all be set.'
    );
    process.exit(1);
  }

  passport.use(
    'azuread-openidconnect',
    new OIDCStrategy(
      {
        identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
        clientID:         process.env.AZURE_CLIENT_ID,
        clientSecret:     process.env.AZURE_CLIENT_SECRET,
        responseType:     'code',
        responseMode:     'query',
        redirectUrl:      process.env.AZURE_REDIRECT_URI,
        allowHttpForRedirectUrl: process.env.NODE_ENV !== 'production',
        scope:            ['profile', 'email', 'openid'],
        loggingLevel:     process.env.NODE_ENV === 'development' ? 'info' : 'error',
        passReqToCallback: true,
      },
      async (req, iss, sub, profile, accessToken, refreshToken, done) => {
        try {
          // Extract claims from Azure token profile
          const azureOid = profile.oid || profile._json?.oid;
          const email =
            profile._json?.preferred_username ||
            profile._json?.email ||
            (profile.emails && profile.emails[0]) ||
            '';
          const name =
            profile.displayName ||
            profile._json?.name ||
            profile.name?.givenName + ' ' + profile.name?.familyName ||
            email;

          if (!azureOid || !email) {
            logger.warn('Azure AD callback missing oid or email', {
              oid: azureOid,
              email,
            });
            return done(null, false, { message: 'Invalid Azure AD token — missing required claims.' });
          }

          // Upsert user — insert on first login, update name on re-login
          const user = await userService.upsertAzureUser({ azureOid, email, name });

          logger.info('Azure AD login successful', {
            userId: user.id,
            email: user.email,
            status: user.status,
          });

          return done(null, user);
        } catch (err) {
          logger.error('Azure AD strategy error', { error: err.message, stack: err.stack });
          return done(err);
        }
      }
    )
  );

  // Minimal session serialisation — we use JWT cookies, not passport sessions.
  // These are kept for passport compatibility but sessions are not the auth mechanism.
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await userService.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

module.exports = { configurePassport };
