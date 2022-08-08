import { IPersistence, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessage } from '@rocket.chat/apps-engine/definition/messages';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

const LASTMESSAGE_ID = 'last_messages';

class LastMessageModel {
    private readonly record = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, LASTMESSAGE_ID);

    public async findByUserAndRoom(read: IPersistenceRead, user: IUser, room: IRoom): Promise<Pick<IMessage, 'createdAt'> | undefined> {
        return new Promise<Pick<IMessage, 'createdAt'> | undefined>((resolve) =>
            read
                .readByAssociations([this.record, this.convertToAssociation(user), this.convertToAssociation(room)])
                .then((results: Array<Pick<IMessage, 'createdAt'>>) => (results.length ? resolve(results[0]) : resolve(undefined))),
        );
    }

    public async insertOrUpdate(persistence: IPersistence, message: IMessage): Promise<string> {
        return persistence.updateByAssociations(
            [this.record, this.convertToAssociation(message.sender), this.convertToAssociation(message.room)],
            { createdAt: message.createdAt },
            true,
        );
    }

    public async drop(persistence: IPersistence) {
        return persistence.removeByAssociation(this.record);
    }

    private convertToAssociation(userOrRoom: IUser | IRoom): RocketChatAssociationRecord {
        return new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, userOrRoom.id);
    }
}

export const LastMessage = new LastMessageModel();
