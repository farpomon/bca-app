import { Strategy as SamlStrategy, type Profile, type VerifyWithRequest } from "@node-saml/passport-saml";
import { ENV } from "./env";

/**
 * SAML 2.0 Configuration for Active Directory Integration
 * 
 * This module provides SAML authentication for City employees via Active Directory SSO.
 * Falls back to Manus OAuth for external users (consultants, contractors).
 * 
 * Environment Variables Required:
 * - SAML_ENABLED: Enable/disable SAML authentication (true/false)
 * - SAML_ENTRY_POINT: Identity Provider SSO URL (e.g., https://adfs.city.gov/adfs/ls/)
 * - SAML_ISSUER: Service Provider entity ID (e.g., https://bca.city.gov)
 * - SAML_CALLBACK_URL: Assertion Consumer Service URL (e.g., https://bca.city.gov/api/auth/saml/callback)
 * - SAML_IDP_CERT: Identity Provider signing certificate (PEM format)
 * - SAML_LOGOUT_URL: Identity Provider logout URL (optional)
 */

export interface SamlConfig {
  enabled: boolean;
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
  cert: string;
  logoutUrl?: string;
}

/**
 * Get SAML configuration from environment variables
 */
export function getSamlConfig(): SamlConfig | null {
  const enabled = process.env.SAML_ENABLED === "true";
  
  if (!enabled) {
    console.log("[SAML] SAML authentication is disabled");
    return null;
  }

  const entryPoint = process.env.SAML_ENTRY_POINT;
  const issuer = process.env.SAML_ISSUER;
  const callbackUrl = process.env.SAML_CALLBACK_URL;
  const cert = process.env.SAML_IDP_CERT;

  if (!entryPoint || !issuer || !callbackUrl || !cert) {
    console.warn("[SAML] SAML is enabled but configuration is incomplete. Missing:");
    if (!entryPoint) console.warn("  - SAML_ENTRY_POINT");
    if (!issuer) console.warn("  - SAML_ISSUER");
    if (!callbackUrl) console.warn("  - SAML_CALLBACK_URL");
    if (!cert) console.warn("  - SAML_IDP_CERT");
    return null;
  }

  return {
    enabled: true,
    entryPoint,
    issuer,
    callbackUrl,
    cert,
    logoutUrl: process.env.SAML_LOGOUT_URL,
  };
}

/**
 * Create SAML strategy for Passport
 */
export function createSamlStrategy() {
  const config = getSamlConfig();
  
  if (!config) {
    throw new Error("SAML configuration is not available");
  }

  const verify: VerifyWithRequest = async (req, profile, done) => {
    try {
      // Extract user information from SAML assertion
      if (!profile) {
        return done(new Error("No profile received from SAML"));
      }
      
      const email = profile.email || profile.nameID;
      const name = profile.displayName || profile.name || profile.nameID;
      
      // Extract Active Directory attributes
      const attributes = (profile.attributes as Record<string, any>) || {};
      const department = attributes.department || null;
      const title = attributes.title || null;
      const employeeId = attributes.employeeId || profile?.nameID || email;

      // Create user object
      const user = {
        openId: `saml:${employeeId}`,
        email,
        name,
        loginMethod: "saml",
        department,
        title,
        // City employees default to "editor" role, admins promoted manually
        role: "editor" as const,
        accountStatus: "active" as const, // City employees auto-approved
      };

      console.log("[SAML] User authenticated:", { email, name, employeeId });
      
      return done(null, user);
    } catch (error) {
      console.error("[SAML] Authentication error:", error);
      return done(error as Error);
    }
  };

  // @ts-ignore - passport-saml type definitions are incomplete
  return new SamlStrategy(
    {
      entryPoint: config.entryPoint,
      issuer: config.issuer,
      callbackUrl: config.callbackUrl,
      cert: config.cert,
      // Request user attributes from Active Directory
      identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
      wantAssertionsSigned: true,
      signatureAlgorithm: "sha256",
      // Pass request to verify callback
      passReqToCallback: true,
    },
    verify
  );
}

/**
 * Generate Service Provider metadata XML
 * This XML should be provided to the City's IT department for IdP configuration
 */
export function generateServiceProviderMetadata(): string {
  const config = getSamlConfig();
  
  if (!config) {
    throw new Error("SAML configuration is not available");
  }

  return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                     entityID="${config.issuer}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService 
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${config.callbackUrl}"
      index="1"/>
    ${config.logoutUrl ? `<md:SingleLogoutService 
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="${config.logoutUrl}"/>` : ""}
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
}

/**
 * Check if SAML is enabled and properly configured
 */
export function isSamlEnabled(): boolean {
  const config = getSamlConfig();
  return config !== null && config.enabled;
}
