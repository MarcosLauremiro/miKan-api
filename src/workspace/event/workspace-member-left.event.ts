export class WorkspaceMemberLeftEvent {
    constructor(
        public readonly workspaceName: string,
        public readonly memberEmail: string,
        public readonly memberName: string
    ) {}
}