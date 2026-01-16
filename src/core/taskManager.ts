import { RcnbFile, Task, Message } from './types';
import { v4 as uuidv4 } from 'uuid';

export class TaskManager {
    private file: RcnbFile;

    constructor(file: RcnbFile) {
        this.file = file;
    }

    getTasks(): Task[] {
        return this.file.tasks;
    }

    getTask(id: string): Task | undefined {
        return this.file.tasks.find(t => t.id === id);
    }

    createTask(title: string): Task {
        const newTask: Task = {
            id: uuidv4(),
            title,
            status: 'pending',
            mode: 'code',
            content: '',
            messages: []
        };
        this.file.tasks.push(newTask);
        return newTask;
    }

    updateTaskStatus(id: string, status: Task['status']): void {
        const task = this.getTask(id);
        if (!task) {
            throw new Error(`Task with id ${id} not found`);
        }
        task.status = status;
    }

    addMessage(taskId: string, message: Message): void {
        const task = this.getTask(taskId);
        if (!task) {
            throw new Error(`Task with id ${taskId} not found`);
        }
        if (!task.messages) {
            task.messages = [];
        }
        task.messages.push({
            ...message,
            timestamp: message.timestamp || Date.now()
        });
    }
}
