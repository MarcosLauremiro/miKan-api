export class ProjectCreatedEvent {
    constructor(
        public readonly projectId: string,
        public readonly projectName: string,
        public readonly userId: string,
        public readonly workspaceId?: string
    ) {}
}