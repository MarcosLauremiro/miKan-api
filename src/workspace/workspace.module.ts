import { Module } from "@nestjs/common";
import { WrokspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ProtectRoute } from "../auth/guards/protect-route-auth.guard";
import { WorkspaceMemberRoleUpdatedListener } from "./listeners/workspace-member-role-updated.listener";
import { WorkspaceMemberRemovedListener } from "./listeners/workspace-member-removed.listener";
import { WorkspaceMemberLeftListener } from "./listeners/workspace-member-left.listener";
import { WorkspaceMemberAddedListener } from "./listeners/workspace-member-added.listener";
import { WorkspaceInviteListener } from "./listeners/workspace-invite.listener";
import { WorkspaceInvitationAcceptedListener } from "./listeners/workspace-invitation-accepted.listener";


@Module({
    imports: [],
    controllers: [WrokspaceController],
    providers: [
        WorkspaceService,
        PrismaService,
        ProtectRoute,
        WorkspaceMemberRoleUpdatedListener,
        WorkspaceMemberRemovedListener,
        WorkspaceMemberLeftListener,
        WorkspaceMemberAddedListener,
        WorkspaceInviteListener,
        WorkspaceInvitationAcceptedListener,
    ],
    exports: []
})

export class WorkspaceModule { }
