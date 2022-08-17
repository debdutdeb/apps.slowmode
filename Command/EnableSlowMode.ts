import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom, RoomType } from '@rocket.chat/apps-engine/definition/rooms';
import {
    ISlashCommand,
    SlashCommandContext,
} from '@rocket.chat/apps-engine/definition/slashcommands';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { Command } from '../Enums/Command';
import { Errors } from '../Enums/Errors';
import { Messages } from '../Enums/Messages';
import { notifyUser } from '../Lib/Functions';
import { SlowedRooms } from '../Models/SlowedRooms';
import { SlowModeApp } from '../SlowModeApp';

export default class SlowModeManageCommand implements ISlashCommand {
    public command: string = 'slowmode';
    public i18nDescription: string = 'slowmode_description';
    public i18nParamsExample: string = 'slowmode_params';
    public providesPreview: boolean = true;

    constructor(private readonly app: SlowModeApp) {}

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        _http: IHttp,
        persis: IPersistence,
    ): Promise<void> {
        const [argument] = context.getArguments();
        switch (argument) {
            case Command.Enable:
                await this.checkPermsission(modify, context.getRoom(), context.getSender());
                await this.enableSlowMode(context, read, modify, persis);
                break;
            case Command.Disable:
                await this.checkPermsission(modify, context.getRoom(), context.getSender());
                await this.disableSlowMode(context, read, modify, persis);
                break;
            case Command.List:
                return this.showEnabledRooms(context, read, modify);
            default:
                return this.showHelp(context, modify);
        }
        return;
    }

    private async checkPermsission(modify: IModify, room: IRoom, user: IUser): Promise<void> {
        if (!user.roles.some((role) => ['admin', 'moderator'].includes(role))) {
            return notifyUser({
                modify,
                user,
                room,
                sender: this.app.me,
                message: Errors.MUST_BE_MODERATOR_OR_ADMIN,
            });
        }
    }

    private async enableSlowMode(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        persis: IPersistence,
    ): Promise<void> {
        const contextRoom = context.getRoom();
        const sender = context.getSender();
        if (contextRoom.type === RoomType.DIRECT_MESSAGE) {
            return notifyUser({
                modify,
                user: sender,
                room: contextRoom,
                sender: this.app.me,
                message: Errors.NO_DIRECT_ROOM,
            });
        }

        const room = await SlowedRooms.findRoom(read.getPersistenceReader(), contextRoom);
        if (room) {
            return notifyUser({
                modify,
                user: sender,
                room,
                sender: this.app.me,
                message: Errors.ALREADY_SLOWED,
            });
        }

        const id = await SlowedRooms.insertRoom(persis, contextRoom);
        if (!id) {
            return notifyUser({
                modify,
                user: sender,
                room: contextRoom,
                message: Errors.SLOW_MODE_ENABLE_FAILED,
                sender: this.app.me,
            });
        }

        return notifyUser({
            modify,
            user: sender,
            room: contextRoom,
            sender: this.app.me,
            message: Messages.ENABLE_SUCCESSFUL,
        });
    }

    private async disableSlowMode(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        persis: IPersistence,
    ): Promise<void> {
        const contextRoom = context.getRoom();
        const sender = context.getSender();
        if (contextRoom.type === RoomType.DIRECT_MESSAGE) {
            return notifyUser({
                modify,
                user: sender,
                room: contextRoom,
                sender: this.app.me,
                message: Errors.NO_DIRECT_ROOM,
            });
        }

        if (!(await SlowedRooms.findRoom(read.getPersistenceReader(), contextRoom))) {
            return notifyUser({
                modify,
                user: sender,
                room: contextRoom,
                sender: this.app.me,
                message: Errors.ALREADY_NOT_SLOWED,
            });
        }

        await SlowedRooms.removeRoom(persis, contextRoom);

        return notifyUser({
            modify,
            user: sender,
            room: contextRoom,
            sender: this.app.me,
            message: Messages.DISABLE_SUCCESSFUL,
        });
    }

    private showHelp(context: SlashCommandContext, modify: IModify) {
        return notifyUser({
            modify,
            user: context.getSender(),
            room: context.getRoom(),
            sender: this.app.me,
            message: [
                '`/slowmode enable` to enable slow mode for current room',
                '`/slowmode disable` to disable slow mode for current room',
                '`/slowmode list to` show list of rooms where slow mode is enabled',
            ].join('\n'),
        });
    }

    private async showEnabledRooms(context: SlashCommandContext, read: IRead, modify: IModify) {
        const rooms = await SlowedRooms.findAll(read.getPersistenceReader());
        return notifyUser({
            modify,
            user: context.getSender(),
            room: context.getRoom(),
            sender: this.app.me,
            message: rooms.length
                ? rooms.map((room, idx) => `${idx + 1}. ${room.displayName}`).join('\n')
                : 'no rooms have slow mode enabled',
        });
    }
}
