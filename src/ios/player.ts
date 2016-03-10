import {Observable, EventData} from 'data/observable';
import {TNSSpotifyConstants, TNSSpotifyTrackMetadataI, Utils} from '../common';
import {TNSSpotifyAuth} from './auth';

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

export class TNSSpotifyPlayer extends NSObject implements SPTAudioStreamingPlaybackDelegate {
  public static ObjCProtocols = [SPTAudioStreamingPlaybackDelegate];
  public player: SPTAudioStreamingController;

  // events  
  public audioEvents: Observable;
  private _observers: Array<SpotifyNotificationObserver>;
  private _authLoginChange: EventData;
  private _authLoginCheck: EventData;
  private _authLoginSuccess: EventData;
  private _albumArtChange: EventData;
  private _playerReady: EventData;
  private _changedPlaybackStatus: EventData;
  private _seekedToOffset: EventData;
  private _changedVolume: EventData;
  private _changedShuffleStatus: EventData;
  private _changedRepeatStatus: EventData;
  private _changedToTrack: EventData;
  private _failedToPlayTrack: EventData;
  private _startedPlayingTrack: EventData;
  private _stoppedPlayingTrack: EventData;
  private _skippedToNextTrack: EventData;
  private _skippedToPreviousTrack: EventData;
  private _activePlaybackDevice: EventData;
  private _inactivePlaybackDevice: EventData;
  private _poppedQueue: EventData;

  // state  
  private _currentAlbumImageUrl: string;
  private _currentAlbumUri: string;
  private _loadedTrack: string;
  private _loggedIn: boolean = false;
  private _playerLoggedIn: boolean = false;

  // constructor - iOS extending NSObject will get: The TypeScript constructor "TNSSpotifyPlayer" will not be executed.  
  // therefore: initPlayer
  
  public initPlayer(emitEvents?: boolean) {

    // notifications
    this.setupNotifications();

    if (emitEvents) {
      this.setupEvents();
    }
    
    TNSSpotifyAuth.INIT_SESSION().then(() => {
      this.playerReady();
      this.setLoggedIn(true);
    }, () => {
      this.playerReady();
      this.setLoggedIn(false);
    });
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
      let metadata: TNSSpotifyTrackMetadataI = {
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
      return {};
    }
  }
  
  // Delegate methods
  public audioStreamingDidChangePlaybackStatus(controller: SPTAudioStreamingController, playing: boolean) {
    console.log(`DidChangePlaybackStatus: ${playing}`);
    if (this.audioEvents) {
      this._changedPlaybackStatus.data.playing = playing;
      this.audioEvents.notify(this._changedPlaybackStatus);  
    }
  }
  
  public audioStreamingDidSeekToOffset(controller: SPTAudioStreamingController, offset: any) {
    console.log(`DidSeekToOffset: ${offset}`);
    if (this.audioEvents) {
      this._seekedToOffset.data.offset = offset;
      this.audioEvents.notify(this._seekedToOffset);  
    }
  }
  
  public audioStreamingDidChangeVolume(controller: SPTAudioStreamingController, volume: any) {
    console.log(`DidChangeVolume: ${volume}`);
    if (this.audioEvents) {
      this._changedVolume.data.volume = volume;
      this.audioEvents.notify(this._changedVolume);  
    }
  }
  
  public audioStreamingDidChangeShuffleStatus(controller: SPTAudioStreamingController, isShuffled: boolean) {
    console.log(`DidChangeShuffleStatus: ${isShuffled}`);
    if (this.audioEvents) {
      this._changedShuffleStatus.data.shuffle = isShuffled;
      this.audioEvents.notify(this._changedShuffleStatus);  
    }
  }
  
  public audioStreamingDidChangeRepeatStatus(controller: SPTAudioStreamingController, isRepeated: boolean) {
    console.log(`DidChangeRepeatStatus: ${isRepeated}`);
    if (this.audioEvents) {
      this._changedRepeatStatus.data.repeat = isRepeated;
      this.audioEvents.notify(this._changedRepeatStatus);  
    }
  }
  
  public audioStreamingDidChangeToTrack(controller: SPTAudioStreamingController, trackMetadata: NSDictionary) {
    console.log(`DidChangeToTrack: ${trackMetadata}`);
    if (this.audioEvents) {
      this._changedToTrack.data.metadata = trackMetadata;
      this.audioEvents.notify(this._changedToTrack);  
    }
  }
  
  public audioStreamingDidFailToPlayTrack(controller: SPTAudioStreamingController, trackUri: NSURL) {
    console.log(`DidFailToPlayTrack: ${trackUri.absoluteString}`);
    if (this.audioEvents) {
      this._failedToPlayTrack.data.url = trackUri.absoluteString;
      this.audioEvents.notify(this._failedToPlayTrack);  
    }
  }
  
  public audioStreamingDidStartPlayingTrack(controller: SPTAudioStreamingController, trackUri: NSURL) {
    console.log(`DidStartPlayingTrack: ${trackUri.absoluteString}`);
    this.updateCoverArt(this.currentTrackMetadata().albumUri);
    if (this.audioEvents) {
      this._startedPlayingTrack.data.url = trackUri.absoluteString;
      this.audioEvents.notify(this._startedPlayingTrack);  
    }
  }
  
  public audioStreamingDidStopPlayingTrack(controller: SPTAudioStreamingController, trackUri: NSURL) {
    console.log(`DidStopPlayingTrack: ${trackUri.absoluteString}`);
    if (this.audioEvents) {
      this._stoppedPlayingTrack.data.url = trackUri.absoluteString;
      this.audioEvents.notify(this._stoppedPlayingTrack);  
    }
  }
  
  public audioStreamingDidSkipToNextTrack(controller: SPTAudioStreamingController) {
    console.log(`DidSkipToNextTrack`);
    if (this.audioEvents) {
      this.audioEvents.notify(this._skippedToNextTrack);  
    }
  }
  
  public audioStreamingDidSkipToPreviousTrack(controller: SPTAudioStreamingController) {
    console.log(`DidSkipToPreviousTrack`);
    if (this.audioEvents) {
      this.audioEvents.notify(this._skippedToPreviousTrack);  
    }
  }
  
  public audioStreamingDidBecomeActivePlaybackDevice(controller: SPTAudioStreamingController) {
    console.log(`DidBecomeActivePlaybackDevice`);
    if (this.audioEvents) {
      this.audioEvents.notify(this._activePlaybackDevice);  
    }
  }
  
  public audioStreamingDidBecomeInactivePlaybackDevice(controller: SPTAudioStreamingController) {
    console.log(`DidBecomeInactivePlaybackDevice`);
    if (this.audioEvents) {
      this.audioEvents.notify(this._inactivePlaybackDevice);  
    }
  }
  
  public audioStreamingDidPopQueue(controller: SPTAudioStreamingController) {
    console.log(`DidPopQueue`);
    if (this.audioEvents) {
      this.audioEvents.notify(this._poppedQueue);  
    }
  }
  
  private play(track: string): Promise<any> {
    this.checkPlayer();
    return new Promise((resolve, reject) => {
      if (!this._playerLoggedIn) {
        this.player.loginWithSessionCallback(TNSSpotifyAuth.SESSION, (error) => {
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
          this._playerLoggedIn = true;
          this.playUri(track, resolve, reject);
        });  
      } else {
        this.playUri(track, resolve, reject);
      }
    });
  }
  
  private playUri(track: string, resolve: Function, reject: Function) {
    // method options:
    // playTrackProviderCallback
    // playTrackProviderFromIndexCallback
    // playURICallback
    // playURIFromIndexCallback
    // playURIsFromIndexCallback
    // playURIsWithOptionsCallback

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
  }
  
  private checkPlayer() {
    if (!this.player) {
      this.player = SPTAudioStreamingController.alloc().initWithClientId(TNSSpotifyConstants.CLIENT_ID);
      this.player.playbackDelegate = this;
    }
  }
  
  private updateCoverArt(albumUri: string): Promise<any> {
    return new Promise((resolve, reject) => {
      SPTAlbum.albumWithURISessionCallback(NSURL.URLWithString(albumUri), TNSSpotifyAuth.SESSION, (error, albumObj: any) => {
        if (error != null) {
          console.log(`*** albumWithUri got error:`);
          console.log(error);
          reject();
          return;
        }
        
        console.log(`albumObj: ${albumObj}`);
        //  artists
        //   externalIds
        //   firstTrackPage
        //   genres
        //   popularity
        //   releaseDate
        //   releaseYear
        //   playableUri
        //   tracksForPlayback
        //   description
        //   hash
        //   availableTerritories
        //   covers
        //   identifier
        //   largestCover
        //   sharingURL
        //   smallestCover
        //   type
        //   name
        //   uri

        this._currentAlbumImageUrl = albumObj.largestCover.imageURL.absoluteString;
        if (this.audioEvents) {
          this._albumArtChange.data.url = this._currentAlbumImageUrl;
          this.audioEvents.notify(this._albumArtChange);  
        }
        resolve();
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
    this.setLoggedIn(false);
    Utils.alert('You need to login to renew your session.');
  }
  
  private setLoggedIn(value: boolean) {
    this._loggedIn = value;
    if (!value) {
      this._playerLoggedIn = false;
    }
    if (this.audioEvents) {
      this._authLoginChange.data.status = this._loggedIn;
      this.audioEvents.notify(this._authLoginChange);  
    }
  }
  
  private playerReady(): void {
    console.log('player.ts: TNSSpotifyConstants.NOTIFY_PLAYER_READY');
    if (this.audioEvents) {
      this.audioEvents.notify(this._playerReady);  
    }
  }
  
  private setupEvents() {
    this.audioEvents = new Observable();
    this._authLoginChange = {
      eventName: 'authLoginChange',
      data: {
        status: false
      }
    };
    this._authLoginCheck = {
      eventName: 'authLoginCheck'
    };
    this._authLoginSuccess = {
      eventName: 'authLoginSuccess'
    };
    this._albumArtChange = {
      eventName: 'albumArtChange',
      data: {
        url: ''
      }
    };
    this._playerReady = {
      eventName: 'playerReady'
    };
    // delegate events
    this._changedPlaybackStatus = {
      eventName: 'changedPlaybackStatus',
      data: {
        playing: false
      }
    };
    this._seekedToOffset = {
      eventName: 'seekedToOffset',
      data: {
        offset: 0
      }
    };
    this._changedVolume = {
      eventName: 'changedVolume',
      data: {
        volume: 0
      }
    };
    this._changedShuffleStatus = {
      eventName: 'changedShuffleStatus',
      data: {
        shuffle: false
      }
    };
    this._changedRepeatStatus = {
      eventName: 'changedRepeatStatus',
      data: {
        repeat: false
      }
    };
    this._changedToTrack = {
      eventName: 'changedToTrack',
      data: {
        metadata: null
      }
    };
    this._failedToPlayTrack = {
      eventName: 'failedToPlayTrack',
      data: {
        url: null
      }
    };
    this._startedPlayingTrack = {
      eventName: 'startedPlayingTrack',
      data: {
        url: null
      }
    };
    this._stoppedPlayingTrack = {
      eventName: 'stoppedPlayingTrack',
      data: {
        url: null
      }
    };
    this._skippedToNextTrack = {
      eventName: 'skippedToNextTrack'
    };
    this._skippedToPreviousTrack = {
      eventName: 'skippedToPreviousTrack'
    };
    this._activePlaybackDevice = {
      eventName: 'activePlaybackDevice'
    };
    this._inactivePlaybackDevice = {
      eventName: 'inactivePlaybackDevice'
    };
    this._poppedQueue = {
      eventName: 'poppedQueue'
    };
  } 
  
  private setupNotifications() {
    this._observers = new Array<SpotifyNotificationObserver>();
    this.addNotificationObserver(TNSSpotifyConstants.NOTIFY_AUTH_LOGIN_CHANGE, (notification: NSNotification) => {
      this.setLoggedIn(notification.object);
    });
    this.addNotificationObserver(TNSSpotifyConstants.NOTIFY_LOGIN_CHECK, (notification: NSNotification) => {
      if (this.audioEvents) {
        this.audioEvents.notify(this._authLoginCheck);  
      }
    });
    this.addNotificationObserver(TNSSpotifyConstants.NOTIFY_LOGIN_SUCCESS, (notification: NSNotification) => {
      if (this.audioEvents) {
        this.audioEvents.notify(this._authLoginSuccess);  
      }
    });
  }
  
  public addNotificationObserver(notificationName: string, onReceiveCallback: (notification: NSNotification) => void): SpotifyNotificationObserver {
    var observer = SpotifyNotificationObserver.new().initWithCallback(onReceiveCallback);
    NSNotificationCenter.defaultCenter().addObserverSelectorNameObject(observer, "onReceive", notificationName, null);
    this._observers.push(observer);
    return observer;
  }

  public removeNotificationObserver(observer: any, notificationName: string) {
    var index = this._observers.indexOf(observer);
    if (index >= 0) {
      this._observers.splice(index, 1);
      NSNotificationCenter.defaultCenter().removeObserverNameObject(observer, notificationName, this.player);
    }
  }
}