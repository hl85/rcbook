import React from 'react';
import { Task } from '../../core/types';
import { TaskCell } from './TaskCell';

interface TaskListProps {
    tasks: Task[];
    expandedTaskId: string | null;
    onToggleTask: (taskId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, expandedTaskId, onToggleTask }) => {
    return (
        <div className="task-list">
            {tasks.map(task => (
                <TaskCell 
                    key={task.id} 
                    task={task} 
                    isExpanded={expandedTaskId === task.id}
                    onToggle={() => onToggleTask(task.id)}
                />
            ))}
        </div>
    );
};
