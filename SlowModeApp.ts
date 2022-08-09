import {
    IAppAccessors,
    IAppUninstallationContext,
    IConfigurationExtend,
    IConfigurationModify,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IMessageBuilder,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { ApiSecurity, ApiVisibility } from '@rocket.chat/apps-engine/definition/api';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IMessage, IPostMessageSent, IPreMessageSentModify, IPreMessageSentPrevent } from '@rocket.chat/apps-engine/definition/messages';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { ISetting } from '@rocket.chat/apps-engine/definition/settings';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import SlowModeManageCommand from './Command/EnableSlowMode';
import { NotifySlowedState } from './Endpoints/NotifySlowedState';
import { LastMessage } from './Models/LastMessage';
import { SlowedRooms } from './Models/SlowedRooms';
import { settings } from './Settings/setting';

export class SlowModeApp extends App implements IPostMessageSent, IPreMessageSentPrevent {
    public me: IUser;

    private slowedFor: number;

    private events: Map<IUser['id'], Map<IRoom['id'], number>> = new Map();

    private siteurl: string;

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async onEnable(environment: IEnvironmentRead, configurationModify: IConfigurationModify): Promise<boolean> {
        this.me = (await this.getAccessors().reader.getUserReader().getAppUser(this.getID())) as IUser;
        this.slowedFor = parseInt(await environment.getSettings().getValueById(settings.Duration.id), 10);
        this.siteurl = (await environment.getServerSettings().getValueById('Site_Url')) as string;
        return Boolean(this.me);
    }

    public async onSettingUpdated(setting: ISetting, configurationModify: IConfigurationModify, read: IRead, http: IHttp): Promise<void> {
        this.slowedFor = setting.value;
    }

    public async initialize(configurationExtend: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
        await configurationExtend.slashCommands.provideSlashCommand(new SlowModeManageCommand(this));
        await configurationExtend.settings.provideSetting(settings.Duration);
        await configurationExtend.api.provideApi({
            visibility: ApiVisibility.PUBLIC,
            security: ApiSecurity.UNSECURE,
            endpoints: [new NotifySlowedState(this)],
        });
    }

    public async executePreMessageSentPrevent(message: IMessage, read: IRead, http: IHttp, persistence: IPersistence): Promise<boolean> {
        if (!Boolean(await SlowedRooms.findRoom(read.getPersistenceReader(), message.room))) {
            return false;
        }
        const { createdAt } = (await LastMessage.findByUserAndRoom(read.getPersistenceReader(), message.sender, message.room)) ?? {};
        if (!createdAt) {
            return false;
        }
        const timeLeft = this.slowedFor - (message.createdAt!.getTime() - createdAt.getTime()) / 1000;
        if (timeLeft >= 0) {
            // poc
            // this.events.set(message.sender.id, new Map<IRoom['id'], number>([[message.room.id, timeLeft]]));
            console.log(
                `${message.sender.username} must wait ${timeLeft} seconds before being able to send another message in ${message.room.displayName}`,
            );
            // super hacky and feels out of place
            const endpoint = this.siteurl.replace(/\/$/, '') + this.getAccessors().providedApiEndpoints[0].computedPath;
            await http.post(endpoint, {
                data: {
                    roomId: message.room.id,
                    userId: message.sender.id,
                    timeLeft: Math.ceil(timeLeft),
                },
            });
            return true;
        }
        return false;
    }

    public checkPostMessageSent(message: IMessage, read: IRead, http: IHttp): Promise<boolean> {
        // poc
        // override preMessageSent response
        return Promise.resolve(true);
    }

    public async executePostMessageSent(
        message: IMessage,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
    ): Promise<void> {
        const timeLeft = this.events.get(message.sender.id)?.get(message.room.id);
        if (timeLeft) {
            this.events.delete(message.sender.id);
            return modify.getNotifier().notifyUser(message.sender, {
                sender: this.me,
                text: `Slow mode enabled, please wait another ${timeLeft} seconds`,
                room: message.room,
            });
        }

        await LastMessage.insertOrUpdate(persistence, message);
    }

    public async onUninstall(
        context: IAppUninstallationContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
    ): Promise<void> {
        await Promise.all([LastMessage.drop(persistence), SlowedRooms.drop(persistence)]);
    }
}
