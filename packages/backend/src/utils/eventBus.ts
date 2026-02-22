import EventEmitter from 'events';

class EventBus extends EventEmitter {
    private static instance: EventBus;

    private constructor() {
        super();
    }

    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
}

export const eventBus = EventBus.getInstance();

export enum AppEvents {
    LEAVE_REQUEST_CREATED = 'LEAVE_REQUEST_CREATED',
    LEAVE_REQUEST_APPROVED = 'LEAVE_REQUEST_APPROVED',
    LEAVE_REQUEST_REJECTED = 'LEAVE_REQUEST_REJECTED',
}
