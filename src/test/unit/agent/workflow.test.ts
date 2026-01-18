import { Orchestrator } from '../../../core/agent/Orchestrator';
import { IAgent, ILLMProvider } from '../../../core/agent/interfaces';
import { TaskCell, Message } from '../../../core/agent/types';

// vscode mock provided by jest config moduleNameMapper

// Simple Mock
class MockProvider implements ILLMProvider {
    async generateResponse() { return 'done'; }
}

describe('Orchestrator Workflow', () => {
    let orchestrator: Orchestrator;
    let tasks: TaskCell[];

    beforeEach(() => {
        orchestrator = new Orchestrator(new MockProvider());
        
        // Setup 2 tasks
        tasks = [
            {
                id: 'task-1',
                type: 'task',
                stepId: 'step-1',
                agentType: 'coder',
                status: 'pending',
                modelConfig: { provider: 'openai', model: 'gpt-4' },
                chatHistory: []
            },
            {
                id: 'task-2',
                type: 'task',
                stepId: 'step-2',
                agentType: 'reviewer',
                status: 'pending',
                modelConfig: { provider: 'openai', model: 'gpt-4' },
                chatHistory: []
            }
        ];
    });

    test('startWorkflow should activate the first pending task', () => {
        const activeTask = orchestrator.startWorkflow(tasks);
        expect(activeTask).toBeDefined();
        expect(activeTask?.id).toBe('task-1');
        expect(activeTask?.status).toBe('running');
    });

    test('completeTask should activate the next task', () => {
        // Start first
        orchestrator.startWorkflow(tasks);
        
        // Complete first
        const nextTask = orchestrator.completeTask(tasks[0], tasks);
        
        expect(tasks[0].status).toBe('completed');
        expect(nextTask).toBeDefined();
        expect(nextTask?.id).toBe('task-2');
        expect(nextTask?.status).toBe('running');
    });

    test('completeTask should return null if all done', () => {
        tasks[0].status = 'completed';
        tasks[1].status = 'running';
        
        const next = orchestrator.completeTask(tasks[1], tasks);
        
        expect(tasks[1].status).toBe('completed');
        expect(next).toBeNull();
    });

    // --- Added Tests ---

    test('startWorkflow returns null if no pending tasks', () => {
        tasks[0].status = 'completed';
        tasks[1].status = 'completed';
        
        const activeTask = orchestrator.startWorkflow(tasks);
        expect(activeTask).toBeNull();
    });

    test('completeTask returns null if current task not found', () => {
        const unknownTask: TaskCell = { ...tasks[0], id: 'unknown' };
        const next = orchestrator.completeTask(unknownTask, tasks);
        expect(next).toBeNull();
        // Should verify status wasn't changed
        expect(unknownTask.status).not.toBe('completed'); 
    });

    test('completeTask skips non-pending tasks', () => {
        // task-1 (current), task-2 (already completed), task-3 (pending)
        const task3: TaskCell = {
            id: 'task-3',
            type: 'task',
            stepId: 'step-3',
            agentType: 'coder',
            status: 'pending',
            modelConfig: { provider: 'openai', model: 'gpt-4' },
            chatHistory: []
        };
        tasks[1].status = 'completed';
        const allTasks = [...tasks, task3];

        // Completing task-1 should theoretically skip task-2?
        // Wait, current logic is sequential index+1. 
        // If index+1 is completed, it returns null or stops?
        // Let's check code: `const nextTask = allTasks[currentIndex + 1]; if (nextTask && nextTask.status === 'pending')`
        // So if next task is NOT pending (e.g. completed or failed), it returns null. 
        // This is correct behavior for sequential pipeline - it halts if next step isn't ready/pending.
        
        const next = orchestrator.completeTask(allTasks[0], allTasks);
        expect(next).toBeNull(); 
    });
});
