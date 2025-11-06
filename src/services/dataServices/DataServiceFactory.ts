import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base"
import { IPagedDataService, } from "./IPagedDataService";
import { SPListDataService, SPListServiceConfig } from "./SPListDataService";
import { SPFI, spfi, SPFx } from "@pnp/sp";

export class DataServiceFactory {
    static create<T>(
        type: string,
        options: Partial<SPListServiceConfig>,
        base: BaseClientSideWebPart<any>,
        onUpdate?: () => void
    ): IPagedDataService<T> {

        switch (type) {
            case 'sharepoint': {
                const sp: SPFI = spfi().using(SPFx(base.context));
                const config: SPListServiceConfig = {
                    sp: sp,
                    listId: options.listId || '',
                    onlyCurrentUser: options.onlyCurrentUser ?? false,
                    query: {
                        pageSize: options.query?.pageSize ?? 5,
                    },
                };
                if (!onUpdate) {
                    throw new Error('onUpdate callback is required');
                }
                return new SPListDataService<T>(config, base, onUpdate);
            }
            default:
                throw new Error(`No such source type: ${type}`)
        }
    }
}