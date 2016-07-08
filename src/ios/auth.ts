import {Observable, EventData} from 'data/observable';
import {TNSSpotifyConstants} from '../common';
import {TNSSpotifyNotificationObserver} from './notification';

declare var SPTAuth, SPTAuthViewDelegate, SPTAuthViewController, SPTSession, SPTUser, SPTAuthStreamingScope, SPTAuthUserReadPrivateScope, SPTAuthUserReadEmailScope, SPTAuthUserLibraryModifyScope, SPTAuthUserLibraryReadScope, SPTAuthPlaylistReadPrivateScope, SPTAuthPlaylistModifyPrivateScope, SPTAuthPlaylistModifyPublicScope, UIApplication, NSURL, NSUserDefaults, NSNotificationCenter, NSKeyedArchiver, NSKeyedUnarchiver, UIModalPresentationOverCurrentContext, UIModalTransitionStyleCrossDissolve, UIModalPresentationCurrentContext;

class TNSSpotifyAuthDelegate extends NSObject {
  public static ObjCProtocols = [SPTAuthViewDelegate];

  public authenticationViewControllerDidLoginWithSession(ctrl, session) {
    console.log(`DidLoginWithSession!`);
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

export class TNSSpotifyAuth extends NSObject {
  public static REDIRECT_URL: string;
  public static TOKEN_REFRESH_ENDPOINT: string;
  public static SESSION: any; // SPTSession
  public static AUTH_VIEW_SHOWING: boolean;

  // events
  public events: Observable;
  private _observers: Array<TNSSpotifyNotificationObserver>;
  private _authLoginCheck: EventData;
  private _authLoginSuccess: EventData;
  private _authLoginError: EventData;
  private _authLoginChange: EventData;

  // Optionally setup auth events (usually recommended)
  public setupEvents() {
    this.setupNotifications();
  }
  
  public static LOGIN() {
    // console.log(`SPTAuthStreamingScope:`);
    // console.log(typeof SPTAuthStreamingScope);
    SPTAuth.defaultInstance().clientID = TNSSpotifyConstants.CLIENT_ID;
    SPTAuth.defaultInstance().redirectURL = NSURL.URLWithString(TNSSpotifyAuth.REDIRECT_URL);

    SPTAuth.defaultInstance().requestedScopes = [
      'streaming',
      'user-read-private',
      'user-read-email',
      'user-library-modify',
      'user-library-read',
      'playlist-read-private',
      'playlist-modify-private',
      'playlist-modify-public',
      'playlist-read-collaborative'];

    // SPTAuth.defaultInstance().requestedScopes = [SPTAuthStreamingScope, SPTAuthUserReadPrivateScope, SPTAuthUserReadEmailScope, SPTAuthUserLibraryModifyScope, SPTAuthUserLibraryReadScope, SPTAuthPlaylistReadPrivateScope, SPTAuthPlaylistModifyPrivateScope, SPTAuthPlaylistModifyPublicScope, 'playlist-read-collaborative']; // no constant for last one: https://github.com/spotify/ios-sdk/issues/423
    
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
    TNSSpotifyAuth.AUTH_VIEW_SHOWING = true;
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

        if (TNSSpotifyAuth.AUTH_VIEW_SHOWING) {
          // dismiss modal
          let rootview = UIApplication.sharedApplication().keyWindow.rootViewController;
          rootview.dismissViewControllerAnimatedCompletion(true, null);
          TNSSpotifyAuth.AUTH_VIEW_SHOWING = false;
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

  private setupNotifications() {
    this._observers = new Array<TNSSpotifyNotificationObserver>();
    this.events = new Observable();
    this._authLoginCheck = {
      eventName: 'authLoginCheck',
      object: this.events
    };
    this._authLoginSuccess = {
      eventName: 'authLoginSuccess',
      object: this.events
    };
    this._authLoginError = {
      eventName: 'authLoginError',
      object: this.events,
      data: {}
    };
    this._authLoginChange = {
      eventName: 'authLoginChange',
      object: this.events,
      data: {
        status: false
      }
    };
    this.addNotificationObserver(TNSSpotifyConstants.NOTIFY_LOGIN_CHECK, (notification: NSNotification) => {
      this.events.notify(this._authLoginCheck);  
    });
    this.addNotificationObserver(TNSSpotifyConstants.NOTIFY_LOGIN_SUCCESS, (notification: NSNotification) => {
      this.events.notify(this._authLoginSuccess);  
    });
    this.addNotificationObserver(TNSSpotifyConstants.NOTIFY_LOGIN_ERROR, (notification: NSNotification) => {
      this._authLoginError.data = notification.object;
      this.events.notify(this._authLoginError);  
    });
    this.addNotificationObserver(TNSSpotifyConstants.NOTIFY_AUTH_LOGIN_CHANGE, (notification: NSNotification) => {
      this._authLoginChange.data.status = notification.object;
      this.events.notify(this._authLoginChange);  
    });
  }

  private addNotificationObserver(notificationName: string, onReceiveCallback: (notification: NSNotification) => void): TNSSpotifyNotificationObserver {
    var observer = TNSSpotifyNotificationObserver.new().initWithCallback(onReceiveCallback);
    NSNotificationCenter.defaultCenter().addObserverSelectorNameObject(observer, "onReceive", notificationName, null);
    this._observers.push(observer);
    return observer;
  }
}