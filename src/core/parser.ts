import * as yaml from 'js-yaml';
import { RcnbFile, Task } from './types';
import { v4 as uuidv4 } from 'uuid';

export class RcnbParser {
    parse(content: string): RcnbFile {
        const file: RcnbFile = {
            metadata: {},
            tasks: [],
            rawContent: content
        };

        const lines = content.split('\n');
        const frontmatterLines: string[] = [];
        let bodyStartIndex = 0;

        // 1. Parse Frontmatter
        if (lines[0]?.trim() === '---') {
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '---') {
                    bodyStartIndex = i + 1;
                    try {
                        file.metadata = yaml.load(frontmatterLines.join('\n')) as Record<string, any> || {};
                    } catch (e) {
                        console.error('Failed to parse frontmatter', e);
                    }
                    break;
                }
                frontmatterLines.push(lines[i]);
            }
        }

        // 2. Parse Tasks
        // Strategy: Find all indices of "^# "
        const sections: { title: string, content: string }[] = [];
        let currentTitle = '';
        let currentBuffer: string[] = [];
        
        const bodyLines = lines.slice(bodyStartIndex);
        
        for (const line of bodyLines) {
            const match = line.match(/^#\s+(.+)/);
            if (match) {
                // New section starts
                if (currentTitle || currentBuffer.length > 0) {
                    // Save previous section if it was a task (had a title) or just prologue
                    // For now, we only treat sections with H1 as tasks. 
                    // Prologue without H1 is ignored or treated as generic content?
                    // User requirement implies "Batch build tasks".
                    // Let's assume content before first H1 is ignored or part of file description?
                    // Implementation: Only save if we have a title.
                    if (currentTitle) {
                        sections.push({ title: currentTitle, content: currentBuffer.join('\n') });
                    }
                }
                currentTitle = match[1].trim();
                currentBuffer = [];
            } else {
                currentBuffer.push(line);
            }
        }
        
        // Push last section
        if (currentTitle) {
            sections.push({ title: currentTitle, content: currentBuffer.join('\n') });
        }

        // Convert sections to Tasks
        file.tasks = sections.map(section => this.parseTaskBlock(section.title, section.content));

        return file;
    }

    private parseTaskBlock(title: string, content: string): Task {
        const task: Task = {
            id: uuidv4(),
            title,
            status: 'pending',
            mode: 'code',
            content: '',
            messages: []
        };

        // Extract comments <!-- key: value -->
        const commentRegex = /<!--\s*(\w+):\s*(.+?)\s*-->/g;
        let match;

        while ((match = commentRegex.exec(content)) !== null) {
            const key = match[1];
            const value = match[2];
            
            if (key === 'id') { task.id = value; }
            if (key === 'status') { task.status = value as any; }
            if (key === 'mode') { task.mode = value as any; }
            
            // Remove comment from content (optional, but cleaner)
            // But wait, regex exec loop on same string while modifying it is dangerous.
            // Better strategy: replace all comments first or verify if we want to keep them.
            // Usually we want to strip metadata comments from "content" displayed to user.
        }
        
        task.content = content.replace(commentRegex, '').trim();
        
        return task;
    }

    serialize(file: RcnbFile): string {
        let output = '';

        // 1. Frontmatter
        if (file.metadata && Object.keys(file.metadata).length > 0) {
            output += '---\n';
            output += yaml.dump(file.metadata);
            output += '---\n\n';
        }

        // 2. Tasks
        for (const task of file.tasks) {
            output += `# ${task.title}\n`;
            output += `<!-- id: ${task.id} -->\n`;
            output += `<!-- status: ${task.status} -->\n`;
            if (task.mode !== 'code') { // default is code
                output += `<!-- mode: ${task.mode} -->\n`;
            }
            output += `${task.content}\n\n`;
        }

        return output.trim();
    }
}
