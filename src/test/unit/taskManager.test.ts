import { TaskManager } from '../../core/taskManager';
import { RcnbFile } from '../../core/types';

describe('TaskManager', () => {
    let taskManager: TaskManager;
    let initialFile: RcnbFile;

    beforeEach(() => {
        initialFile = {
            metadata: { title: 'Test Notebook' },
            tasks: [],
            rawContent: ''
        };
        taskManager = new TaskManager(initialFile);
    });

    describe('createTask', () => {
        it('should create a new task with default status', () => {
            const task = taskManager.createTask('New Task');
            
            expect(task.title).toBe('New Task');
            expect(task.status).toBe('pending');
            expect(task.id).toBeDefined();
            expect(taskManager.getTasks()).toHaveLength(1);
        });
    });

    describe('updateTaskStatus', () => {
        it('should update task status', () => {
            const task = taskManager.createTask('Task 1');
            taskManager.updateTaskStatus(task.id, 'in_progress');
            
            const updated = taskManager.getTask(task.id);
            expect(updated?.status).toBe('in_progress');
        });

        it('should throw error for non-existent task', () => {
            expect(() => {
                taskManager.updateTaskStatus('fake-id', 'completed');
            }).toThrow();
        });
    });

    describe('addMessage', () => {
        it('should add message to task history', () => {
            const task = taskManager.createTask('Chat Task');
            
            taskManager.addMessage(task.id, {
                role: 'user',
                content: 'Hello AI'
            });

            const updated = taskManager.getTask(task.id);
            expect(updated?.messages).toHaveLength(1);
            expect(updated?.messages[0].content).toBe('Hello AI');
        });
    });
});
