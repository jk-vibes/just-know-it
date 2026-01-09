
/**
 * Simulated Cloud Sync Service for Google Drive integration.
 * In a real environment, this would use gapi.client.drive or 
 * the Drive REST API with a valid OAuth2 access token.
 */

export interface BackupData {
  expenses: any[];
  incomes: any[];
  wealthItems: any[];
  rules: any[];
  recurringItems: any[];
  settings: any;
  timestamp: string;
}

export async function syncToGoogleDrive(accessToken: string, data: BackupData): Promise<string> {
  console.log("Initiating Cloud Backup to simulation storage...");
  
  // Simulation delay to mimic network latency (important for UX verification)
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const lastSynced = new Date().toISOString();
    
    // Persist to simulation storage (LocalDB simulation for verification)
    localStorage.setItem('jk_cloud_backup_sim', JSON.stringify({
      ...data,
      timestamp: lastSynced
    }));

    return lastSynced;
  } catch (error) {
    console.error("Cloud Sync Error:", error);
    throw new Error("Failed to sync with simulated Google Drive");
  }
}

export async function restoreFromGoogleDrive(accessToken: string): Promise<BackupData | null> {
  console.log("Checking for remote backups in simulation...");
  await new Promise(resolve => setTimeout(resolve, 1500));

  const cloudData = localStorage.getItem('jk_cloud_backup_sim');
  if (cloudData) {
    return JSON.parse(cloudData);
  }
  return null;
}
