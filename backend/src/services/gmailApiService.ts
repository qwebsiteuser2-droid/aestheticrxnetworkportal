import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Retry configuration for email sending
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const EMAIL_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 2000,   // 2 seconds initial delay (increased for slow connections)
  maxDelayMs: 15000,      // 15 seconds max delay
  backoffMultiplier: 2,   // Double the delay each retry
};

/**
 * Calculate delay for retry attempt using exponential backoff
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toString()?.toLowerCase() || '';
  
  // Non-retryable errors
  const nonRetryablePatterns = [
    'invalid_grant',
    'invalid credentials',
    'unauthorized',
    'invalid email',
    'address rejected',
  ];
  
  for (const pattern of nonRetryablePatterns) {
    if (errorMessage.includes(pattern) || errorCode.includes(pattern)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Execute a function with retry logic
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = EMAIL_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (attempt > config.maxRetries || !isRetryableError(error)) {
        console.error(`❌ ${operationName} failed after ${attempt} attempt(s):`, error?.message || error);
        throw error;
      }
      
      const delay = calculateRetryDelay(attempt, config);
      console.warn(`⚠️ ${operationName} attempt ${attempt} failed: ${error?.message || 'Unknown error'}`);
      console.log(`🔄 Retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries + 1})...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error(`${operationName} failed after all retries`);
}

/**
 * Gmail API Service using OAuth 2.0
 * Handles authentication and email sending via Gmail API
 */
class GmailApiService {
  private oauth2Client: OAuth2Client | null = null;
  private gmail: any = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Gmail API client with OAuth 2.0 credentials
   */
  private initialize(): void {
    const clientId = process.env.GMAIL_API_CLIENT_ID;
    const clientSecret = process.env.GMAIL_API_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_API_REFRESH_TOKEN;
    const userEmail = process.env.GMAIL_API_USER_EMAIL;

    if (!clientId || !clientSecret || !refreshToken || !userEmail) {
      console.log('⚠️ Gmail API credentials not fully configured');
      console.log('   Missing:', {
        clientId: !clientId,
        clientSecret: !clientSecret,
        refreshToken: !refreshToken,
        userEmail: !userEmail
      });
      return;
    }

    try {
      // Create OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'urn:ietf:wg:oauth:2.0:oob' // Out-of-band redirect (for server-to-server)
      );

      // Set credentials with refresh token.
      // IMPORTANT: GMAIL_API_REFRESH_TOKEN must be generated with ONLY the
      // https://www.googleapis.com/auth/gmail.send scope (not https://mail.google.com/).
      // Using the full mail.google.com scope is a RESTRICTED scope requiring a Google security audit.
      // Re-generate at: https://developers.google.com/oauthplayground
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      // Create Gmail API client
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      this.isInitialized = true;
      console.log('✅ Gmail API initialized successfully');
    } catch (error: unknown) {
      console.error('❌ Failed to initialize Gmail API:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if Gmail API is configured and ready
   */
  isConfigured(): boolean {
    return this.isInitialized && !!this.gmail && !!this.oauth2Client;
  }

  /**
   * Refresh access token if needed
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.oauth2Client) {
      throw new Error('Gmail API OAuth2 client not initialized');
    }

    try {
      // Get current credentials
      const credentials = await this.oauth2Client.getAccessToken();
      
      // If token is expired or missing, refresh it
      if (!credentials.token) {
        await this.oauth2Client.refreshAccessToken();
      }
    } catch (error: unknown) {
      console.error('❌ Error refreshing access token:', error);
      // Try to re-initialize
      this.initialize();
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Create email message in RFC 2822 format
   */
  private createMessage(
    to: string | string[],
    subject: string,
    htmlContent: string,
    fromEmail: string,
    attachments?: Array<{ filename: string; content: Buffer | string; contentType: string }>,
    customHeaders?: { [key: string]: string }
  ): string {
    const toArray = Array.isArray(to) ? to : [to];
    const toHeader = toArray.join(', ');

    // Create email headers
    const headers: string[] = [
      `To: ${toHeader}`,
      `From: ${fromEmail}`,
      `Subject: ${subject}`
    ];

    // Add custom headers if provided (e.g., List-Unsubscribe)
    if (customHeaders) {
      for (const [key, value] of Object.entries(customHeaders)) {
        headers.push(`${key}: ${value}`);
      }
    }

    // Handle attachments if provided
    if (attachments && attachments.length > 0) {
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      headers.push(`MIME-Version: 1.0`);
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      
      let body = `\n--${boundary}\n`;
      body += `Content-Type: text/html; charset=utf-8\n`;
      body += `Content-Transfer-Encoding: 7bit\n\n`;
      body += `${htmlContent}\n`;

      // Add attachments
      for (const attachment of attachments) {
        const content = typeof attachment.content === 'string' 
          ? Buffer.from(attachment.content, 'base64')
          : attachment.content;
        
        body += `\n--${boundary}\n`;
        body += `Content-Type: ${attachment.contentType}\n`;
        body += `Content-Disposition: attachment; filename="${attachment.filename}"\n`;
        body += `Content-Transfer-Encoding: base64\n\n`;
        body += `${content.toString('base64')}\n`;
      }

      body += `\n--${boundary}--\n`;
      return headers.join('\n') + body;
    } else {
      // Simple HTML email without attachments
      headers.push(`MIME-Version: 1.0`);
      headers.push(`Content-Type: text/html; charset=utf-8`);
      return headers.join('\n') + '\n\n' + htmlContent;
    }
  }

  /**
   * Send email using Gmail API
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    htmlContent: string,
    fromEmail?: string,
    attachments?: Array<{ filename: string; content: Buffer | string; contentType: string }>,
    customHeaders?: { [key: string]: string }
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Gmail API not configured. Check GMAIL_API_* environment variables.');
    }

    try {
      // Ensure we have a valid access token
      await this.ensureValidToken();

      // Get sender email from env or parameter
      const senderEmail = fromEmail || process.env.GMAIL_API_USER_EMAIL;
      if (!senderEmail) {
        throw new Error('Sender email not configured. Set GMAIL_API_USER_EMAIL or provide fromEmail parameter.');
      }

      // Create message with custom headers
      const message = this.createMessage(to, subject, htmlContent, senderEmail, attachments, customHeaders);

      // Encode message in base64url format (Gmail API requirement)
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email via Gmail API with retry logic (3 retries with exponential backoff)
      const response = await withRetry(
        async () => {
          return await this.gmail.users.messages.send({
            userId: 'me',
            requestBody: {
              raw: encodedMessage
            }
          });
        },
        `Gmail API send to ${Array.isArray(to) ? to.join(', ') : to}`,
        EMAIL_RETRY_CONFIG
      );

      console.log('✅ Email sent via Gmail API:', {
        messageId: response.data.id,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject
      });

      return;
    } catch (error: unknown) {
      console.error('❌ Gmail API send error:', error);
      
      // Provide more detailed error information
      if (error instanceof Error) {
        if (error.message.includes('invalid_grant')) {
          throw new Error('Gmail API: Refresh token expired or invalid. Please regenerate refresh token.');
        } else if (error.message.includes('quota')) {
          throw new Error('Gmail API: Daily quota exceeded. Please try again later.');
        } else if (error.message.includes('unauthorized')) {
          throw new Error('Gmail API: Unauthorized. Please check OAuth credentials.');
        }
      }
      
      throw error;
    }
  }
}

// Export singleton instance
export const gmailApiService = new GmailApiService();
export default gmailApiService;
