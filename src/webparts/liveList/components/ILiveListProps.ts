import { WebPartContext } from "@microsoft/sp-webpart-base";
import { IPagedDataService } from "../../../services/dataServices/IPagedDataService";


export interface ILiveListProps {
  context: WebPartContext;
  description: string;
  dataService: IPagedDataService<any>
  registerUpdateHandler?: (handler: () => void) => void;
}
