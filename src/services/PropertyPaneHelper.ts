import { IPropertyPaneDropdownOption } from "@microsoft/sp-property-pane"
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { spfi, SPFI, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";

export interface IListInfo {
    key: string,
    text: string,
    listId: string,
    listUrl: string
}

export class PropertyPaneHelper {
    private static _listOptions: IPropertyPaneDropdownOption[] = []
    private static _loadingLists: boolean = false;
    private static _listsLoaded: boolean = false;


    public static getDataSourceOptions(): IPropertyPaneDropdownOption[] {
        return [
            { key: '', text: "Select a data source" },
            { key: 'sharepoint', text: "Sharepoint List" }
        ]
    }

    public static async getSharePointLists(context: WebPartContext, forceRefresh: boolean = false): Promise<IPropertyPaneDropdownOption[]> {

        if (this._listsLoaded && !forceRefresh && this._listOptions.length > 0)
            return this._listOptions;

        if (this._loadingLists)
            return [{ key: '', text: 'Loading lists...' }]
        try {
            this._loadingLists = true;

            const sp: SPFI = spfi().using(SPFx(context));
            
            const lists = await sp.web.lists
                .select('Id', 'Title', 'DfaultViewUrl', 'Hidden', 'BaseTemplate')
                .filter('Hidden eq false')();

            this._listOptions = [
                { key: '', text: 'Select a list' },
                ...lists
                    .filter(list =>
                        list.BaseTemplate === 100 ||
                        list.BaseTemplate === 101
                    )
                    .map(list => ({
                        key: list.Id,
                        text: list.Title
                    }))
                    .sort((a, b) => a.text.localeCompare(b.text))
            ];

            this._listsLoaded = true;
            return this._listOptions;
        } catch (error) {
            console.error('Error loading SharePoint lists:', error);
            return [{ key: '', text: 'Error loading lists' }];
        } finally {
            this._loadingLists = false;
        }

    }

    public static clearCache(): void {
        this._listOptions = [];
        this._listsLoaded = false;
        this._loadingLists = false;
    }
}