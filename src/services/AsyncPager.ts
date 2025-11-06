export class AsyncPager<T> {
    private iterator: AsyncIterator<T[]>;
    private pages: T[][] = [];
    private pagePointer = -1;
    private isDone = false;

    constructor(iterable: AsyncIterable<T[]>) {
        this.iterator = iterable[Symbol.asyncIterator]()
    }

    async next(): Promise<T[]> {

        const page = this.pages[++this.pagePointer];
        if (typeof page === "undefined") {
            if (this.isDone) {
                --this.pagePointer;
            } else {
                const next = await this.iterator.next();
                if (next.done) {
                    this.isDone = true;
                    --this.pagePointer;
                } else {
                    this.pages.push(next.value);
                }
            }
        }
        return this.pages[this.pagePointer] || [];
    }

    async prev(): Promise<T[]> {
        if (this.pagePointer < 1) {
            return this.pages[0] || [];
        }
        return this.pages[--this.pagePointer];
    }

    getCurrentPage(): number {
        return this.pagePointer + 1;
    }

    hasNext(): boolean {
        return (this.pagePointer < this.pages.length - 1) || !this.isDone;
    }

    hasPrev(): boolean {
        return this.pagePointer > 0;
    }
}
