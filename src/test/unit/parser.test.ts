import { RcnbParser } from '../../core/parser';
import { RcnbFile } from '../../core/types';

describe('RcnbParser', () => {
    let parser: RcnbParser;

    beforeEach(() => {
        parser = new RcnbParser();
    });

    describe('parse', () => {
        it('should parse a file with valid frontmatter and tasks', () => {
            const content = `---
id: "file-123"
title: "My Notebook"
created_at: 1672531200000
---

# Task 1: Initialize Project
<!-- id: task-1 -->
<!-- status: completed -->
This is the first task description.

# Task 2: Implement Parser
<!-- id: task-2 -->
<!-- status: in_progress -->
This is the second task.
`;

            const result: RcnbFile = parser.parse(content);

            expect(result.metadata).toEqual({
                id: "file-123",
                title: "My Notebook",
                created_at: 1672531200000
            });
            expect(result.tasks).toHaveLength(2);
            
            expect(result.tasks[0].id).toBe('task-1');
            expect(result.tasks[0].title).toBe('Task 1: Initialize Project');
            expect(result.tasks[0].status).toBe('completed');
            expect(result.tasks[0].content).toContain('This is the first task description.');

            expect(result.tasks[1].id).toBe('task-2');
            expect(result.tasks[1].title).toBe('Task 2: Implement Parser');
            expect(result.tasks[1].status).toBe('in_progress');
        });

        it('should handle file with only frontmatter', () => {
            const content = `---
title: "Empty Notebook"
---
`;
            const result = parser.parse(content);
            expect(result.metadata).toEqual({ title: "Empty Notebook" });
            expect(result.tasks).toHaveLength(0);
        });

        it('should generate default metadata if missing', () => {
            const content = `# Just a task`;
            const result = parser.parse(content);
            expect(result.metadata).toBeDefined();
            expect(result.tasks).toHaveLength(1);
        });
    });

    describe('serialize', () => {
        it('should serialize RcnbFile back to string', () => {
            const file: RcnbFile = {
                metadata: { title: "Test File" },
                tasks: [
                    {
                        id: 't1',
                        title: 'Task 1',
                        status: 'pending',
                        content: 'Content 1',
                        mode: 'code',
                        messages: []
                    }
                ]
            };

            const output = parser.serialize(file);
            
            expect(output).toContain('title: Test File');
            expect(output).toContain('# Task 1');
            expect(output).toContain('<!-- id: t1 -->');
            expect(output).toContain('<!-- status: pending -->');
            expect(output).toContain('Content 1');
        });
    });
});
