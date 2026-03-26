import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { getFrontendUrlWithPath } from '../config/urlConfig';

export class GoogleDriveOAuthService {
  private drive: any;
  private auth: any;

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    try {
      // Use OAuth2 client instead of service account
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || getFrontendUrlWithPath('/auth/google/callback')
      );

      // For now, we'll use the service account but with delegation
      // In production, you would implement the full OAuth flow
      const serviceAccountCredentials = {
        type: 'service_account',
        project_id: 'alien-cedar-476317-c8',
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: 'asadkhanbloch4949@alien-cedar-476317-c8.iam.gserviceaccount.com',
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/asadkhanbloch4949%40alien-cedar-476317-c8.iam.gserviceaccount.com`
      };

      this.auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive'
        ]
      });

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      console.log('✅ Google Drive OAuth Service initialized');
    } catch (error: unknown) {
      console.error('❌ Error initializing Google Drive OAuth Service:', error);
    }
  }

  async uploadFile(filePath: string, fileName: string, folderName: string = 'AestheticRxNetwork_Data'): Promise<string> {
    try {
      console.log('📤 Uploading file to Google Drive:', fileName);

      // Create folder if it doesn't exist
      const folderId = await this.createFolder(folderName);

      // Upload file
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      };

      const media = {
        mimeType: 'application/zip',
        body: fs.createReadStream(filePath)
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink'
      });

      console.log('✅ File uploaded successfully:', response.data.name);
      console.log('🔗 File URL:', response.data.webViewLink);
      
      return response.data.webViewLink;
    } catch (error: unknown) {
      console.error('❌ Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  private async createFolder(folderName: string): Promise<string> {
    try {
      // Check if folder already exists
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)'
      });

      if (response.data.files && response.data.files.length > 0) {
        console.log('📁 Folder already exists:', folderName);
        return response.data.files[0].id;
      }

      // Create new folder
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id,name'
      });

      console.log('📁 Folder created:', folderName);
      return folder.data.id;
    } catch (error: unknown) {
      console.error('❌ Error creating folder:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.drive.about.get({
        fields: 'user,storageQuota'
      });
      return true;
    } catch (error: unknown) {
      console.error('❌ Google Drive connection test failed:', error);
      return false;
    }
  }
}
