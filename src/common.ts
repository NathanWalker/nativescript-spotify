import * as app from 'application';
import * as dialogs from 'ui/dialogs';

export interface TrackMetadataI {
  albumName: string;
  albumUri: string;
  artistName: string;
  artistUri: string;
  trackDuration: string;
  trackName: string;
  trackUri: string;
}

export class Utils {
  
  public static alert(msg: string): Promise<any> {
    return dialogs.alert(msg);
  }
  
  public static openModal(page: any, view: string, closeCallback: Function, fullscreen: boolean) {
    page.showModal(view, "Context from showModal", closeCallback, fullscreen);
  }
  
  public static closeModal(page: any) {
    page.closeModal();
  }
}