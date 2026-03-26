#!/usr/bin/env ts-node
/**
 * Simple Gmail Test Email Script
 * Sends a test email to asadkhanbloch4949@gmail.com
 * 
 * Usage: npm run test:gmail:send
 */

import 'dotenv/config';
import gmailService from '../services/gmailService';
import { AppDataSource } from '../db/data-source';

const TEST_EMAIL = 'asadkhanbloch4949@gmail.com';

async function testGmailSending() {
  console.log('🧪 Testing Gmail Email Sending...\n');
  
  // Check configuration
  const hasGmailApi = !!(process.env.GMAIL_API_CLIENT_ID && process.env.GMAIL_API_CLIENT_SECRET && process.env.GMAIL_API_REFRESH_TOKEN && process.env.GMAIL_API_USER_EMAIL);
  const hasSmtp = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  
  console.log('📋 Configuration Status:');
  console.log(`   Gmail API: ${hasGmailApi ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   SMTP: ${hasSmtp ? '✅ Configured' : '❌ Not configured'}`);
  console.log('');

  if (!hasGmailApi && !hasSmtp) {
    console.error('❌ No email service configured!');
    console.error('   Please set Gmail API or SMTP credentials in environment variables.');
    process.exit(1);
  }

  try {
    // Initialize database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const timestamp = new Date().toLocaleString();
    const testSubject = `✅ Gmail Test - ${timestamp}`;
    
    const testHtmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">✅ Gmail Test Email</h1>
          <p style="margin: 10px 0 0 0;">Email Service Working!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: #d4edda; border: 2px solid #28a745; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h2 style="margin: 0; color: #155724;">🎉 Success!</h2>
            <p style="margin: 10px 0 0 0; color: #155724;">Your email service is working correctly!</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">📧 Test Details:</h3>
            <p><strong>Recipient:</strong> ${TEST_EMAIL}</p>
            <p><strong>Sent At:</strong> ${timestamp}</p>
            <p><strong>Method:</strong> ${hasGmailApi ? 'Gmail API' : 'SMTP'}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">✅ What This Means:</h3>
            <ul style="color: #666;">
              <li>Your email service is properly configured</li>
              <li>OTP emails will be delivered successfully</li>
              <li>Order notifications will work correctly</li>
              <li>All system emails are functional</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            <p>This is a test email from BioAestheticAx Network Email Service</p>
          </div>
        </div>
      </div>
    `;

    console.log('📧 Sending test email...');
    console.log(`   To: ${TEST_EMAIL}`);
    console.log(`   Subject: ${testSubject}\n`);

    await gmailService.sendEmail(
      TEST_EMAIL,
      testSubject,
      testHtmlContent,
      {
        isMarketing: false,
        isOTP: false,
        bypassQuota: true
      }
    );

    console.log('✅ SUCCESS! Test email sent successfully!');
    console.log(`📬 Check your inbox: ${TEST_EMAIL}`);
    console.log('   (Check spam folder if not in inbox)\n');

  } catch (error: unknown) {
    console.error('❌ FAILED! Test email could not be sent\n');
    
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Unknown Error:', error);
    }
    
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Check Gmail API credentials (GMAIL_API_*)');
    console.error('   2. Verify GMAIL_API_REFRESH_TOKEN is valid');
    console.error('   3. Check GMAIL_USER and GMAIL_APP_PASSWORD for SMTP');
    console.error('');
    
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

testGmailSending()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
