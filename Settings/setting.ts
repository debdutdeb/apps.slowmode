import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';

export const settings: Record<string, ISetting> = {
    Duration: {
        id: 'Slow_Mode_Duration',
        i18nLabel: 'Slow Mode Duration',
        i18nDescription: 'in seconds',
        required: false,
        type: SettingType.NUMBER,
        public: true,
        packageValue: 60,
    },
};
