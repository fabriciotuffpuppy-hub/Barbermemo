import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📦 Starting BarberMemo unified build...');

// 1. Ensure dependencies are installed in barbermemo subfolder
console.log('📥 Checking React App dependencies...');
execSync('npm --prefix barbermemo install', { stdio: 'inherit' });

// 2. Build the React App inside barbermemo folder
console.log('⚡ Building React App (barbermemo)...');
execSync('npm --prefix barbermemo run build', { stdio: 'inherit' });

// 3. Prepare root dist output directory
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Helper function to recursively copy directories
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 4. Copy Landing Page (lp/) files to root dist/
console.log('🌐 Copying Landing Page files...');
const lpDir = path.join(__dirname, 'lp');
if (fs.existsSync(lpDir)) {
  copyDirSync(lpDir, distDir);
}

// 5. Integrate BarberMemo React App build output into root dist/
console.log('🚀 Merging React App assets...');
const barbermemoDist = path.join(__dirname, 'barbermemo', 'dist');

if (fs.existsSync(barbermemoDist)) {
  const barbermemoEntries = fs.readdirSync(barbermemoDist, { withFileTypes: true });
  for (const entry of barbermemoEntries) {
    if (entry.name === 'index.html') {
      fs.copyFileSync(
        path.join(barbermemoDist, 'index.html'),
        path.join(distDir, 'app.html')
      );
    } else {
      const srcPath = path.join(barbermemoDist, entry.name);
      const destPath = path.join(distDir, entry.name);
      if (entry.isDirectory()) {
        copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

console.log('✅ Build complete! Unified output ready in dist/');
