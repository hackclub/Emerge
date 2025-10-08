import { json } from '@sveltejs/kit';
import { readFile } from 'fs/promises';

export async function GET() {
    try {
        const data = await readFile('/data/coolify/applications/canvas.json', 'utf-8');
        const canvasData = JSON.parse(data);
        return json(canvasData);
    } catch (error) {
        console.error('Failed to read canvas.json:', error);
        return json({ error: 'Failed to read canvas data' }, { status: 500 });
    }
}