export type ProjectStatus = 'not started' | 'in progress' | 'completed' | 'on hold';

export interface IProject {
    project_name: string;
    project_description: string;
    project_owner: string;
    start_date: Date;
    end_date: Date | null;
    status: ProjectStatus;
}