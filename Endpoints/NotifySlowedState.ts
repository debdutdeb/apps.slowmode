import {
    HttpStatusCode,
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import {
    ApiEndpoint,
    IApiEndpointInfo,
    IApiRequest,
    IApiResponse,
} from '@rocket.chat/apps-engine/definition/api';
import { notifyUser } from '../Lib/Functions';
import { SlowModeApp } from '../SlowModeApp';

/**
 * this shouldn't exist
 */
export class NotifySlowedState extends ApiEndpoint {
    public path = 'notify';

    constructor(public readonly app: SlowModeApp) {
        super(app);
    }

    public async post(
        request: IApiRequest,
        _endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        _http: IHttp,
        _persis: IPersistence,
    ): Promise<IApiResponse> {
        const { roomId, userId, timeLeft, secret } = request.content;
        if (this.app.secret !== secret) {
            // just a safeguard
            return this.success({ status: HttpStatusCode.FORBIDDEN });
        }
        const room = await read.getRoomReader().getById(roomId);
        if (!room) {
            console.log('invalid room id', roomId);
            return this.success({
                status: HttpStatusCode.NOT_FOUND,
            });
        }
        const user = await read.getUserReader().getById(userId);
        if (!user) {
            console.log('invalid user id', userId);
            return this.success({
                status: HttpStatusCode.NOT_FOUND,
            });
        }

        await notifyUser({
            modify,
            user,
            room,
            sender: this.app.me,
            message: `Slow mode is enabled for this room, you must wait ${timeLeft} more second${
                timeLeft > 1 ? 's' : ''
            } before sending another message`,
        });

        return this.success();
    }
}
