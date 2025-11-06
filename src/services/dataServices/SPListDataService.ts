import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import { AsyncPager } from "../AsyncPager";
import { IPagedDataService, ISubscribeDataService } from "./IPagedDataService";
import { IListSubscription, ListSubscriptionFactory } from "@microsoft/sp-list-subscription";
import { SPFI } from "@pnp/sp/presets/all";
import { Guid } from "@microsoft/sp-core-library";
import "@pnp/sp/lists"
import "@pnp/sp/webs"
import "@pnp/sp/items"


export interface SPListServiceConfig {
    sp: SPFI;
    listId: string;
    onlyCurrentUser: boolean;
    query: {
        filter?: string;
        orderBy?: string;
        orderDesc?: boolean;
        pageSize: number;
    }
}

export class SPListDataService<T> implements IPagedDataService<T>, ISubscribeDataService {

    TotalCount: number;

    private pager: AsyncPager<T>;
    private sp: SPFI;
    private listId: string;

    private webBase: BaseClientSideWebPart<any>;
    private subscription?: IListSubscription;
    private subscriptionFactory?: ListSubscriptionFactory;
    private onUpdateCallback?: () => void;


    private filter?: string;
    private orderBy?: string;
    private orderDesc?: boolean;
    private pageSize: number;
    private onlyCurrentUser: boolean;

    constructor(options: SPListServiceConfig, webBase: BaseClientSideWebPart<any>, onUpdate: () => void) {

        this.sp = options.sp;
        this.listId = options.listId
        this.webBase = webBase;

        this.pageSize = options.query.pageSize;
        this.filter = options.query.filter;
        this.orderBy = options.query.orderBy;
        this.orderDesc = options.query.orderDesc;
        this.onlyCurrentUser = options.onlyCurrentUser ?? false;
        const query = this.buildQuery();

        this.pager = new AsyncPager<T>(query);

        this.setupSubscription(onUpdate)
    }

    private buildQuery(): AsyncIterable<T[]> {

        let query = this.sp.web.lists.getById(this.listId).items
        if (this.onlyCurrentUser) {
            const userId = this.webBase.context.pageContext.legacyPageContext.userId;
            query = query.filter(`AssignedTo/Id eq ${userId}`);
        }

        if (this.filter) {
            query = query.filter(this.filter)
        }
        if (this.orderBy) {
            query = query.orderBy(this.orderBy, this.orderDesc || false)
        }
        query = query.top(this.pageSize)
        return query;
    }

   

    public setPageSize(size: number) {
        this.pageSize = size;

        this.pager = new AsyncPager(this.buildQuery())
    }

    async next(): Promise<T[]> {
        try {
            return await this.pager.next();
        } catch (errror) {
            return [];
        }
    }

    async prev(): Promise<T[]> {
        try {
            return await this.pager.prev();
        } catch (errror) {
            return [];
        }
    }

    hasNext(): boolean {
        return this.pager.hasNext();
    }

    hasPrev(): boolean {
        return this.pager.hasPrev();
    }

    getCurrentPage(): number {
        return this.pager.getCurrentPage();
    }



    async setupSubscription(onUpdate: () => void): Promise<void> {
        if (!this.webBase.context || !this.listId) {
            console.warn("[SPListDataService] Missing context or listId for subscription");
            return;
        }
        
        try {
            this.onUpdateCallback = onUpdate;
            
            if (this.subscription) {
                 this.disposeSubscription();
            }
            
            this.subscriptionFactory = new ListSubscriptionFactory(this.webBase);

            this.subscription = await this.subscriptionFactory.createSubscription({
                listId: Guid.parse(this.listId),
                callbacks: {
                    notification: async () => {
                        if (this.onUpdateCallback) {
                            this.onUpdateCallback();
                        } else {
                            console.warn("[SPListDataService] No update callback registered");
                        }
                    },
                    connect: () => { 
                        // console.log("[SPListDataService] Successfully subscribed to list:", this.listId);
                    },
                    disconnect: (reason?: string) => {
                        // console.log("[SPListDataService] Disconnected from list subscription.", reason ? `Reason: ${reason}` : "");
                    },
                }
            });
            
        } catch (err) {
            console.error("[SPListDataService] Failed to setup subscription:", err);
            throw err; 
        }
    }

    async getTotalCount(): Promise<number> {
        const totalCount = await this.sp.web.lists.getById(this.listId).select("ItemCount")();
        if (totalCount) {
            return totalCount.ItemCount;
        }
        return 0;

    }

    disposeSubscription(): void {
        if (this.subscription && this.subscriptionFactory) {
            this.subscriptionFactory.deleteSubscription(this.subscription);
            this.subscription = undefined;
        }
    }

}