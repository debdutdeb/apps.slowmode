import { IModify } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

export async function notifyUser({
    modify,
    user,
    room,
    sender,
    message,
}: {
    modify: IModify;
    user: IUser;
    room: IRoom;
    sender: IUser;
    message: string;
}): Promise<void> {
    return modify.getNotifier().notifyUser(user, {
        room,
        sender,
        text: message,
    });
}

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-=_+[]{}|;:\'",./<>?';

export function secret(length: number = 10): string {
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
