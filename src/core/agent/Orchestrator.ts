import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from './BaseAgent';
import { IAgent, ILLMProvider } from './interfaces';
import { ModelRegistry } from './ModelRegistry';
import { Cell, PlanCell, PlanStep, TaskCell, AgentRole } from './types';

export class Orchestrator {
    private registry: ModelRegistry;
    private architectAgent: IAgent;

    constructor(llmProvider: ILLMProvider) {
        this.registry = ModelRegistry.getInstance();
        
        // Initialize Architect Agent
        // In a real app, we might inject this or get from a factory
        const architectProfile = this.registry.getProfile('architect');
        if (!architectProfile) throw new Error('Architect profile not found');
        
        this.architectAgent = new BaseAgent(architectProfile, llmProvider);
    }

    public async generatePlan(requirement: string): Promise<PlanCell> {
        // 1. Construct prompt for Architect
        const messages = [
            { 
                role: 'user' as const, 
                content: `Create a step-by-step plan for the following requirement. 
                Return ONLY a JSON array of steps. Each step should have: title, description, agent (coder|reviewer).
                Requirement: ${requirement}`,
                timestamp: Date.now()
            }
        ];

        // 2. Call Architect Agent
        const response = await this.architectAgent.chat(messages);

        // 3. Parse JSON
        let steps: PlanStep[];
        try {
            // Simple cleanup for markdown code blocks if present
            const jsonStr = response.replace(/```json\n?|\n?```/g, '');
            const rawSteps = JSON.parse(jsonStr);
            
            // Map to strict types and add IDs if missing
            steps = rawSteps.map((s: any, index: number) => ({
                id: s.id || `step-${uuidv4()}`,
                title: s.title,
                description: s.description,
                agent: s.agent as AgentRole,
                status: 'pending'
            }));
        } catch (e) {
            throw new Error('Failed to parse plan from Architect response: ' + e);
        }

        // 4. Create PlanCell
        const planCell: PlanCell = {
            id: uuidv4(),
            type: 'plan',
            content: requirement,
            status: 'draft',
            planData: {
                steps
            }
        };

        return planCell;
    }

    public createTaskCellsFromPlan(planCell: PlanCell): TaskCell[] {
        if (!planCell.planData) return [];

        return planCell.planData.steps.map(step => {
            const profile = this.registry.getProfile(step.agent);
            
            return {
                id: uuidv4(),
                type: 'task',
                stepId: step.id,
                agentType: step.agent,
                modelConfig: profile ? profile.defaultModel : { provider: 'openai', model: 'gpt-3.5-turbo' }, // Fallback
                chatHistory: [], // Empty initially
                status: 'pending'
            };
        });
    }

    // --- Workflow Engine ---

    public startWorkflow(tasks: TaskCell[]): TaskCell | null {
        // Find first pending task
        const firstPending = tasks.find(t => t.status === 'pending');
        if (firstPending) {
            firstPending.status = 'running';
            return firstPending;
        }
        return null;
    }

    public completeTask(currentTask: TaskCell, allTasks: TaskCell[]): TaskCell | null {
        // 0. Validation: Ensure currentTask is in allTasks
        const currentIndex = allTasks.findIndex(t => t.id === currentTask.id);
        if (currentIndex === -1) return null;

        // 1. Mark current as completed
        currentTask.status = 'completed';

        // 2. Find next pending task (assuming sequential order for now)
        // In a complex graph, we would check dependencies here
        
        const nextTask = allTasks[currentIndex + 1];
        if (nextTask && nextTask.status === 'pending') {
            nextTask.status = 'running';
            return nextTask;
        }

        return null;
    }
}
