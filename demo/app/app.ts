var application = require("application");
import {NSSpotifyConstants, NSSpotifyAuth} from 'nativescript-spotify';

class MyDelegate extends UIResponder implements UIApplicationDelegate {
  public static ObjCProtocols = [UIApplicationDelegate];
  
  public applicationDidFinishLaunchingWithOptions(application: UIApplication, launchOptions: NSDictionary): boolean {
    
    NSSpotifyConstants.CLIENT_ID = '6dbefaf3f1694251890847d9490e15f3';
    NSSpotifyAuth.REDIRECT_URL = 'pocketrave://spotifylogin';

    return true;
  }
  
  public applicationOpenURLSourceApplicationAnnotation(application, url, sourceApplication, annotation) { 
    return NSSpotifyAuth.HANDLE_AUTH_CALLBACK(url);
  }

  public applicationDidBecomeActive(application: UIApplication): void {
    console.log("applicationDidBecomeActive: " + application);
  }
}
application.ios.delegate = MyDelegate;
application.mainModule = "main-page";
application.cssFile = "./app.css";
application.start();