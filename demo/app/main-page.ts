var frameModule = require("ui/frame");
import {SpotifyDemo} from "./main-view-model";

function pageLoaded(args) {
  var page = args.object;
  page.bindingContext = new SpotifyDemo();
  
  var controller = frameModule.topmost().ios.controller;
  var navigationBar = controller.navigationBar;
  navigationBar.barStyle = 1;
}
exports.pageLoaded = pageLoaded;
