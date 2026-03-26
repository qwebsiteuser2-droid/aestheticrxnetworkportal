import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

export class GoogleDriveService {
  private drive: any;
  private auth: any;

  constructor() {
    this.initializeAuth();
  }

  isConfigured(): boolean {
    return !!(process.env.GOOGLE_PRIVATE_KEY_ID && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_ID);
  }

  private initializeAuth() {
    try {
      // Try to load from JSON file first, fallback to environment variables
      let credentials;
      
      try {
        const serviceAccountPath = path.join('/app', 'service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
          const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
          credentials = JSON.parse(serviceAccountData);
          console.log('📁 Using service account JSON file');
        } else {
          throw new Error('Service account file not found');
        }
      } catch (fileError) {
        console.log('📁 Service account file not found, using environment variables');
        // Fallback to environment variables
        const privateKeyId = process.env.GOOGLE_PRIVATE_KEY_ID;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY;
        const clientId = process.env.GOOGLE_CLIENT_ID;
        
        if (!privateKeyId || !privateKey || !clientId) {
          console.warn('⚠️ Google Drive credentials not fully configured. Google Drive features will be disabled.');
          this.auth = null;
          this.drive = null;
          return;
        }
        
        credentials = {
          type: 'service_account',
          project_id: 'alien-cedar-476317-c8',
          private_key_id: privateKeyId,
          private_key: privateKey.replace(/\\n/g, '\n'),
          client_email: 'asadkhanbloch4949@alien-cedar-476317-c8.iam.gserviceaccount.com',
          client_id: clientId,
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/asadkhanbloch4949%40alien-cedar-476317-c8.iam.gserviceaccount.com`
        };
      }

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive'
        ]
      });

      if (this.auth) {
        this.drive = google.drive({ version: 'v3', auth: this.auth });
        console.log('✅ Google Drive Service initialized successfully');
      } else {
        console.warn('⚠️ Google Drive auth not initialized - service will be disabled');
        this.drive = null;
      }
    } catch (error: unknown) {
      console.error('❌ Error initializing Google Drive auth:', error);
      // Don't throw - allow service to continue without Google Drive
      this.auth = null;
      this.drive = null;
    }
  }

  async uploadFile(filePath: string, fileName: string, folderName: string = 'BioAestheticAx Network_Exports'): Promise<string> {
    if (!this.drive || !this.auth) {
      throw new Error('Google Drive service is not configured. Please set GOOGLE_PRIVATE_KEY_ID, GOOGLE_PRIVATE_KEY, and GOOGLE_CLIENT_ID environment variables.');
    }
    
    try {
      console.log('📤 ========== GOOGLE DRIVE UPLOAD START ==========');
      console.log('📤 File name:', fileName);
      console.log('📤 Folder name:', folderName);
      console.log('📤 File path:', filePath);
      console.log('📤 File exists:', fs.existsSync(filePath));

      // Ensure folder exists first
      const folderId = await this.ensureFolderExists(folderName);
      console.log('📤 Folder ID:', folderId);
      
      if (!folderId) {
        throw new Error(`Failed to create or find folder: ${folderName}`);
      }

      // Upload file
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      };

      const media = {
        mimeType: 'application/zip',
        body: fs.createReadStream(filePath)
      };

      console.log('📤 Creating file in Google Drive...');
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink,webContentLink'
      });

      console.log('✅ File uploaded successfully!');
      console.log('✅ File ID:', response.data.id);
      console.log('✅ File name:', response.data.name);
      console.log('🔗 File webViewLink:', response.data.webViewLink);
      console.log('🔗 File webContentLink:', response.data.webContentLink);
      console.log('📤 ========== GOOGLE DRIVE UPLOAD COMPLETE ==========');
      
      return response.data.webViewLink || response.data.webContentLink || `https://drive.google.com/file/d/${response.data.id}/view`;
    } catch (error: unknown) {
      console.error('❌ Error uploading file to Google Drive:', error);
      
      // If it's a quota error, provide a helpful message
      if (error instanceof Error && (error instanceof Error ? error.message : String(error)) && (error instanceof Error ? error.message : String(error)).includes('Service Accounts do not have storage quota')) {
        console.log('💡 Solution: Service accounts need to be granted access to a shared drive or use OAuth delegation');
        console.log('📁 For now, files will be available for download only');
        throw new Error('Service account storage quota exceeded. Please configure OAuth delegation or shared drive access.');
      }
      
      throw error;
    }
  }

  private async findOrCreateSharedDrive(): Promise<string | null> {
    try {
      // List shared drives
      const response = await this.drive.drives.list({
        fields: 'drives(id, name)'
      });

      if (response.data.drives && response.data.drives.length > 0) {
        // Look for our specific shared drive
        const qWebsiteDrive = response.data.drives.find((drive: any) => 
          drive.name === 'BioAestheticAx Network_Data' || drive.name === 'BioAestheticAx Network_Data_Shared'
        );
        
        if (qWebsiteDrive) {
          console.log('📁 Found BioAestheticAx Network_Data shared drive:', qWebsiteDrive.name);
          return qWebsiteDrive.id;
        }
        
        // Use the first available shared drive
        console.log('📁 Found shared drive:', response.data.drives[0].name);
        return response.data.drives[0].id;
      }

      // Try to create a shared drive
      try {
        const sharedDriveMetadata = {
          name: 'BioAestheticAx Network_Data',
          capabilities: {
            canAddChildren: true,
            canDeleteChildren: true,
            canRename: true
          }
        };

        const sharedDrive = await this.drive.drives.create({
          requestBody: sharedDriveMetadata,
          fields: 'id,name'
        });

        console.log('📁 Created shared drive:', sharedDrive.data.name);
        return sharedDrive.data.id;
      } catch (createError) {
        console.log('📁 Could not create shared drive, using personal drive');
        console.log('💡 Please create a shared drive named "BioAestheticAx Network_Data" and add the service account as a member');
        return null;
      }
    } catch (error: unknown) {
      console.log('📁 Could not access shared drives, using personal drive');
      console.log('💡 Please create a shared drive named "BioAestheticAx Network_Data" and add the service account as a member');
      return null;
    }
  }

  private async createFolder(folderName: string, sharedDriveId?: string | null): Promise<string> {
    try {
      console.log(`📁 Creating/finding folder: ${folderName}`);
      
      // Build query for folder search - search in My Drive (not just shared drives)
      let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      // Check if folder already exists (search in My Drive)
      const searchResponse = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        const existingFolder = searchResponse.data.files[0];
        console.log(`📁 Folder '${folderName}' already exists with ID: ${existingFolder.id}`);
        return existingFolder.id;
      }

      // Create new folder in My Drive (not in shared drive if not available)
      const folderMetadata: any = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };
      
      // Only add parent if we have a shared drive
      if (sharedDriveId) {
        folderMetadata.parents = [sharedDriveId];
      }

      console.log(`📁 Creating new folder: ${folderName}`);
      const createOptions: any = {
        requestBody: folderMetadata,
        fields: 'id,name,webViewLink'
      };
      
      if (sharedDriveId) {
        createOptions.supportsAllDrives = true;
      }

      const folder = await this.drive.files.create(createOptions);

      console.log(`✅ Folder '${folderName}' created successfully with ID: ${folder.data.id}`);
      if (folder.data.webViewLink) {
        console.log(`🔗 Folder URL: ${folder.data.webViewLink}`);
      }
      return folder.data.id;
    } catch (error: unknown) {
      console.error(`❌ Error creating folder '${folderName}':`, error);
      console.error('Error details:', error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Ensure a folder exists, create it if it doesn't
   */
  async ensureFolderExists(folderName: string = 'BioAestheticAx Network_Exports'): Promise<string | null> {
    if (!this.drive || !this.auth) {
      throw new Error('Google Drive service is not configured.');
    }
    
    try {
      console.log(`📁 Ensuring folder '${folderName}' exists...`);
      
      // Try to find or create shared drive first (optional, can work without it)
      let sharedDriveId: string | null = null;
      try {
        sharedDriveId = await this.findOrCreateSharedDrive();
      } catch (sharedDriveError) {
        console.log('⚠️ Could not find/create shared drive, will create folder in My Drive:', sharedDriveError);
        // Continue without shared drive - folder will be created in My Drive
      }
      
      // Use the createFolder method which handles existence check and creation
      const folderId = await this.createFolder(folderName, sharedDriveId);
      console.log(`✅ Folder '${folderName}' ensured to exist with ID: ${folderId}`);
      return folderId;
    } catch (error: unknown) {
      console.error(`❌ Error ensuring folder '${folderName}' exists:`, error);
      throw error;
    }
  }

  async getFolderContents(folderName: string = 'BioAestheticAx Network_Exports'): Promise<any[]> {
    if (!this.drive || !this.auth) {
      throw new Error('Google Drive service is not configured.');
    }
    
    try {
      // First, ensure the folder exists
      await this.ensureFolderExists(folderName);
      
      // Now get the folder contents
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)'
      });

      if (!response.data.files || response.data.files.length === 0) {
        console.log(`⚠️ Folder '${folderName}' not found after creation attempt`);
        return [];
      }

      const folderId = response.data.files[0].id;
      const contents = await this.drive.files.list({
        q: `'${folderId}' in parents`,
        fields: 'files(id, name, createdTime, size, webViewLink)'
      });

      return contents.data.files || [];
    } catch (error: unknown) {
      console.error('❌ Error getting folder contents:', error);
      return [];
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await this.drive.files.delete({
        fileId: fileId
      });
      console.log('🗑️ File deleted:', fileId);
      return true;
    } catch (error: unknown) {
      console.error('❌ Error deleting file:', error);
      return false;
    }
  }

  async getFileInfo(fileId: string): Promise<any> {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,size,createdTime,webViewLink'
      });
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Error getting file info:', error);
      return null;
    }
  }
}

export default GoogleDriveService;
