import { Orchestrator } from '../../../core/agent/Orchestrator';
import { IAgent, ILLMProvider } from '../../../core/agent/interfaces';
import { TaskCell, Message } from '../../../core/agent/types';

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
});
