import * as app from "application";
import { topmost } from "ui/frame";
import { isIOS, isAndroid, device } from "platform";
import { Color } from "color";
import { SpotifyDemo } from "./main-view-model";

function pageLoaded(args) {
  console.log('pageLoaded');
  
  let page = args.object;
  page.bindingContext = new SpotifyDemo();

  if (isIOS) {
    let controller = topmost().ios.controller;
    let navigationBar = controller.navigationBar;
    navigationBar.barStyle = 1;
  }

  if (isAndroid && device.sdkVersion >= "21") {
    let window = app.android.startActivity.getWindow();
    window.setStatusBarColor(new Color("#000").android);
  }

}
exports.pageLoaded = pageLoaded;
