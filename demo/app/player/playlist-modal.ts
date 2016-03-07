import {Observable, EventData} from 'data/observable';
import {Page, ShownModallyData} from 'ui/page';
import {topmost} from 'ui/frame';
import {Utils} from 'nativescript-spotify';

declare var UIModalPresentationStyle: any;
var closeCallback: Function;

var page: Page;
// var usernameTextField: textField.TextField;
// var passwordTextField: textField.TextField;

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

    closeCallback = args.closeCallback;
    var modalPage = <Page>args.object;

    if (topmost().currentPage.modal !== args.object) {
        throw new Error(`topmost().currentPage.modal.id: ${topmost().currentPage.modal.id}; modalPage.id: ${modalPage.id}`);
    }
}

export function onLoaded(args: EventData) {
    console.log(">>> playlist-modal.onLoaded");
    page = <Page>args.object;
    // usernameTextField = page.getViewById<textField.TextField>("username");
    // passwordTextField = page.getViewById<textField.TextField>("password");
}

export function onModalTap(args: EventData) {
  console.log(">>> playlist-modal.onLoginButtonTap");
  let page = (<any>args.object).page;

    if (closeCallback) {
      closeCallback('something here...');
      Utils.closeModal(page);
    }
    else {
        topmost().goBack();
    }
}