var application = require("application");
import {Spotify} from 'nativescript-spotify';

class MyDelegate extends UIResponder implements UIApplicationDelegate {
  public static ObjCProtocols = [UIApplicationDelegate];
  
  public applicationDidFinishLaunchingWithOptions(application: UIApplication, launchOptions: NSDictionary): boolean {
    

    // Construct a login URL and open it
    // let loginURL = SPTAuth.defaultInstance().loginURL;
    
    // // Opening a URL in Safari close to application launch may trigger
    // // an iOS bug, so we wait a bit before doing so.
    // application.performSelectorWithObjectAfterDelay('openURL:', loginURL, 0.1);
    
    Spotify.CLIENT_ID = '6dbefaf3f1694251890847d9490e15f3';
    Spotify.REDIRECT_URL = 'pocketrave://spotifylogin';

    return true;
  }
  
  public applicationOpenURLSourceApplicationAnnotation(application, url, sourceApplication, annotation) {
    
    return Spotify.HANDLE_AUTH_CALLBACK(url);

    // return false;
  }

  // -(void)playUsingSession:(SPTSession *)session {
      
  //     // Create a new player if needed
  //     if (self.player == nil) {
  //         self.player = [[SPTAudioStreamingController alloc] initWithClientId:[SPTAuth defaultInstance].clientID];
  //     }
      
  //     [self.player loginWithSession:session callback:^(NSError *error) {
  //         if (error != nil) {
  //             NSLog(@"*** Logging in got error: %@", error);
  //             return;
  //         }

  //         NSURL *trackURI = [NSURL URLWithString:@"spotify:track:58s6EuEYJdlb0kO7awm3Vp"];
  //         [self.player playURIs:@[ trackURI ] fromIndex:0 callback:^(NSError *error) {
  //             if (error != nil) {
  //                 NSLog(@"*** Starting playback got error: %@", error);
  //                 return;
  //             }
  //         }];
  //     }];
  // }

  public applicationDidBecomeActive(application: UIApplication): void {
    console.log("applicationDidBecomeActive: " + application);
  }
}
application.ios.delegate = MyDelegate;
application.mainModule = "main-page";
application.cssFile = "./app.css";
application.start();