import * as application from 'application';
import {TNSSpotifyConstants, TNSSpotifyAuth} from 'nativescript-spotify';

class MyDelegate extends UIResponder {
  public static ObjCProtocols = [UIApplicationDelegate];
  
  public applicationDidFinishLaunchingWithOptions(application: UIApplication, launchOptions: NSDictionary): boolean {
    
    TNSSpotifyConstants.CLIENT_ID = 'your spotify client id here';
    TNSSpotifyAuth.REDIRECT_URL = 'tnsspotify://spotifylogin';
    return true;
  }
  
  public applicationOpenURLSourceApplicationAnnotation(application, url, sourceApplication, annotation) { 
    return TNSSpotifyAuth.HANDLE_AUTH_CALLBACK(url);
  }
}
application.ios.delegate = MyDelegate;
application.mainModule = "main-page";
application.cssFile = "./app.css";
application.start();