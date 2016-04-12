import {TNSSpotifyConstants} from '../common';

declare var SPTAuth, SPTSession, SPTUser, SPTAuthStreamingScope, SPTAuthUserReadPrivateScope, SPTAuthUserReadEmailScope, SPTAuthUserLibraryModifyScope, SPTAuthUserLibraryReadScope, SPTAuthPlaylistReadPrivateScope, SPTAuthPlaylistModifyPrivateScope, SPTAuthPlaylistModifyPublicScope, UIApplication, NSURL, NSUserDefaults, NSNotificationCenter, NSKeyedArchiver, NSKeyedUnarchiver;

class TNSSpotifyAuthDelegate extends NSObject {
  public static ObjCProtocols = [SPTAuthViewDelegate];

  public authenticationViewControllerDidLoginWithSession(ctrl, session) {
    TNSSpotifyAuth.LOGIN_WITH_SESSION(session);
  }

  public authenticationViewControllerDidFailToLogin(ctrl, error) {
    console.log(error);
    NSNotificationCenter.defaultCenter().postNotificationNameObject(TNSSpotifyConstants.NOTIFY_LOGIN_ERROR, error);
  }

  public authenticationViewControllerDidCancelLogin(ctrl) {
    console.log('User canceled login.');
  }
}

export class TNSSpotifyAuth {
  public static REDIRECT_URL: string;
  public static TOKEN_REFRESH_ENDPOINT: string;
  public static SESSION: SPTSession;
  
  public static LOGIN() {
    SPTAuth.defaultInstance().clientID = TNSSpotifyConstants.CLIENT_ID;
    SPTAuth.defaultInstance().redirectURL = NSURL.URLWithString(TNSSpotifyAuth.REDIRECT_URL);
    SPTAuth.defaultInstance().requestedScopes = [SPTAuthStreamingScope, SPTAuthUserReadPrivateScope, SPTAuthUserReadEmailScope, SPTAuthUserLibraryModifyScope, SPTAuthUserLibraryReadScope, SPTAuthPlaylistReadPrivateScope, SPTAuthPlaylistModifyPrivateScope, SPTAuthPlaylistModifyPublicScope, 'playlist-read-collaborative']; // no constant for last one: https://github.com/spotify/ios-sdk/issues/423
    
    // let url = SPTAuth.defaultInstance().loginURL;
    // UIApplication.sharedApplication().openURL(url);
    let authvc = SPTAuthViewController.authenticationViewController();
    authvc.delegate = new TNSSpotifyAuthDelegate();
    authvc.modalPresentationStyle = UIModalPresentationOverCurrentContext;
    authvc.modalTransitionStyle = UIModalTransitionStyleCrossDissolve;
    let rootview = UIApplication.sharedApplication().keyWindow.rootViewController;
    rootview.modalPresentationStyle = UIModalPresentationCurrentContext;
    rootview.definesPresentationContext = true;
    rootview.presentViewControllerAnimatedCompletion(authvc, true, null);
  }
  
  public static LOGOUT() {
    TNSSpotifyAuth.SESSION = undefined;
    let userDefaults = NSUserDefaults.standardUserDefaults();
    userDefaults.removeObjectForKey(TNSSpotifyConstants.KEY_STORE_SESSION);
    userDefaults.synchronize();
    NSNotificationCenter.defaultCenter().postNotificationNameObject(TNSSpotifyConstants.NOTIFY_AUTH_LOGIN_CHANGE, false);
  }
  
  public static HANDLE_AUTH_CALLBACK(url) {
    // Ask SPTAuth if the URL given is a Spotify authentication callback
    NSNotificationCenter.defaultCenter().postNotificationNameObject(TNSSpotifyConstants.NOTIFY_LOGIN_CHECK, null);
    if (SPTAuth.defaultInstance().canHandleURL(url)) { 
      SPTAuth.defaultInstance().handleAuthCallbackWithTriggeredAuthURLCallback(url, (error, session) => {
        if (error != null) {
            console.log(`*** Auth error: ${error}`);
            return;
        }
        
        TNSSpotifyAuth.SAVE_SESSION(session);
        NSNotificationCenter.defaultCenter().postNotificationNameObject(TNSSpotifyConstants.NOTIFY_LOGIN_SUCCESS, null);
        return true;
      });
    }
  }

  public static LOGIN_WITH_SESSION(session) {
    TNSSpotifyAuth.SAVE_SESSION(session);
    NSNotificationCenter.defaultCenter().postNotificationNameObject(TNSSpotifyConstants.NOTIFY_LOGIN_SUCCESS, null);
  }  
  
  public static INIT_SESSION(): Promise<any> {
    return new Promise((resolve, reject) => {
      let sessionObj = TNSSpotifyAuth.GET_STORED_SESSION();
      if (sessionObj) {
        // check if refresh needed
        let sessionData = sessionObj; // NSData
        let session = NSKeyedUnarchiver.unarchiveObjectWithData(sessionData);

        if (session) {
          
          if (!session.isValid()) {
            // renew session
            TNSSpotifyAuth.RENEW_SESSION(session).then(resolve, reject);
          } else {
            TNSSpotifyAuth.SESSION = session;
            resolve();
          }
        } else {
          reject();
        }     
      } else {
        reject();
      }
    });
  }
  
  public static SAVE_SESSION(session): void {
    TNSSpotifyAuth.SESSION = session;
    let userDefaults = NSUserDefaults.standardUserDefaults();
    let sessionData = NSKeyedArchiver.archivedDataWithRootObject(session);
    userDefaults.setObjectForKey(sessionData, TNSSpotifyConstants.KEY_STORE_SESSION);
    userDefaults.synchronize();
  }
  
  public static GET_STORED_SESSION(): any {
    // https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTSession.html
    let userDefaults = NSUserDefaults.standardUserDefaults();
    return userDefaults.objectForKey(TNSSpotifyConstants.KEY_STORE_SESSION);
  }
  
  public static RENEW_SESSION(session: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // SPTAuth.defaultInstance().renewSessionWithServiceEndpointAtURLCallback(session, NSURL.URLWithString(TNSSpotifyAuth.TOKEN_REFRESH_ENDPOINT), (error, session) => {
      SPTAuth.defaultInstance().renewSessionCallback(session, (error, session) => {
        if (error != null) {
          console.log(`*** Renew session error: ${error}`);
          reject();
          return;
        }
        
        TNSSpotifyAuth.SAVE_SESSION(session);
        resolve();
      });
    });
  }
  
  public static CURRENT_USER(): Promise<any> {
    // https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTUser.html
    return new Promise((resolve, reject) => {
      if (TNSSpotifyAuth.SESSION) {
        SPTUser.requestCurrentUserWithAccessTokenCallback(TNSSpotifyAuth.SESSION.accessToken, (error, user) => {
          if (error != null) {
            console.log(`*** Request current user error: ${error}`);
            reject();
            return;
          }
          resolve(user);
        });
      } else {
        reject();
      }
    });
    
  }
}