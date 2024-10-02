import fs from 'fs'
import path from 'path'

export async function waitForTargetDownload(currentDownloadPath: string): Promise<string>
{
    return new Promise((resolve, reject) => {
        const initialFiles = new Set(fs.readdirSync(currentDownloadPath));
        let timeoutId: any;

        const watcher = fs.watch(currentDownloadPath, (eventType, filename) => {
            if (eventType === 'rename' && filename) {
                const filePath = path.join(currentDownloadPath, filename);
                if (!initialFiles.has(filename) && fs.existsSync(filePath) && !filename.endsWith('.crdownload')) {
                    clearTimeout(timeoutId);
                    watcher.close();
                    resolve(filePath);
                }
            }
        });

        timeoutId = setTimeout(() => {
            watcher.close();
            reject(new Error('Timeout: No new file detected'));
        }, 10000);
    })
}