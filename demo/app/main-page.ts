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



// export function goAway(args) {
//     var page = frame.topmost().currentPage;
//     var card = page.getViewById('batCard');
//     console.log(card);
//     card.animate({ 
//         scale: { x: 0, y: 0 },
//         opacity: 0,
//         duration: 1000
//     }).then(() => { 
//       card.visibility = 'collapsed'; 
//     });
// }

// export function goAwayJoker(args) {
//     var page = frame.topmost().currentPage;
//     var card = page.getViewById('jokerCard');
//     console.log(card);
//     card.animate({
//         scale: { x: 0, y: 0 },
//         opacity: 0,
//         duration: 1000
//     }).then(() => { 
//       card.visibility = 'collapsed'; 
//     });
// } 