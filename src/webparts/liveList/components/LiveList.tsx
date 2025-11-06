import * as React from 'react';
import styles from './LiveList.module.scss';
import type { ILiveListProps } from './ILiveListProps';
import { DetailsList, Dropdown, IColumn, IDropdownOption, PrimaryButton, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { IPagedDataService } from '../../../services/dataServices/IPagedDataService';

export interface IListItem {
  Id: number;
  Title: string;
  Category: string;
  Priority: string;
  DeadLine: Date;
  CreateAt: Date;
}

export interface ILiveListState {
  items: IListItem[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  loading: boolean;
  lastUpdate?: number;
}

export default class LiveList extends React.Component<ILiveListProps, ILiveListState> {

  private dataService: IPagedDataService<IListItem>
  private _lastUpdate: Date = new Date();

  private columns: IColumn[] = [
    { key: 'col2', name: 'Title', fieldName: 'Title', minWidth: 100, maxWidth: 200 },
    { key: 'col3', name: 'Category', fieldName: 'Category', minWidth: 100, maxWidth: 200 },
    { key: 'col4', name: 'Priority', fieldName: 'Priority', minWidth: 100, maxWidth: 200 },
    {
      key: 'col5', name: 'DeadLine', fieldName: 'DeadLine', minWidth: 100, maxWidth: 200,
      onRender: item => item.DeadLine ? new Date(item.DeadLine).toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      }) : '—'
    },
    {
      key: 'col6', name: 'Task created at', fieldName: 'CreatedAt', minWidth: 100, maxWidth: 200,
      onRender: item => item.CreatedAt ? new Date(item.CreatedAt).toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      }) : '—'
    }
  ];

  private pageSizeOptions: IDropdownOption[] = [
    { key: 5, text: '5 items' },
    { key: 10, text: '10 items' },
    { key: 20, text: '20 items' },
    { key: 50, text: '50 items' }
  ];


  constructor(props: ILiveListProps) {
    super(props);

    this.dataService = props.dataService;
    this.state = {
      items: [],
      currentPage: 1,
      pageSize: 5,
      totalItems: 0,
      loading: true,
      lastUpdate: Date.now()
    };

    this.handleUpdate = this.handleUpdate.bind(this);
  }

  private handleUpdate(): void {
    const timestamp = Date.now();
    this.setState({
      lastUpdate: timestamp,
      loading: true
    }, async () => {
      try {
        await this.loadFirstPage();
      } catch (error) {
        console.error("[LiveList] Failed to reload data:", error);
        this.setState({ loading: false });
      }
    });
  }

  async componentDidMount(): Promise<void> {
    if (this.props.registerUpdateHandler) {
      this.props.registerUpdateHandler(this.handleUpdate);
    }

    await this.loadFirstPage();
  }
  async componentDidUpdate(prevProps: ILiveListProps, prevState: ILiveListState): Promise<void> {
    if (prevProps.dataService !== this.props.dataService) {
      this.dataService = this.props.dataService;

      if (this.props.registerUpdateHandler) {
        this.props.registerUpdateHandler(this.handleUpdate);
      }

      this.setState({
        items: [],
        currentPage: 1,
        pageSize: 5,
        totalItems: 0,
        loading: true,
        lastUpdate: Date.now()
      }, () => this.loadFirstPage());
      return;
    }

    if (prevState.lastUpdate !== this.state.lastUpdate) {
      this._lastUpdate = new Date();
      if (!this.state.loading) {
        try {
          await this.loadFirstPage();
        } catch (err) {
          console.error('[LiveList] Failed to reload after update:', err);
        }
      }
    }
  }

  private async loadFirstPage(): Promise<void> {
    this.setState({ loading: true });
    try {
      this.dataService.setPageSize(this.state.pageSize);

      const items = await this.dataService.next();
      const totalItems = await this.dataService.getTotalCount();

      // console.log('[LiveList] Loaded items:', items.length);

      const currentPage = this.dataService.getCurrentPage();
      this.setState({
        items: items,
        currentPage: currentPage,
        totalItems: totalItems,
        loading: false
      });

    } catch (err) {
      console.error('[LiveList] Failed to load first page:', err);
      this.setState({ items: [], loading: false });
    }
  }



  private async handleNext(): Promise<void> {
    if (!this.dataService.hasNext()) return;

    this.setState({ loading: true });


    const items = await this.dataService.next();
    const currentPage = this.dataService.getCurrentPage();

    this.setState({
      items:items,
      currentPage: currentPage,
      loading: false
    })
  }

  private async handlePrev(): Promise<void> {
    if (!this.dataService.hasPrev()) return;

    this.setState({ loading: true });

    const items = await this.dataService.prev();
    const currentPage = this.dataService.getCurrentPage();

    this.setState({
      items: items,
      currentPage: currentPage,
      loading: false
    });
  }

  private async handlePageSizeChange(option?: IDropdownOption): Promise<void> {
    if (!option) return;

    const newPageSize = option.key as number;

    this.setState({
      pageSize: newPageSize,
      loading: true
    });
    try {

      this.dataService.setPageSize(newPageSize);

      const items = await this.dataService.next();
      const currentPage = this.dataService.getCurrentPage();
      this.setState({
        items: items,
        currentPage: currentPage,
        loading: false
      });
    } catch (error) {
      console.error('[LiveList] Failed to change page size:', error);
      this.setState({ loading: false });
    }
  }

  public render(): React.ReactElement<ILiveListProps> {
    const { items, currentPage, pageSize, totalItems, loading } = this.state;
    const { description } = this.props;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;

    const canGoPrev = this.dataService.hasPrev() || false;
    const canGoNext = this.dataService.hasNext() || false;


    return (
      <Stack tokens={{ childrenGap: 20 }} >
        <div className={styles.liveList}>
          <div>
            <h3>{description} </h3>
            <h3>Aproximative total pages {totalPages} </h3>

            {loading ? (
              <Spinner size={SpinnerSize.large} label="loading" />
            ) : (
              <>
                <p>Last update: {this._lastUpdate?.toLocaleTimeString()}</p>
                <DetailsList
                  items={items}
                  columns={this.columns}
                  compact={true}
                  selectionMode={0}
                />
                <Stack
                  horizontal
                  horizontalAlign="space-between"
                  verticalAlign="center"
                  styles={{
                    root: {
                      padding: '20px 0',
                      borderTop: '1px solid #edebe9'
                    }
                  }}
                >
                  <PrimaryButton
                    text="Previous"
                    iconProps={{ iconName: 'ChevronLeft' }}
                    disabled={!canGoPrev || loading}
                    onClick={() => this.handlePrev()}
                  />

                  <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="center">
                    Page {currentPage} of ~{totalPages}
                    ({items.length} items)
                  </Stack>

                  <PrimaryButton
                    text="Next"
                    iconProps={{ iconName: 'ChevronRight' }}
                    disabled={!canGoNext || loading}
                    onClick={() => this.handleNext()}
                  /></Stack>
                <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="center">
                  <span>Items per page:</span>
                  <Dropdown
                    selectedKey={pageSize}
                    options={this.pageSizeOptions}
                    onChange={(e, option) => this.handlePageSizeChange(option)}
                    styles={{ dropdown: { width: 120 } }}
                    disabled={loading}
                  />
                </Stack>
              </>
            )}
          </div>
        </div>
      </Stack >
    );
  }
}
