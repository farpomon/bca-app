/**
 * Autodesk Platform Services (APS) Authentication Helper
 * 
 * Provides authentication and token management for APS API access.
 * Credentials are automatically injected from environment variables.
 */

interface ApsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ApsAuthResult {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Get a 2-legged OAuth token for APS API access
 * This token is used for server-side operations like model translation
 * 
 * @param scopes - Array of scopes to request (default: ['data:read', 'data:write', 'bucket:read', 'bucket:create'])
 * @returns Promise with access token and expiration info
 */
export async function getApsToken(
  scopes: string[] = ['data:read', 'data:write', 'bucket:read', 'bucket:create']
): Promise<ApsAuthResult> {
  const clientId = process.env.APS_CLIENT_ID;
  const clientSecret = process.env.APS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('APS credentials not configured. Please set APS_CLIENT_ID and APS_CLIENT_SECRET environment variables.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: scopes.join(' '),
  });

  const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`APS authentication failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: ApsTokenResponse = await response.json();

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

/**
 * Get a public token for client-side Forge Viewer
 * This token has limited read-only access for viewing models
 * 
 * @returns Promise with access token for viewer
 */
export async function getApsViewerToken(): Promise<string> {
  const result = await getApsToken(['viewables:read']);
  return result.accessToken;
}
