export interface IPagedDataService<T> {

    next(): Promise<T[]>;

    prev(): Promise<T[]>;

    hasNext(): boolean;

    hasPrev(): boolean;

    getCurrentPage(): number;

    setPageSize(size: number): void;

    getTotalCount(): Promise<number>;

}

export interface ISubscribeDataService {
    setupSubscription(onUpdate: () => void): Promise<void>;
    disposeSubscription(): void;
}

export function isSubscribable(obj: any): obj is ISubscribeDataService {
    return obj && typeof obj.disposeSubscription === 'function';
}
