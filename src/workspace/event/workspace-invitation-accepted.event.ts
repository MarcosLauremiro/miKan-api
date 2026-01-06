export class WorkspaceInvitationAcceptedEvent {
    constructor(
        public readonly workspaceName: string,
        public readonly memberEmail: string,
        public readonly memberName: string,
        public readonly invitedBy: string
    ) {}
}