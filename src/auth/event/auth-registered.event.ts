export class AuthRegisteredEvent {
    constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly provider: string,
    ) {}
}