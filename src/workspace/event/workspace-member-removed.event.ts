export class WorkspaceMemberRemovedEvent {
    constructor(
        public readonly workspaceName: string,
        public readonly memberEmail: string,
        public readonly memberName: string,
        public readonly removedBy: string
    ) {}
}