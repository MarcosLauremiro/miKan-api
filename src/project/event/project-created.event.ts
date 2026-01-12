export class ProjectCreatedEvent {
    constructor(
        public readonly projectId: string,
        public readonly projectName: string,
        public readonly userId: string,
        public readonly userName: string,
        public readonly workspaceId: string | null,
        public readonly workspaceName: string | null,
        public readonly isPrivate: boolean
    ) {}
}