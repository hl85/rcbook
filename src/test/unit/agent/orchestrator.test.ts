import { Orchestrator } from '../../../core/agent/Orchestrator';
import { IAgent, ILLMProvider } from '../../../core/agent/interfaces';
import { AgentProfile, PlanCell, TaskCell, Message } from '../../../core/agent/types';
import { AIProviderFactory } from '../../../core/ai/AIProviderFactory';
import { ModelRegistry } from '../../../core/agent/ModelRegistry';

// Mock LLM Provider specifically for Orchestrator tests
class MockArchitectProvider implements ILLMProvider {
    id = 'mock-architect';
    async generateResponse(messages: Message[], systemPrompt: string): Promise<string> {
        // Return a mock JSON plan
        return JSON.stringify([
            {
                id: 'step-1',
                title: 'Create File',
                description: 'Create main.ts',
                agent: 'coder',
                status: 'pending'
            },
            {
                id: 'step-2',
                title: 'Review Code',
                description: 'Check for bugs',
                agent: 'reviewer',
                status: 'pending'
            }
        ]);
    }
}

describe('Orchestrator', () => {
    let orchestrator: Orchestrator;
    let mockArchitectProvider: MockArchitectProvider;

    beforeEach(() => {
        mockArchitectProvider = new MockArchitectProvider();
        AIProviderFactory.getInstance().registerProvider(mockArchitectProvider);
        ModelRegistry.getInstance().updateModelConfig('architect', { provider: 'mock-architect' as any, model: 'test' });
        orchestrator = new Orchestrator();
    });

    test('generatePlan should return a PlanCell with parsed steps', async () => {
        const requirement = 'Build a simple script';
        const planCell = await orchestrator.generatePlan(requirement);

        expect(planCell.type).toBe('plan');
        expect(planCell.content).toBe(requirement);
        expect(planCell.planData?.steps).toHaveLength(2);
        expect(planCell.planData?.steps[0].title).toBe('Create File');
        expect(planCell.planData?.steps[0].agent).toBe('coder');
    });

    test('createTaskCellsFromPlan should explode PlanCell into TaskCells', () => {
        const planCell: PlanCell = {
            id: 'plan-1',
            type: 'plan',
            content: 'req',
            status: 'approved',
            planData: {
                steps: [
                    {
                        id: 'step-1',
                        title: 'Step 1',
                        description: 'Desc 1',
                        agent: 'coder',
                        status: 'pending'
                    },
                    {
                        id: 'step-2',
                        title: 'Step 2',
                        description: 'Desc 2',
                        agent: 'reviewer',
                        status: 'pending'
                    }
                ]
            }
        };

        const taskCells = orchestrator.createTaskCellsFromPlan(planCell);

        expect(taskCells).toHaveLength(2);
        expect(taskCells[0].type).toBe('task');
        expect(taskCells[0].stepId).toBe('step-1');
        expect(taskCells[0].agentType).toBe('coder');
        expect(taskCells[0].status).toBe('pending');
        
        // Verify dependency linking (implied by order, or explicit if we add dependencies later)
        expect(taskCells[1].agentType).toBe('reviewer');
    });
    
    test('generatePlan handles invalid JSON gracefully', async () => {
         // Override mock to return bad JSON
         jest.spyOn(mockArchitectProvider, 'generateResponse').mockResolvedValue('Invalid JSON');
         
         await expect(orchestrator.generatePlan('fail')).rejects.toThrow();
    });
});
