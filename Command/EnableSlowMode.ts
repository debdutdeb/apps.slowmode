import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom, RoomType } from '@rocket.chat/apps-engine/definition/rooms';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { Command } from '../enums/Command';
import { SlowedRooms } from '../Models/SlowedRooms';
import { SlowModeApp } from '../SlowModeApp';

export default class SlowModeManageCommand implements ISlashCommand {
    public command: string = 'slowmode';
    public i18nDescription: string = 'slowmode_description';
    public i18nParamsExample: string = 'slowmode_params';
    public providesPreview: boolean = false;

    constructor(private readonly app: SlowModeApp) {}

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [argument] = context.getArguments();
        switch (argument) {
            case Command.Enable:
                await this.enableSlowMode(context, read, modify, persis);
                break;
            case Command.Disable:
                await this.disableSlowMode(context, read, modify, persis);
                break;
            case Command.List:
                return this.showEnabledRooms(context, read, modify);
            default:
                return this.showHelp(context, modify);
        }
        return;
    }

    private async enableSlowMode(context: SlashCommandContext, read: IRead, modify: IModify, persis: IPersistence): Promise<void> {
        const contextRoom = context.getRoom();
        if (contextRoom.type === RoomType.DIRECT_MESSAGE) {
            return this.notifyRoom(modify, contextRoom, 'cannot enable slow mode in a direct room');
        }

        const room = await SlowedRooms.findRoom(read.getPersistenceReader(), contextRoom);
        if (room) {
            return this.notifyRoom(modify, contextRoom, 'room already slowed');
        }

        const id = await SlowedRooms.insertRoom(persis, contextRoom);
        if (!id) {
            return this.notifyRoom(modify, contextRoom, 'failed to enable slow mode for this room');
        }

        return this.notifyRoom(modify, contextRoom, 'successfully enabled slow mode');
    }

    private async disableSlowMode(context: SlashCommandContext, read: IRead, modify: IModify, persis: IPersistence): Promise<void> {
        const contextRoom = context.getRoom();
        if (contextRoom.type === RoomType.DIRECT_MESSAGE) {
            return this.notifyRoom(modify, contextRoom, 'cannot disable slow mode in a direct room');
        }

        const room = await SlowedRooms.findRoom(read.getPersistenceReader(), contextRoom);
        if (!room) {
            return this.notifyRoom(modify, contextRoom, 'room not slowed');
        }

        await SlowedRooms.removeRoom(persis, contextRoom);

        return this.notifyRoom(modify, contextRoom, 'successfully disabled slow mode');
    }

    private showHelp(context: SlashCommandContext, modify: IModify) {
        return this.notifyRoom(
            modify,
            context.getRoom(),
            [
                '`/slowmode enable` to enable slow mode for current room',
                '`/slowmode disable` to disable slow mode for current room',
                '`/slowmode list to` show list of rooms where slow mode is enabled',
            ].join('\n'),
        );
    }

    private async showEnabledRooms(context: SlashCommandContext, read: IRead, modify: IModify) {
        const rooms = await SlowedRooms.findAll(read.getPersistenceReader());
        return this.notifyRoom(
            modify,
            context.getRoom(),
            rooms.length ? rooms.map((room, idx) => `${idx + 1}. ${room.displayName}`).join('\n') : 'no rooms have slow mode enabled',
        );
    }

    private async notifyRoom(modify: IModify, room: IRoom, message: string): Promise<void> {
        return modify.getNotifier().notifyRoom(room, {
            sender: this.app.me,
            text: message,
            room,
        });
    }
}
