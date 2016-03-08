import {Observable, EventData} from 'data/observable';
import {Page, ShownModallyData} from 'ui/page';
import {topmost} from 'ui/frame';
import {NSSpotifyPlaylist, Utils} from 'nativescript-spotify';

declare var UIModalPresentationStyle: any;
var listModal: PlaylistModal;
var page: Page;

export class PlaylistModal extends Observable {
  public items: any;
  public closeCallback: Function;
  
  constructor() {
    super();
    //burkeholland
    NSSpotifyPlaylist.FOR_USER('1262698748').then((list) => {
      console.log('modal got list -------------------------------------');
      console.log(list);
    });
  }
  
  public onModalTap(args: EventData) {
    console.log(">>> onModalTap");
    let page = (<any>args.object).page;

    if (this.closeCallback) {
      console.log('closing modal with closeCallback and Utils.closeModal');
      this.closeCallback('something here...');
      Utils.closeModal(page);
    } else {
      console.log('closing modal with topmost().goBack');
        topmost().goBack();
    }
  }
}

export function onShowingModally(args: EventData) {
    console.log(">>> playlist-modal.onShowingModally");
    var modalPage = <Page>args.object;
    if (modalPage.ios && modalPage.ios.modalPresentationStyle === UIModalPresentationStyle.UIModalPresentationFullScreen) {
        console.log(">>> Setting modalPage.ios.modalPresentationStyle to UIModalPresentationStyle.UIModalPresentationOverFullScreen");
        modalPage.ios.modalPresentationStyle = UIModalPresentationStyle.UIModalPresentationOverFullScreen;
    }
}

export function onShownModally(args: ShownModallyData) {
    console.log(">>> playlist-modal.onShownModally, context: " + args.context);

    if (!listModal) {
      listModal = new PlaylistModal();  
    }  
    listModal.closeCallback = args.closeCallback;
    var modalPage = <Page>args.object;

    if (topmost().currentPage.modal !== args.object) {
        throw new Error(`topmost().currentPage.modal.id: ${topmost().currentPage.modal.id}; modalPage.id: ${modalPage.id}`);
    }
}

export function onLoaded(args: EventData) {
    console.log(">>> playlist-modal.onLoaded");
    var page = <Page>args.object;
  
  if (!listModal) {
    listModal = new PlaylistModal();  
  } 
  page.bindingContext = listModal;
}