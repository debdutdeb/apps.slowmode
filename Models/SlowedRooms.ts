import { IPersistence, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';

const SLOWED_ROOM_LIST_ID = 'slowed_rooms';

class SlowedRoomsModel {
    private readonly record = new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, SLOWED_ROOM_LIST_ID);

    public async findRoom(read: IPersistenceRead, room: IRoom): Promise<IRoom | undefined> {
        return new Promise<IRoom | undefined>((resolve) =>
            read
                .readByAssociations([this.record, this.convertToAssociation(room)])
                .then((results: Array<IRoom>) => (results.length ? resolve(results[0]) : resolve(undefined))),
        );
    }

    public async insertRoom(persistence: IPersistence, room: IRoom): Promise<string> {
        return persistence.createWithAssociations(room, [this.record, this.convertToAssociation(room)]);
    }

    public async findAll(read: IPersistenceRead): Promise<Array<IRoom>> {
        return read.readByAssociation(this.record) as Promise<Array<IRoom>>;
    }

    public async removeRoom(persistence: IPersistence, room: IRoom): Promise<void> {
        await persistence.removeByAssociations([this.record, this.convertToAssociation(room)]);
    }

    public async drop(persistence: IPersistence) {
        return persistence.removeByAssociation(this.record);
    }

    private convertToAssociation(room: IRoom): RocketChatAssociationRecord {
        return new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, room.id);
    }
}

export const SlowedRooms = new SlowedRoomsModel();
