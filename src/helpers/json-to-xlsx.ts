import fs from 'fs'

export function jsonToCsv(outputPath: string, data: any) {
    const keys = Object.keys(data[0]);
    const csv = data.map((row: any) =>
        keys.map(key => JSON.stringify(row[key] || '')).join(';')
    );
    fs.writeFileSync(outputPath, [keys.join(','), ...csv].join('\n'), 'utf8');
}