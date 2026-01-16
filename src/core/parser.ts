import * as yaml from 'js-yaml';
import { RcnbFile, Task, Message } from './types';
import { v4 as uuidv4 } from 'uuid';

export class RcnbParser {
    parse(content: string): RcnbFile {
        const file: RcnbFile = {
            metadata: {},
            tasks: [],
            rawContent: content
        };

        const lines = content.split('\n');
        let taskLines: string[] = [];
        let inFrontmatter = false;
        let frontmatterLines: string[] = [];
        let bodyStartIndex = 0;

        // 1. Parse Frontmatter
        if (lines[0]?.trim() === '---') {
            inFrontmatter = true;
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '---') {
                    inFrontmatter = false;
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
        const bodyContent = lines.slice(bodyStartIndex).join('\n');
        // Split by Markdown H1 headers (# Title)
        // regex looks for # at start of line
        const taskSplitRegex = /(^|\n)#\s+(.+)/;
        
        // Split keeps delimiters, so we need to reconstruct
        // The simple split might be tricky because we want to capture the title.
        // Let's iterate manually or use a smarter regex split.
        
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
        } else if (sections.length === 0 && currentBuffer.length > 0 && Object.keys(file.metadata).length === 0) {
             // Edge case: No H1 headers, but has content. Treat as single task or just raw?
             // Test case "should generate default metadata if missing" expects 1 task even if input is "# Just a task"
             // Wait, input "# Just a task" HAS a H1.
             // What if input has NO H1? e.g. "Just content".
             // Let's check the failing test expectation.
             // Test "should generate default metadata" input was "# Just a task". So it has H1.
             // So my logic above handles it.
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
        let cleanContent = content;

        while ((match = commentRegex.exec(content)) !== null) {
            const key = match[1];
            const value = match[2];
            
            if (key === 'id') task.id = value;
            if (key === 'status') task.status = value as any;
            if (key === 'mode') task.mode = value as any;
            
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
