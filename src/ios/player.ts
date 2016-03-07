import {Observable, EventData} from 'data/observable';
import {Utils, TrackMetadataI} from '../common';

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

declare var SPTAuth: any;
declare var SPTSession: any;

export class NSSpotifyPlayer extends NSObject implements SPTAudioStreamingPlaybackDelegate {
  public static ObjCProtocols = [SPTAudioStreamingPlaybackDelegate];
  public static CLIENT_ID: string;
  public static REDIRECT_URL: string;
  public static TOKEN_REFRESH_ENDPOINT: string;
  public static SESSION: SPTSession;
  public player: SPTAudioStreamingController;
  public audioEvents: Observable;
  private _loadedTrack: string;
  private _loggedIn: boolean = false;
  private _notificationsSetup: boolean = false;
  private _observers: Array<SpotifyNotificationObserver>;
  
  public static HANDLE_AUTH_CALLBACK(url) {
    // Ask SPTAuth if the URL given is a Spotify authentication callback
    // if (SPTAuth.defaultInstance().canHandleURLWithDeclaredRedirectURL(url, NSURL.URLWithString(NSSpotifyPlayer.REDIRECT_URL))) { 
    NSNotificationCenter.defaultCenter().postNotificationNameObject(`SpotifyLoginCheck`, null);
    if (SPTAuth.defaultInstance().canHandleURL(url)) { 
      SPTAuth.defaultInstance().handleAuthCallbackWithTriggeredAuthURLCallback(url, (error, session) => {
        if (error != null) {
            console.log(`*** Auth error: ${error}`);
            return;
        }
        
        NSSpotifyPlayer.SAVE_SESSION(session);
        
        NSNotificationCenter.defaultCenter().postNotificationNameObject(`SpotifyLoginSuccess`, null);
        console.log('postNotificationNameObject: SpotifyLoginSuccess');
             
        return true;
      });
    }
  }
  
  public static SAVE_SESSION(session) {
    NSSpotifyPlayer.SESSION = session;
    let userDefaults = NSUserDefaults.standardUserDefaults();
    let sessionData = NSKeyedArchiver.archivedDataWithRootObject(session);
    userDefaults.setObjectForKey(sessionData, `SpotifySession`);
    userDefaults.synchronize();
  }
  
  constructor(emitEvents?: boolean) {
    super();
    if (emitEvents) {
      this.setupEvents();
    }
    
    let userDefaults = NSUserDefaults.standardUserDefaults();
    let sessionObj = userDefaults.objectForKey(`SpotifySession`);
    if (sessionObj) {
      
      // check if refresh needed
      let sessionData = sessionObj;//<NSData>
      let session = NSKeyedUnarchiver.unarchiveObjectWithData(sessionData);//<SPTSession>
      if (session) {
        // logged in
        this._loggedIn = true;
        
        if (!session.isValid()) {
          // renew session
          // console.log(`SPTAuth.defaultInstance() ----`);  
          // for (let key in SPTAuth.defaultInstance()) {
          //   console.log(key);
          // }
          // SPTAuth.defaultInstance().renewSessionWithServiceEndpointAtURLCallback(session, NSURL.URLWithString(NSSpotifyPlayer.TOKEN_REFRESH_ENDPOINT), (error, session) => {
          SPTAuth.defaultInstance().renewSessionCallback(session, (error, session) => {
            if (error != null) {
              console.log(`*** Renew session error: ${error}`);
              return;
            }
            
            NSSpotifyPlayer.SAVE_SESSION(session);
          });
        } else {
          NSSpotifyPlayer.SESSION = session;
        }
      } else {
        this._loggedIn = false;
      }     
    } else {
      this._loggedIn = false;
    }
  }
  
  public login() {
    SPTAuth.defaultInstance().clientID = NSSpotifyPlayer.CLIENT_ID;
    SPTAuth.defaultInstance().redirectURL = NSURL.URLWithString(NSSpotifyPlayer.REDIRECT_URL);
    SPTAuth.defaultInstance().requestedScopes = [SPTAuthStreamingScope];
    let url = SPTAuth.defaultInstance().loginURL;
    UIApplication.sharedApplication().openURL(url);
  }
  
  public isLoggedIn() {
    return this._loggedIn;
  }
  
  public togglePlay(track?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (track && (track !== this._loadedTrack)) {
        // first time play or changing track
        this.play(track).then(resolve, reject);
      } else if (this.player) {
        // toggling
        this.player.setIsPlayingCallback(!this.player.isPlaying, (error) => {
          if (error != null) {
            console.log(`*** Pause/Resume playback got error:`);
            console.log(error);
            if (this.isLoginError(error.localizedDescription)) {
              this.loginError();
              reject('login');
            } else {
              reject(false);  
            }
            return;
          }
          resolve(this.player.isPlaying);
        });
      }
    });
    
  }
  
  public isPlaying(): boolean {
    if (this.player) {
      return this.player.isPlaying;
    } else {
      return false;
    }
  }
  
  public loadedTrack(): string {
    return this._loadedTrack;
  }
  
  public currentTrackMetadata(): any {
    if (this.player && this.player.currentTrackMetadata) {
      let metadata: TrackMetadataI = {
        albumName: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataAlbumName'),
        albumUri: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataAlbumURI'),
        artistName: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataArtistName'),
        artistUri: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataArtistURI'),
        trackDuration: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataTrackDuration'),
        trackName: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataTrackName'),
        trackUri: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataTrackURI')
      };
      return metadata;
    } else {
      return undefined;
    }
  }
  
  public playAlbum(album: string) {
    if (!this.player) {
      this.player = SPTAudioStreamingController.alloc().initWithClientId(NSSpotifyPlayer.CLIENT_ID);
      // this.player.playbackDelegate = this;
    }
    this.player.loginWithSessionCallback(NSSpotifyPlayer.SESSION, (error) => {
      if (error != null) {
        console.log(`*** Enabling playback, received error: ${error}`);
        return;
      }
      
      SPTRequest.requestItemAtURIWithSessionCallback(album, NSSpotifyPlayer.SESSION, (error, albumObj) => {
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
  
  // Delegate methods
  public audioStreamingDidChangePlaybackStatus(controller: SPTAudioStreamingController, status: boolean) {
    console.log(`DidChangePlaybackStatus: ${status}`);
  }
  
  public audioStreamingDidSeekToOffset(controller: SPTAudioStreamingController, offset: any) {
    console.log(`DidSeekToOffset: ${offset}`);
  }
  
  public audioStreamingDidChangeVolume(controller: SPTAudioStreamingController, volume: any) {
    console.log(`DidChangeVolume: ${volume}`);
  }
  
  public audioStreamingDidChangeShuffleStatus(controller: SPTAudioStreamingController, isShuffled: boolean) {
    console.log(`DidChangeShuffleStatus: ${isShuffled}`);
  }
  
  public audioStreamingDidChangeRepeatStatus(controller: SPTAudioStreamingController, isRepeated: boolean) {
    console.log(`DidChangeRepeatStatus: ${isRepeated}`);
  }
  
  public audioStreamingDidChangeToTrack(controller: SPTAudioStreamingController, trackMetadata: NSDictionary) {
    console.log(`DidChangeToTrack: ${trackMetadata}`);
  }
  
  public audioStreamingDidFailToPlayTrack(controller: SPTAudioStreamingController, trackUri: NSURL) {
    console.log(`DidFailToPlayTrack: ${trackUri.absoluteString}`);
  }
  
  public audioStreamingDidStartPlayingTrack(controller: SPTAudioStreamingController, trackUri: NSURL) {
    console.log(`DidStartPlayingTrack: ${trackUri.absoluteString}`);
  }
  
  public audioStreamingDidStopPlayingTrack(controller: SPTAudioStreamingController, trackUri: NSURL) {
    console.log(`DidStopPlayingTrack: ${trackUri.absoluteString}`);
  }
  
  public audioStreamingDidSkipToNextTrack(controller: SPTAudioStreamingController) {
    console.log(`DidSkipToNextTrack`);
  }
  
  public audioStreamingDidSkipToPreviousTrack(controller: SPTAudioStreamingController) {
    console.log(`DidSkipToPreviousTrack`);
  }
  
  public audioStreamingDidBecomeActivePlaybackDevice(controller: SPTAudioStreamingController) {
    console.log(`DidBecomeActivePlaybackDevice`);
  }
  
  public audioStreamingDidBecomeInactivePlaybackDevice(controller: SPTAudioStreamingController) {
    console.log(`DidBecomeInactivePlaybackDevice`);
  }
  
  public audioStreamingDidPopQueue(controller: SPTAudioStreamingController) {
    console.log(`DidPopQueue`);
  }
  
  private play(track: string): Promise<any> {
    if (!this.player) {
      this.player = SPTAudioStreamingController.alloc().initWithClientId(NSSpotifyPlayer.CLIENT_ID);
      this.player.playbackDelegate = this;
    }
    return new Promise((resolve, reject) => {
      this.player.loginWithSessionCallback(NSSpotifyPlayer.SESSION, (error) => {
        if (error != null) {
          console.log(`*** Enabling playback, received error: ${error}`);

          if (this.isLoginError(error.localizedDescription)) {
            this.loginError();
            reject('login');
          } else {
            reject(false);
          }
          return;
        }
        
        // for (let key in this.player) {
        //   console.log(key);
        // }
        // method options:
        // playTrackProviderCallback
        // playTrackProviderFromIndexCallback
        // playURICallback
        // playURIFromIndexCallback
        // playURIsFromIndexCallback
        // playURIsWithOptionsCallback
        // this.player.playURIsFromIndexCallback([NSURL.URLWithString(track)], 0, (error) => {
        this.player.playURICallback(NSURL.URLWithString(track), (error) => {
          if (error != null) {
            console.log(`*** Starting playback got error:`);
            console.log(error);
            
            if (this.isLoginError(error.localizedDescription)) {
              this.loginError();
              reject('login');
            } else {
              reject(false);  
            }
            return;
          }
          this._loadedTrack = track;
          resolve(true);
        });
      });
    });
  }
  
  private isLoginError(desc: string): boolean {
    if (desc.indexOf('invalid credentials') > -1 || desc.indexOf('NULL') > -1) {
      return true;
    } else {
      return false;
    }
  }
  
  private loginError() {
    this._loggedIn = false;
    Utils.alert('You need to login to renew your session.');
  }
  
  private setupEvents() {
    this.audioEvents = new Observable();
    // this._bufferEvent = {
    //   eventName: 'audioBuffer',
    //   data: {
    //     buffer: 0,
    //     bufferSize: 0
    //   }
    // };
    // this._positionEvent = {
    //   eventName: 'position',
    //   data: {
    //     position: 0
    //   }
    // };
    // this._reachedEndEvent = {
    //   eventName: 'reachedEnd'
    // };
    // this._changeAudioFileEvent = {
    //   eventName: 'changeAudioFile'
    // };
    // this._changeOutputEvent = {
    //   eventName: 'changeOutput'
    // };
    // this._changePanEvent = {
    //   eventName: 'changePan'
    // };
    // this._changeVolumeEvent = {
    //   eventName: 'changeVolume'
    // };
    // this._changePlayStateEvent = {
    //   eventName: 'changePlayState'
    // };
    // this._seekedEvent = {
    //   eventName: 'seeked'
    // };
  }
  
  // private setupNotifications() {
  //   this._observers = new Array<SpotifyNotificationObserver>();
  //   this.addNotificationObserver("EZAudioPlayerDidChangeAudioFileNotification", this.didChangeAudioFile.bind(this));
  //   this.addNotificationObserver("EZAudioPlayerDidChangeOutputDeviceNotification", this.didChangeOutputDevice.bind(this));
  //   this.addNotificationObserver("EZAudioPlayerDidChangePanNotification", this.didChangePan.bind(this));
  //   this.addNotificationObserver("EZAudioPlayerDidChangePlayStateNotification", this.didChangePlayState.bind(this));
  //   this.addNotificationObserver("EZAudioPlayerDidChangeVolumeNotification", this.didChangeVolume.bind(this));
  //   this.addNotificationObserver("EZAudioPlayerDidReachEndOfFileNotification", this.didReachEndOfFile.bind(this));
  //   this.addNotificationObserver("EZAudioPlayerDidSeekNotification", this.didSeek.bind(this));
  // }
  
  // public addNotificationObserver(notificationName: string, onReceiveCallback: (notification: NSNotification) => void): SpotifyNotificationObserver {
  //   var observer = SpotifyNotificationObserver.new().initWithCallback(onReceiveCallback);
  //   NSNotificationCenter.defaultCenter().addObserverSelectorNameObject(observer, "onReceive", notificationName, this.player);
  //   this._observers.push(observer);
  //   return observer;
  // }

  // public removeNotificationObserver(observer: any, notificationName: string) {
  //   var index = this._observers.indexOf(observer);
  //   if (index >= 0) {
  //     this._observers.splice(index, 1);
  //     NSNotificationCenter.defaultCenter().removeObserverNameObject(observer, notificationName, this.player);
  //   }
  // }
}