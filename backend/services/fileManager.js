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

/**
 * Delete a single file under a vehicle folder. publicPath must be /files/Cars/{stock_id}/{category}/{filename}
 */
export function deleteVehicleFile(stock_id, publicPath) {
  let p = String(publicPath || '').replace(/\\/g, '/').trim();
  const originIdx = p.toLowerCase().indexOf('/files/cars/');
  if (originIdx >= 0) p = p.slice(originIdx).split('?')[0].split('#')[0];
  const m = p.match(/^\/files\/Cars\/([^/]+)\/([^/]+)\/([^/]+)\/?$/i);
  if (!m) throw new Error('Invalid file path');
  let [, sid, folderRaw, filenameEnc] = m;
  if (sid !== stock_id) throw new Error('Path does not match vehicle');
  const folder = VEHICLE_FOLDERS.find(f => f.toLowerCase() === folderRaw.toLowerCase());
  if (!folder) throw new Error('Invalid category');
  let filename = filenameEnc;
  try {
    filename = decodeURIComponent(filenameEnc.replace(/\+/g, ' '));
  } catch {
    filename = filenameEnc;
  }
  const abs = path.join(STORAGE_ROOT, 'Cars', stock_id, folder, filename);
  const root = path.join(STORAGE_ROOT, 'Cars', stock_id);
  const resolvedFile = path.resolve(abs);
  const resolvedRoot = path.resolve(root);
  const rel = path.relative(resolvedRoot, resolvedFile);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Invalid path');
  if (!fs.existsSync(resolvedFile)) return { deleted: false };
  fs.unlinkSync(resolvedFile);
  return { deleted: true };
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
