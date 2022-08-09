import { HttpStatusCode, IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
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
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<IApiResponse> {
        const { roomId, userId, timeLeft } = request.content;
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

        await modify.getNotifier().notifyRoom(room, {
            sender: this.app.me,
            room,
            text: `Slow mode enabled, please wait ${timeLeft} seconds before sending another message`,
        });
        return this.success();
    }
}
