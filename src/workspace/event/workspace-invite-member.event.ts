export class WorkspaceInviteMemberEvent {
    constructor(
        public readonly workspaceName: string,
        public readonly email: string,
        public readonly role: string,
        public readonly inviteById: string,
        public readonly type: 'INVITE' | 'ADDED',
        public readonly token?: string
    ) {}
}