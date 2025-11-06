import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneDropdown,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as strings from 'LiveListWebPartStrings';
import { ILiveListProps } from './components/ILiveListProps';
import * as React from 'react';
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import { IPagedDataService, isSubscribable } from '../../services/dataServices/IPagedDataService';
import { DataServiceFactory } from '../../services/dataServices/DataServiceFactory';
import LiveList from './components/LiveList';
import { PropertyPaneHelper } from '../../services/PropertyPaneHelper';

export interface ILiveListWebPartProps {
  description: string;
  listId: string;

  onlyCurrentUser: boolean;
  sourceType: string;
  sourceOptions: any;
}
export default class LiveListWebPart extends BaseClientSideWebPart<ILiveListWebPartProps> {


  private _dataService: IPagedDataService<any> | null = null;
  private _listOptions: any[] = [];
  private _listsLoaded = false;

  private _updateHandler: () => void;

  public async onInit(): Promise<void> {
    await super.onInit();
    this.context.propertyPane.open();
    this.render();
  }

  private _initDataService(): void {
    if (!this.properties.sourceType || !this.properties.listId) return;

    if (this._dataService && isSubscribable(this._dataService)) {
      this._dataService.disposeSubscription();
      this._dataService = null;
    }

    const options = {
      listId: this.properties.listId,
      onlyCurrentUser: this.properties.onlyCurrentUser
    };

    const handleUpdate = () => {
      if (this._updateHandler) {
        this._updateHandler();
      } else {
        console.warn('[WebPart] Update triggered but no handler registered');
      }
    };

    this._dataService = DataServiceFactory.create(
      this.properties.sourceType,
      options,
      this,
      handleUpdate
    );


  }

  public render(): void {

    if (!this._dataService) {
      const message = React.createElement('div',
        { style: { padding: '20px', textAlign: 'center', color: '#666' } },
        React.createElement('h3', null, 'Configure Web Part'),
        React.createElement('p', null, 'Please select a data source in the property pane.')
      );
      ReactDom.render(message, this.domElement);
      return;
    }

    const element: React.ReactElement<ILiveListProps> = React.createElement(
      LiveList,
      {
        description: this.properties.description,
        dataService: this._dataService,
        context: this.context,
        registerUpdateHandler: (handler) => {
          this._updateHandler = handler;
        }
      }
    );
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {

    if (isSubscribable(this._dataService))
      this._dataService.disposeSubscription();

    ReactDom.unmountComponentAtNode(this.domElement);
  }


  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected async onPropertyPaneConfigurationStart(): Promise<void> {

    if (!this._listsLoaded) {
      this._listOptions = await PropertyPaneHelper.getSharePointLists(this.context);
      this._listsLoaded = true;
      this.context.propertyPane.refresh();
    }
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {

    const groups: any[] = [
      {
        groupName: 'DataSource',
        groupFields: [
          PropertyPaneDropdown('sourceType', {
            label: 'Source Type',
            options: PropertyPaneHelper.getDataSourceOptions(),
            selectedKey: this.properties.sourceType
          }),
          PropertyPaneDropdown('listId', {
            label: 'Select List',
            options: this._listsLoaded ? this._listOptions : [{ key: '', text: 'loading...' }],
            selectedKey: this.properties.listId,
            disabled: !this._listsLoaded || !this.properties.sourceType
          }),
          PropertyPaneToggle('onlyCurrentUser', { label: 'Only current user tasks' })
        ]
      },
      {
        groupName: 'General',
        groupFields: [
          PropertyPaneTextField('description', { label: strings.DescriptionFieldLabel })
        ]
      }
    ];

    return { pages: [{ header: { description: 'Configure Live List' }, groups }] };
  }
  protected onPropertyPaneFieldChanged(propertyPath: string, oldValue: any, newValue: any): void {
    super.onPropertyPaneFieldChanged(propertyPath, oldValue, newValue);

    let shouldInitService = false;
    let shouldReloadLists = false;

    switch (propertyPath) {
      case 'sourceType':
        if (oldValue !== newValue) {
          this.properties.listId = '';
          this._dataService = null;
          shouldReloadLists = true;
        }
        break;

      case 'listId':
        if (newValue) {
          shouldInitService = true;
        }
        break;

      case 'onlyCurrentUser':
        if (this._dataService) {
          shouldInitService = true;
        }
        break;
    }

    if (shouldReloadLists) {
      PropertyPaneHelper.clearCache();
      this._listsLoaded = false;
      PropertyPaneHelper.getSharePointLists(this.context).then(options => {
        this._listOptions = options;
        this._listsLoaded = true;
        this.context.propertyPane.refresh();
      });
    }

    if (shouldInitService) {
      this._initDataService();
    }

    this.render();
  }
}