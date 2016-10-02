import {Observable, EventData} from 'data/observable';
import {TNSSpotifyConstants, ISpotifyTrackMetadata, Utils} from '../common';
import {TNSSpotifyAuth} from './auth';
import * as dialogs from 'ui/dialogs';

declare var SPTAudioStreamingPlaybackDelegate, SPTAudioStreamingDelegate, SPTAudioStreamingController, NSNotificationCenter, NSNotification, interop, SPTAlbum, SPTDiskCache;

export class TNSSpotifyPlayer extends NSObject {
  public static ObjCProtocols = [SPTAudioStreamingDelegate, SPTAudioStreamingPlaybackDelegate];
  public player: any; // SPTAudioStreamingController
  public auth: TNSSpotifyAuth;

  // playback delegate events  
  public events: Observable;
  private _albumArtChange: EventData;
  private _playerReady: EventData;
  private _changedPlaybackStatus: EventData;
  private _changedPlaybackState: EventData;
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

  // streaming delegate events
  private _temporaryConnectionError: EventData;  
  private _streamError: EventData;
  private _receivedMessage: EventData;
  private _streamDisconnected: EventData;

  // state  
  private _currentAlbumImageUrl: string;
  private _currentAlbumUri: string;
  private _loadedTrack: string;
  private _started: boolean = false;
  private _loggedIn: boolean = false;
  private _playerLoggedIn: boolean = false;
  private _loggingInPromise: any;

  // constructor - iOS extending NSObject: The TypeScript constructor "TNSSpotifyPlayer" will not be executed.  
  // therefore: initPlayer must be used
  
  public initPlayer(emitEvents?: boolean) {

    // setup auth
    this.auth = new TNSSpotifyAuth();

    if (emitEvents) {
      this.auth.setupEvents();
      this.setupEvents();
    }

    // init auth session
    TNSSpotifyAuth.VERIFY_SESSION().then(() => {
      this.setLoggedIn(true);
      this.playerReady();
    }, () => {
      this.setLoggedIn(false);
      this.playerReady();
    });
  }
  
  public isLoggedIn() {
    return this._loggedIn;
  }
  
  public togglePlay(track?: string, force?: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      if (track && (track !== this._loadedTrack)) {
        // first time play or changing track
        this.play(track).then(resolve, reject);
      } else if (this.player) {
        // toggling
        let playState = typeof force !== 'undefined' ? force : !this.player.isPlaying;
        this.player.setIsPlayingCallback(playState, (error) => {
          if (error != null) {
            console.log(`*** Pause/Resume playback got error:`);
            console.log(error);
            
            // try to verify/renew the session
            TNSSpotifyAuth.VERIFY_SESSION(TNSSpotifyAuth.SESSION).then(() => {
              let origResolve = resolve;
              this.togglePlay(track, force).then((isPlaying: boolean) => {
                origResolve(isPlaying);
              });
            }, () => {
              if (this.isLoginError(error.localizedDescription)) {
                this.loginError();
                reject('login');
              } else {
                reject(false);
              }
            });
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

  public setVolume(val: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.player) {
        this.player.setVolumeCallback(val, (error) => {
          if (error !== null) {
            console.log(`Spotify Player volume adjust error:`, error);
            reject(error);
            return;
          }
          resolve();
        });
      } else {
        reject();
      }
    });
  }
  
  // public currentTrackMetadata(): ISpotifyTrackMetadata {
  //   // https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTAudioStreamingController.html#//api/name/currentTrackMetadata
  //   if (this.player && this.player.currentTrackMetadata) {
  //     let metadata: ISpotifyTrackMetadata = {
  //       albumName: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataAlbumName'),
  //       albumUri: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataAlbumURI'),
  //       artistName: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataArtistName'),
  //       artistUri: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataArtistURI'),
  //       trackDuration: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataTrackDuration'),
  //       trackName: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataTrackName'),
  //       trackUri: this.player.currentTrackMetadata.valueForKey('SPTAudioStreamingMetadataTrackURI')
  //     };
  //     return metadata;
  //   } else {
  //     return {};
  //   }
  // }
  
  // Delegate methods
  public audioStreamingDidChangePlaybackStatus(controller: any, playing: boolean) {
    console.log(`DidChangePlaybackStatus: ${playing}`);
    if (this.events) {
      this._changedPlaybackStatus.data.playing = playing;
      this.events.notify(this._changedPlaybackStatus);  
    }
  }

  public audioStreamingDidChangePlaybackState(controller: any, state: any) {
    console.log(`DidChangePlaybackState: ${state}`);
    if (this.events) {
      this._changedPlaybackState.data.state = state;
      this.events.notify(this._changedPlaybackState);  
      this.updateCoverArt(state.currentTrack.albumUri);
      // this.updateCoverArt(state.currentTrack.albumCoverArtUri);     
    }
  }
  
  public audioStreamingDidSeekToOffset(controller: any, offset: any) {
    console.log(`DidSeekToOffset: ${offset}`);
    if (this.events) {
      this._seekedToOffset.data.offset = offset;
      this.events.notify(this._seekedToOffset);  
    }
  }
  
  public audioStreamingDidChangeVolume(controller: any, volume: any) {
    console.log(`DidChangeVolume: ${volume}`);
    if (this.events) {
      this._changedVolume.data.volume = volume;
      this.events.notify(this._changedVolume);  
    }
  }
  
  public audioStreamingDidChangeShuffleStatus(controller: any, isShuffled: boolean) {
    console.log(`DidChangeShuffleStatus: ${isShuffled}`);
    if (this.events) {
      this._changedShuffleStatus.data.shuffle = isShuffled;
      this.events.notify(this._changedShuffleStatus);  
    }
  }
  
  public audioStreamingDidChangeRepeatStatus(controller: any, isRepeated: boolean) {
    console.log(`DidChangeRepeatStatus: ${isRepeated}`);
    if (this.events) {
      this._changedRepeatStatus.data.repeat = isRepeated;
      this.events.notify(this._changedRepeatStatus);  
    }
  }
  
  public audioStreamingDidChangeToTrack(controller: any, trackMetadata: NSDictionary) {
    console.log(`DidChangeToTrack: ${trackMetadata}`);
    if (this.events) {
      this._changedToTrack.data.metadata = trackMetadata;
      this.events.notify(this._changedToTrack);  
    }
  }
  
  public audioStreamingDidFailToPlayTrack(controller: any, trackUri: NSURL) {
    console.log(`DidFailToPlayTrack: ${trackUri.absoluteString}`);
    if (this.events) {
      this._failedToPlayTrack.data.url = trackUri.absoluteString;
      this.events.notify(this._failedToPlayTrack);  
    }
  }
  
  public audioStreamingDidStartPlayingTrack(controller: any, trackUri: NSURL) {
    console.log(`DidStartPlayingTrack: ${trackUri.absoluteString}`);
    this.updateCoverArt(this.currentTrackMetadata().albumUri);
    if (this.events) {
      this._startedPlayingTrack.data.url = trackUri.absoluteString;
      this.events.notify(this._startedPlayingTrack);  
    }
  }
  
  public audioStreamingDidStopPlayingTrack(controller: any, trackUri: NSURL) {
    console.log(`DidStopPlayingTrack: ${trackUri.absoluteString}`);
    if (this.events) {
      this._stoppedPlayingTrack.data.url = trackUri.absoluteString;
      this.events.notify(this._stoppedPlayingTrack);  
    }
  }
  
  public audioStreamingDidSkipToNextTrack(controller: any) {
    console.log(`DidSkipToNextTrack`);
    if (this.events) {
      this.events.notify(this._skippedToNextTrack);  
    }
  }
  
  public audioStreamingDidSkipToPreviousTrack(controller: any) {
    console.log(`DidSkipToPreviousTrack`);
    if (this.events) {
      this.events.notify(this._skippedToPreviousTrack);  
    }
  }
  
  public audioStreamingDidBecomeActivePlaybackDevice(controller: any) {
    console.log(`DidBecomeActivePlaybackDevice`);
    if (this.events) {
      this.events.notify(this._activePlaybackDevice);  
    }
  }
  
  public audioStreamingDidBecomeInactivePlaybackDevice(controller: any) {
    console.log(`DidBecomeInactivePlaybackDevice`);
    if (this.events) {
      this.events.notify(this._inactivePlaybackDevice);  
    }
  }
  
  public audioStreamingDidPopQueue(controller: any) {
    console.log(`DidPopQueue`);
    if (this.events) {
      this.events.notify(this._poppedQueue);  
    }
  }

  // SPTAudioStreamingDelegate
  public audioStreamingDidEncounterTemporaryConnectionError(controller: any) {
    console.log(`audioStreamingDidEncounterTemporaryConnectionError`);
    if (this.events) {
      this.events.notify(this._temporaryConnectionError);  
    }
  }

  public audioStreamingDidEncounterError(controller: any, error: any) {
    console.log(`audioStreamingDidEncounterTemporaryConnectionError`);
    console.log(error);
    if (this.events) {
      this._streamError.data.error = error;
      this.events.notify(this._streamError);  
    }
  }

  public audioStreamingDidReceiveMessage(controller: any, message: any) {
    console.log(`audioStreamingDidReceiveMessage`);
    if (this.events) {
      this._receivedMessage.data.message = message;
      this.events.notify(this._receivedMessage);  
    }
  }

  public audioStreamingDidDisconnect(controller: any) {
    console.log(`audioStreamingDidDisconnect`);
    if (this.events) {
      this.events.notify(this._streamDisconnected);  
    }
  }

  public audioStreamingDidLogin() {
    console.log(`audioStreamingDidLogin`);
    this._playerLoggedIn = true;
    let handlePromise = (success) => {
      if (this._loggingInPromise) {
        if (success) {
          this._loggingInPromise.resolve();
        } else {
          this._loggingInPromise.reject();
        }
        this._loggingInPromise = undefined;
      }
    };
    // check if user is non-premium
    TNSSpotifyAuth.CHECK_PREMIUM().then(() => {
      handlePromise(true);
    }, () => {
      handlePromise(false);
    });
  }

  public audioStreamingDidLogout(controller: any) {
    console.log(`audioStreamingDidLogout`);
    let errorRef = new interop.Reference();
    if (!this.player.stopWithError(errorRef)) {
      if (errorRef) {
        console.log(`stopWithError:`);
        for (let key in errorRef) {
          console.log(errorRef[key]);
        }
      }
    }
    this.player = undefined;
    TNSSpotifyAuth.LOGOUT();
  }   
  
  private play(track: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.checkPlayer().then(() => {
        this.playUri(track, resolve, reject);
      }, () => {
        reject('login');
      });
    });
  }
  
  private playUri(track: string, resolve: Function, reject: Function) {
    // https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTAudioStreamingController.html
    console.log(track);
    // this.player.playURICallback(NSURL.URLWithString(track), (error) => {
    this.player.playURIStartingWithIndexCallback(NSURL.URLWithString(track), 0, (error) => {
      if (error != null) {
        console.log(`*** playURICallback got error:`);
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
  
  private checkPlayer(): Promise<boolean> {
    let printErrorRef = (ref: any, failure: boolean) => {
      console.log(`SPTAudioStreamingController.sharedInstance().startWithClientIdError Start${failure ? ' Failure' : ''}:`, ref);
      for (let key in ref) {
        console.log(ref[key]);
      }
    };

    return new Promise((resolve, reject) => {
      if (!this._started) {
        let errorRef = new interop.Reference();
        this.player = SPTAudioStreamingController.sharedInstance();
        // if (this.player.startWithClientIdError(TNSSpotifyConstants.CLIENT_ID, errorRef)) {
        if (this.player.startWithClientIdAudioControllerAllowCachingError(TNSSpotifyConstants.CLIENT_ID, null, false, errorRef)) {
          this._started = true;
          this.player.delegate = this;
          this.player.playbackDelegate = this;
          // this.player.diskCache = SPTDiskCache.alloc().initWithCapacity(1024 * 1024 * 64);
          
          if (errorRef) {
            console.log(errorRef.description);
            printErrorRef(errorRef, false);
          } 

          if (!this._playerLoggedIn) { 
            this._loggingInPromise = {
              resolve: resolve,
              reject: reject
            };
            this.player.loginWithAccessToken(TNSSpotifyAuth.SESSION.accessToken);
          } else {
            TNSSpotifyAuth.CHECK_PREMIUM().then(resolve, reject);
          }

        } else {
          this._started = false;
          if (errorRef) {
            printErrorRef(errorRef, true);
          }
          // check if user is non-premium
          // since this is real player error, reject both
          // but it will at least alert user if they are non-premium still
          TNSSpotifyAuth.CHECK_PREMIUM().then(reject, reject);
        }
      } else {
        resolve();
      }
    });
  }
  
  private updateCoverArt(albumUri: string): Promise<any> {
    return new Promise((resolve, reject) => {
      SPTAlbum.albumWithURISessionCallback(NSURL.URLWithString(albumUri), TNSSpotifyAuth.SESSION, (error, albumObj: any) => {
        if (error != null) {
          console.log(`*** albumWithURISessionCallback got error:`);
          console.log(error);
          reject();
          return;
        }
        
        // albumObj: SPTAlbum = https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTAlbum.html
 
        this._currentAlbumImageUrl = albumObj.largestCover.imageURL.absoluteString;
        if (this.events) {
          this._albumArtChange.data.url = this._currentAlbumImageUrl;
          this.events.notify(this._albumArtChange);  
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
      if (this._started) {
        this._started = false;
        console.log(`streamingcontroller logout()`);
        this.player.logout();
        setTimeout(() => {
          // if delegate method did not get called, fallback to manual
          if (this.player) {
            this.audioStreamingDidLogout(null);
          }
        }, 1000);
      }
      
    }
  }
  
  private playerReady(): void {
    if (this.events) {
      this._playerReady.data.loggedIn = this._loggedIn;
      this.events.notify(this._playerReady);  
    }
  }
  
  private setupEvents() {
    // auth state
    this.auth.events.on('authLoginChange', (eventData: any) => {
      this.setLoggedIn(eventData.data.status);
    });      

    // player events    
    this.events = new Observable();
    this._albumArtChange = {
      eventName: 'albumArtChange',
      data: {
        url: ''
      }
    };
    this._playerReady = {
      eventName: 'playerReady',
      data: {
        loggedIn: false
      }
    };
    // delegate events
    this._changedPlaybackStatus = {
      eventName: 'changedPlaybackStatus',
      data: {
        playing: false
      }
    };
    this._changedPlaybackState = {
      eventName: 'changedPlaybackState',
      data: {
        state: {}
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
    this._temporaryConnectionError = {
      eventName: 'temporaryConnectionError'
    };
    this._streamError = {
      eventName: 'streamError',
      data: {
        error: null
      }
    };
    this._receivedMessage = {
      eventName: 'receivedMessage',
      data: {
        message: null
      }
    };
    this._streamDisconnected = {
      eventName: 'streamDisconnected'
    };
  } 
}