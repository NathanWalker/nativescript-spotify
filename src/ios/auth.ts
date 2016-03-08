import {NSSpotifyConstants} from '../common';

declare var SPTAuth: any;
declare var SPTSession: any;

export class NSSpotifyAuth {
  public static REDIRECT_URL: string;
  public static TOKEN_REFRESH_ENDPOINT: string;
  public static SESSION: SPTSession;
  
  public static LOGIN() {
    SPTAuth.defaultInstance().clientID = NSSpotifyConstants.CLIENT_ID;
    SPTAuth.defaultInstance().redirectURL = NSURL.URLWithString(NSSpotifyAuth.REDIRECT_URL);
    SPTAuth.defaultInstance().requestedScopes = [SPTAuthStreamingScope, SPTAuthUserReadPrivateScope, SPTAuthUserReadEmailScope, SPTAuthUserLibraryModifyScope, SPTAuthUserLibraryReadScope, SPTAuthPlaylistReadPrivateScope, SPTAuthPlaylistModifyPrivateScope, SPTAuthPlaylistModifyPublicScope, 'playlist-read-collaborative']; // no constant for last one: https://github.com/spotify/ios-sdk/issues/423
    let url = SPTAuth.defaultInstance().loginURL;
    UIApplication.sharedApplication().openURL(url);
  }
  
  public static HANDLE_AUTH_CALLBACK(url) {
    // Ask SPTAuth if the URL given is a Spotify authentication callback
    // if (SPTAuth.defaultInstance().canHandleURLWithDeclaredRedirectURL(url, NSURL.URLWithString(NSSpotifyPlayer.REDIRECT_URL))) { 
    NSNotificationCenter.defaultCenter().postNotificationNameObject(NSSpotifyConstants.NOTIFY_LOGIN_CHECK, null);
    if (SPTAuth.defaultInstance().canHandleURL(url)) { 
      SPTAuth.defaultInstance().handleAuthCallbackWithTriggeredAuthURLCallback(url, (error, session) => {
        if (error != null) {
            console.log(`*** Auth error: ${error}`);
            return;
        }
        
        NSSpotifyAuth.SAVE_SESSION(session);
        
        NSNotificationCenter.defaultCenter().postNotificationNameObject(NSSpotifyConstants.NOTIFY_LOGIN_SUCCESS, null);
             
        return true;
      });
    }
  }
  
  public static INIT_SESSION(): Promise<any> {
    return new Promise((resolve, reject) => {
      let sessionObj = NSSpotifyAuth.GET_STORED_SESSION();
      if (sessionObj) {
        // check if refresh needed
        let sessionData = sessionObj; // NSData
        let session = NSKeyedUnarchiver.unarchiveObjectWithData(sessionData);

        if (session) {
          
          if (!session.isValid()) {
            // renew session
    
            NSSpotifyAuth.RENEW_SESSION(session).then(resolve, reject);
          } else {
            NSSpotifyAuth.SESSION = session;
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
    NSSpotifyAuth.SESSION = session;
    let userDefaults = NSUserDefaults.standardUserDefaults();
    let sessionData = NSKeyedArchiver.archivedDataWithRootObject(session);
    userDefaults.setObjectForKey(sessionData, NSSpotifyConstants.KEY_STORE_SESSION);
    userDefaults.synchronize();
  }
  
  public static GET_STORED_SESSION(): any {
    let userDefaults = NSUserDefaults.standardUserDefaults();
    return userDefaults.objectForKey(NSSpotifyConstants.KEY_STORE_SESSION);
  }
  
  public static RENEW_SESSION(session: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // SPTAuth.defaultInstance().renewSessionWithServiceEndpointAtURLCallback(session, NSURL.URLWithString(NSSpotifyAuth.TOKEN_REFRESH_ENDPOINT), (error, session) => {
      SPTAuth.defaultInstance().renewSessionCallback(session, (error, session) => {
        if (error != null) {
          console.log(`*** Renew session error: ${error}`);
          reject();
          return;
        }
        
        NSSpotifyAuth.SAVE_SESSION(session);
        resolve();
      });
    });
  }
}