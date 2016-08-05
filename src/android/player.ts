import {Observable, EventData} from 'data/observable';
import {TNSSpotifyConstants, TNSSpotifyTrackMetadataI, Utils} from '../common';
import {TNSSpotifyAuth} from './auth';
import * as dialogs from 'ui/dialogs';
import * as app from 'application';

declare var com: any;
let Config = com.spotify.sdk.android.player.Config
let Spotify = com.spotify.sdk.android.player.Spotify;
let Player = com.spotify.sdk.android.player.Player;
let Builder = com.spotify.sdk.android.player.Player.Builder;

export class TNSSpotifyPlayer {
  public player: any; // SPTAudioStreamingController
  public auth: TNSSpotifyAuth;

  // playback delegate events  
  public events: Observable;
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
  private _playing: boolean = false;
  private _playerHandler: any;
  
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
        let playState = typeof force !== 'undefined' ? force : !this._playing;

        if (playState) {
          this._playing = true;
          this.player.resume();
        } else {
          this._playing = false;
          this.player.pause();
        }
        resolve(this._playing);
      }
    });
  }
  
  public isPlaying(): boolean {
    return this._playing;
  }
  
  public loadedTrack(): string {
    return this._loadedTrack;
  }
  
  public currentTrackMetadata(): TNSSpotifyTrackMetadataI {
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
  public audioStreamingDidChangePlaybackStatus(controller: any, playing: boolean) {
    console.log(`DidChangePlaybackStatus: ${playing}`);
    if (this.events) {
      this._changedPlaybackStatus.data.playing = playing;
      this.events.notify(this._changedPlaybackStatus);  
    }
  }
  
  private play(track: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.checkPlayer().then(() => {
        if (!this._playerLoggedIn) { 
          this._playerLoggedIn = true;
        } 
        this.playUri(track, resolve, reject);
      }, () => {
        reject('login');
      });
    });
  }
  
  private playUri(track: string, resolve: Function, reject: Function) {
    console.log(`playUri`, this.player);
    this.player.play(track);
    this._loadedTrack = track;
    this._playing = true;
    resolve();
  }
  
  private checkPlayer(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this._started) {
        
        let activity = app.android.startActivity || app.android.foregroundActivity;  
          let playerConfig: any = new Config(activity, TNSSpotifyAuth.SESSION, TNSSpotifyConstants.CLIENT_ID);
          let builder = new Builder(playerConfig);  
          // let observer = new Player.InitializationObserver();
          // this._playerHandler = new android.os.Handler();
          // this.player = builder.setCallbackHandler(this._playerHandler).build();

          let observer = new Player.InitializationObserver({
              onError: (throwable) => {
                console.log("MainActivity", "Could not initialize player: " + throwable.getMessage());
              },
              onInitialized: (player) => {      
                console.log(`player initialized`, player);
                this._started = true;
                resolve();
              }
          });
          this.player = builder.build(observer);
          // this._started = true;

          // this.player = Spotify.getPlayer(playerConfig, this, Player.InitializationObserver().extend({
          // this.player = builder.build(new Player.InitializationObserver().extend({  
          //   onInitialized: (player: any) => {
          //     let activity = app.android.startActivity || app.android.foregroundActivity;    
          //     console.log(`player initialized`, player);
          //     this._started = true;
          //     this.player.addConnectionStateCallback(activity);
          //     this.player.addPlayerNotificationCallback(activity);
          //     resolve();
          //   },
          //   onError: (throwable: any) => {
          //     console.log("MainActivity", "Could not initialize player: " + throwable.getMessage());
          //     reject();
          //   }
          // }));   
          console.log('after player');  
          // resolve();  

        // let errorRef = new interop.Reference();
        // this.player = SPTAudioStreamingController.sharedInstance();
        // if (this.player.startWithClientIdError(TNSSpotifyConstants.CLIENT_ID, errorRef)) {
        //   this._started = true;
        //   this.player.delegate = this;
        //   this.player.playbackDelegate = this;
        //   this.player.diskCache = SPTDiskCache.alloc().initWithCapacity(1024 * 1024 * 64);
          
        //   if (errorRef) {
        //     console.log(errorRef.description);
        //     printErrorRef(errorRef, false);
        //   } 
        //   // check if user is non-premium
        //   TNSSpotifyAuth.CHECK_PREMIUM().then(resolve, reject);
        // } else {
        //   this._started = false;
        //   if (errorRef) {
        //     printErrorRef(errorRef, true);
        //   }
        //   // check if user is non-premium
        //   // since this is real player error, reject both
        //   // but it will at least alert user if they are non-premium still
        //   TNSSpotifyAuth.CHECK_PREMIUM().then(reject, reject);
        // }

      } else {
        resolve();
      }
    });
  }
  
  private updateCoverArt(albumUri: string): Promise<any> {
    return new Promise((resolve, reject) => {
      resolve();
      // SPTAlbum.albumWithURISessionCallback(NSURL.URLWithString(albumUri), TNSSpotifyAuth.SESSION, (error, albumObj: any) => {
      //   if (error != null) {
      //     console.log(`*** albumWithURISessionCallback got error:`);
      //     console.log(error);
      //     reject();
      //     return;
      //   }
        
      //   // albumObj: SPTAlbum = https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTAlbum.html

      //   this._currentAlbumImageUrl = albumObj.largestCover.imageURL.absoluteString;
      //   if (this.events) {
      //     this._albumArtChange.data.url = this._currentAlbumImageUrl;
      //     this.events.notify(this._albumArtChange);  
      //   }
      //   resolve();
      // });
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
        console.log(`player dispose()`);
        this.player.logout();
        // setTimeout(() => {
        //   // if delegate method did not get called, fallback to manual
        //   if (this.player) {
        //     this.audioStreamingDidLogout(null);
        //   }
        // }, 1000);
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
      console.log(`this.auth.events.on('authLoginChange'`, eventData.data.status);
      this.setLoggedIn(eventData.data.status);
    });      

    // // player events    
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