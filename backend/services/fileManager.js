import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_ROOT = path.resolve(__dirname, '..', '..', process.env.STORAGE_ROOT || 'storage');

const VEHICLE_FOLDERS = ['Photos', 'Documents', 'ServiceHistory', 'MOT', 'Purchase', 'Sale', 'Delivery', 'Collection'];

export function createVehicleFolders(stock_id) {
  const root = path.join(STORAGE_ROOT, 'Cars', stock_id);
  for (const folder of VEHICLE_FOLDERS) {
    fs.mkdirSync(path.join(root, folder), { recursive: true });
  }
  return root;
}

export function createInvestorFolder(name) {
  const safeName = name.replace(/[<>:"/\\|?*]/g, '_');
  const root = path.join(STORAGE_ROOT, 'Investors', safeName);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function listVehicleFiles(stock_id) {
  const root = path.join(STORAGE_ROOT, 'Cars', stock_id);
  const result = {};
  for (const folder of VEHICLE_FOLDERS) {
    const folderPath = path.join(root, folder);
    try {
      const files = fs.readdirSync(folderPath).filter(f => !f.startsWith('.'));
      result[folder] = files.map(f => ({
        name: f,
        path: `/files/Cars/${stock_id}/${folder}/${f}`,
        size: fs.statSync(path.join(folderPath, f)).size
      }));
    } catch {
      result[folder] = [];
    }
  }
  return result;
}

export function deleteVehicleFolder(stock_id) {
  const root = path.join(STORAGE_ROOT, 'Cars', stock_id);
  if (fs.existsSync(root)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export function createTempFolder() {
  const root = path.join(STORAGE_ROOT, 'temp');
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export { VEHICLE_FOLDERS };
