import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.join(__dirname, '../../logs');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export const readLogFile = (fileName: string): any[] => {
  const filePath = path.join(LOGS_DIR, fileName);
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8') || '[]');
  } catch (error) {
    console.error(`[LOGGER] Erreur lecture ${fileName}:`, error);
    return [];
  }
};

export const appendLogsToFile = (fileName: string, newEntries: any[]) => {
  const filePath = path.join(LOGS_DIR, fileName);
  const currentLogs = readLogFile(fileName);

  const updatedLogs = [...newEntries, ...currentLogs].slice(0, 1000);
  
  fs.writeFileSync(filePath, JSON.stringify(updatedLogs, null, 2), 'utf-8');
};

export const writeLogFile = (fileName: string, logs: any[]) => {
  const filePath = path.join(LOGS_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), 'utf-8');
};

export const deleteLogsByIds = (fileNames: string[], idsToDelete: string[]) => {
  const idsSet = new Set(idsToDelete);

  for (const fileName of fileNames) {
    const currentLogs = readLogFile(fileName);
    const updatedLogs = currentLogs.filter((item: any) => !idsSet.has(item.id));

    if (updatedLogs.length !== currentLogs.length) {
      writeLogFile(fileName, updatedLogs);
    }
  }
};
