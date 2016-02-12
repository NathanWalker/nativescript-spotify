export class SpotifyNotificationObserver extends NSObject {
  private _onReceiveCallback: (notification: NSNotification) => void;

  static new(): SpotifyNotificationObserver {
    return <SpotifyNotificationObserver>super.new();
  }

  public initWithCallback(onReceiveCallback: (notification: NSNotification) => void): SpotifyNotificationObserver {
    this._onReceiveCallback = onReceiveCallback;
    return this;
  }

  public onReceive(notification: NSNotification): void {
    this._onReceiveCallback(notification);
  }

  public static ObjCExposedMethods = {
    "onReceive": { returns: interop.types.void, params: [NSNotification] }
  };
}

export class Spotify extends NSObject {// implements SPTAudioStreamingPlaybackDelegate {
  // public static ObjCProtocols = [SPTAudioStreamingPlaybackDelegate];
  public static CLIENT_ID: string;
  public static REDIRECT_URL: string;
  public static TOKEN_REFRESH_ENDPOINT: string;
  public static SESSION: SPTSession;
  public player: SPTAudioStreamingController;
  private _loggedIn: boolean = false;
  
  public static HANDLE_AUTH_CALLBACK(url) {
    // Ask SPTAuth if the URL given is a Spotify authentication callback
    if (SPTAuth.defaultInstance().canHandleURLWithDeclaredRedirectURL(url, NSURL.URLWithString(Spotify.REDIRECT_URL))) { 
      SPTAuth.defaultInstance().handleAuthCallbackWithTriggeredAuthURLCallback(url, null, (error, session) => {
        if (error != null) {
            console.log(`*** Auth error: ${error}`);
            return;
        }
        
        Spotify.SAVE_SESSION(session);
        
        NSNotificationCenter.defaultCenter().postNotificationNameObject(`SpotifyLoginSuccess`, null);
             
        return true;
      });
    }
  }
  
  public static SAVE_SESSION(session) {
    Spotify.SESSION = session;
    let userDefaults = NSUserDefaults.standardUserDefaults();
    let sessionData = NSKeyedArchiver.archivedDataWithRootObject(session);
    userDefaults.setObjectForKey(sessionData, `SpotifySession`);
    userDefaults.synchronize();
  }
  
  constructor() {
    super();
    let userDefaults = NSUserDefaults.standardUserDefaults();
    let sessionObj = userDefaults.objectForKey(`SpotifySession`);
    if (sessionObj) {
      // logged in
      this._loggedIn = true;
      
      // check if refresh needed
      let sessionData = sessionObj;//<NSData>
      let session = NSKeyedArchiver.unarchiveObjectWithData(sessionData);//<SPTSession>
      if (!session.isValid()) {
        // renew session
        SPTAuth.defaultInstance().renewSessionWithServiceEndpointAtURLCallback(session, NSURL.URLWithString(Spotify.TOKEN_REFRESH_ENDPOINT), (error, session) => {
          if (error != null) {
            console.log(`*** Renew session error: ${error}`);
            return;
          }
          
          Spotify.SAVE_SESSION(session);
        });
      } 
    } else {
      this._loggedIn = false;
    }
  }
  
  login() {
    let url = SPTAuth.defaultInstance().loginURLForClientIdDeclaredRedirectURLScope(Spotify.CLIENT_ID, NSURL.URLWithString(Spotify.REDIRECT_URL), [SPTAuthStreamingScope]);
    
    UIApplication.sharedApplication().openURL(url);
  }
  
  isLoggedIn() {
    return this._loggedIn;
  }
  
  play(track: string) {
    if (!this.player) {
      this.player = SPTAudioStreamingController.alloc().initWithClientId(Spotify.CLIENT_ID);
      // this.player.playbackDelegate = this;
    }
    this.player.loginWithSessionCallback(Spotify.SESSION, (error) => {
      if (error != null) {
        console.log(`*** Enabling playback, received error: ${error}`);
        return;
      }
      
      this.player.playURIsFromIndexCallback([NSURL.URLWithString(track)], 0, () => {
        if (error != null) {
            console.log(`*** Starting playback got error: ${error}`);
            return;
        }
      });
    });
  }
  
  playAlbum(album: string) {
    if (!this.player) {
      this.player = SPTAudioStreamingController.alloc().initWithClientId(Spotify.CLIENT_ID);
      // this.player.playbackDelegate = this;
    }
    this.player.loginWithSessionCallback(Spotify.SESSION, (error) => {
      if (error != null) {
        console.log(`*** Enabling playback, received error: ${error}`);
        return;
      }
      
      SPTRequest.requestItemAtURIWithSessionCallback(album, Spotify.SESSION, (error, albumObj) => {
        if (error != null) {
            console.log(`*** Album lookup error: ${error}`);
            return;
        }
        let album = albumObj;//<SPTAlbum>
        this.player.playTrackProviderCallback(album, null);
      });
      
    });
  }
  
  // TODO: figure out delegate methods
  // public audioStreamingDidStartPlayingTrack() {
  	   //updateCoverArt();   
  // }
  
  public updateCoverArt() {
    
  }
}