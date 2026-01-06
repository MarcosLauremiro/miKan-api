export class WorkspaceMemberRoleUpdatedEvent {
    constructor(
        public readonly workspaceName: string,
        public readonly memberEmail: string,
        public readonly memberName: string,
        public readonly oldRole: string,
        public readonly newRole: string,
        public readonly updatedBy: string
    ) {}
}