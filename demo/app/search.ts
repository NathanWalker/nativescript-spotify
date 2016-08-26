var frameModule = require("ui/frame");
import {SpotifySearchDemo} from "./search-view-model";
import { isIOS, isAndroid, device } from "platform";

function pageLoaded(args) {
  var page = args.object;
  page.bindingContext = new SpotifySearchDemo();
  
  if (isIOS) {
    var controller = frameModule.topmost().ios.controller;
    var navigationBar = controller.navigationBar;
    navigationBar.barStyle = 1;
  }
}

function btnLoaded(e: any) {
  if (isAndroid) {
    let btn = e.object;
    btn.android.setFocusable(false);
  }
}
exports.pageLoaded = pageLoaded;
exports.btnLoaded = btnLoaded;
