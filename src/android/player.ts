import {Observable, EventData} from 'data/observable';
import {TNSSpotifyConstants, ISpotifyTrackMetadata, Utils} from '../common';
import {TNSSpotifyAuth} from './auth';
import * as dialogs from 'ui/dialogs';
import * as app from 'application';
import * as http from 'http';

declare var com: any;
declare var android: any;
declare var TimeUnit: any;

let Config = com.spotify.sdk.android.player.Config
let Spotify = com.spotify.sdk.android.player.Spotify;
let Player = com.spotify.sdk.android.player.Player;
let PlayerState = com.spotify.sdk.android.player.PlayerState;
let PlayerStateCallback = com.spotify.sdk.android.player.PlayerStateCallback;
let PlayerNotificationCallback = com.spotify.sdk.android.player.PlayerNotificationCallback;
let Builder = com.spotify.sdk.android.player.Player.Builder;
let AudioController = com.spotify.sdk.android.player.AudioController;


class CustomAudioController extends AudioController {

  private audioTrack: any;
  private savedVolume: any;
  public constructor() {
      super();
      this.audioTrack = null;
      this.savedVolume = null;
      return global.__native(this);
  }

  public start(): void {
    console.log("Starting");
  }

  public stop(): void {
    console.log("Stopping");
  }

  public onAudioDataDelivered (frames, numFrames, sampleRate, channels): any {
    //console.log("onAudioDataDelivered", numFrames);
    if (!this.audioTrack) {

      // Figure out how much buffer to have.
      let size = android.media.AudioTrack.getMinBufferSize(
          sampleRate,
          channels,
          2); //android.media.AudioFormat.ENCODING_PCM_16BIT

      // console.log("Creating size", size);

      // Create Track
      this.audioTrack = new android.media.AudioTrack(
          android.media.AudioManager.STREAM_MUSIC,
          sampleRate,
          channels,
          2, //android.media.AudioFormat.ENCODING_PCM_16BIT
          size,
          android.media.AudioTrack.MODE_STREAM);

      if (this.savedVolume !== null) {
        this.audioTrack.setVolume(this.savedVolume);
      }

      this.audioTrack.play();
    }
    //console.log("Writting data", numFrames);
    let newSize = this.audioTrack.write(frames, 0, numFrames);
    // console.log("Wrote data: ", newSize);
    return newSize;
  }

  onAudioFlush(): void {
    console.log("Flushing");
    if (this.audioTrack) {
      this.audioTrack.flush();
    }
  }

  onAudioPaused(): void {
    console.log("Pausing");
    if (this.audioTrack) {
      this.audioTrack.pause();
    }

  }

  onAudioResumed(): void {
    console.log("Resuming");
    if (this.audioTrack) {
      this.audioTrack.play();
    }
  }

  setVolume(val: number): void {
    if (this.audioTrack) {
      this.audioTrack.setVolume(val);
    }
    this.savedVolume = val;
  }

}


export class TNSSpotifyPlayer {
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
  private _playing: boolean = false;
  private _playerHandler: any;
  private _trackTimeout: any;
  private _audioController: CustomAudioController;

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
    return this.player.isLoggedIn();
  }

  public togglePlay(track?: string, force?: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      if (track && (track !== this._loadedTrack)) {
        // first time play or changing track
        this.play(track).then(resolve, reject);
      } else if (this.player) {
        // toggling
        this._playing = typeof force !== 'undefined' ? force : !this._playing;

        if (this._playing) {
          this.player.resume();
        } else {
          this.player.pause();
        }
        resolve(this._playing);
      }
    });
  }

  public isPlaying(): boolean {
    return this._playing;
  }

  /**
   * Fetch the current player state from native SDK. 
   * This method will be executed on the player thread and the result is posted back to the caller's original thread.
   */
  public getPlayerState() {
    return new Promise((resolve, reject) => {
      try {
        this.player.getPlayerState(new PlayerStateCallback({
          onPlayerState: (playerState) => {
            // create an object to resolve with
            let resp = {
              activeDevice: playerState.activeDevice,
              duration: playerState.durationInMs,
              playing: playerState.playing,
              position: playerState.positionInMs,
              repeating: playerState.repeating,
              shuffling: playerState.shuffling,
              trackUri: playerState.trackUri
            }
            resolve(resp);
          }
        }));
      } catch (err) {
        reject(err);
      }
    });
  }


  /**
   * Enable or disable shuffling.
   */
  public setShuffle(enabled: boolean) {
    this.player.setShuffle(enabled);
  }

  /**
   * Enable or disable repeat.
   */
  public setRepeat(enabled: boolean) {
    this.player.setRepeat(enabled);
  }

  /**
   * Jump to a given position in the current track.
   */
  public seekToPosition(position: number) {
    this.player.seekToPosition(position);
  }


  public loadedTrack(): string {
    return this._loadedTrack;
  }

  public setVolume(val: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this._audioController) {
        this._audioController.setVolume(val);
        resolve();
      } else {
        reject();
      }
    });
  }

  // public currentTrackMetadata(): ISpotifyTrackMetadata {
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
    resolve(true);
  }

  private checkPlayer(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this._started) {

        if (this.player) {
          try {
            console.log(`calling Spotify.destroyPlayer...`);
            // https://developer.spotify.com/android-sdk-docs/player/
            let activity = app.android.startActivity || app.android.foregroundActivity;
            Spotify.destroyPlayer(activity);
            console.log(`TimeUnit:`);
            console.log(TimeUnit);

            if (typeof TimeUnit !== 'undefined')            
              this.player.awaitTermination(10, TimeUnit.SECONDS);
          } catch (err) {
            console.log(`Spotify.destroyPlayer catch:`);
            console.log(err);
          }
          this.player = undefined;
        }

        let activity = app.android.startActivity || app.android.foregroundActivity;
        let playerConfig: any = new Config(activity, TNSSpotifyAuth.SESSION, TNSSpotifyConstants.CLIENT_ID);
        let builder = new Builder(playerConfig);
        this._audioController = new CustomAudioController();
        builder.setAudioController(this._audioController);

        let observer = new Player.InitializationObserver({
          onError: (throwable) => {
            let msg = throwable.getMessage();
            console.log("MainActivity", "Could not initialize player: " + msg);
            reject(msg);
          },
          onInitialized: (player) => {
            console.log(`player initialized`, player);
            this._started = true;

            // this.player.addConnectionStateCallback(activity);
            // this.player.addPlayerNotificationCallback(activity);

            // check if user is non-premium
            TNSSpotifyAuth.CHECK_PREMIUM().then(() => {
              console.log(`user is premium/unlimited...`);
              resolve();
            }, () => {
              reject();
            });
          }
        });

        // this._playerHandler = new android.os.Handler();
        // this.player = builder.setCallbackHandler(this._playerHandler).build();
        this.player = builder.build(observer);


        this.player.addPlayerNotificationCallback(new PlayerNotificationCallback({

          onPlaybackEvent: (eventType, playerState) => {
            console.log('EVENT TYPE: ', eventType);
            console.log('PLAYER STATE: ', playerState);
            // if (playerState) {
            //   for (let key in playerState) {
            //     console.log(`key: ${key}`, playerState[key]);
            //   }
            // }
      
            // let diff = playerState.durationInMs - playerState.positionInMs;
            // only dispatch track details when new tracks play or when < 400 ms to the end of playback
            // console.log(eventType === PlayerNotificationCallback.EventType.TRACK_CHANGED);
            // console.log(PlayerNotificationCallback.EventType.TRACK_END);

            if (this._loadedTrack && (eventType == PlayerNotificationCallback.EventType.TRACK_CHANGED || eventType == PlayerNotificationCallback.EventType.END_OF_CONTEXT)) {
              eventType = eventType == PlayerNotificationCallback.EventType.END_OF_CONTEXT ? 'TRACK_END' : eventType;
              if (this.events && playerState.trackUri) {
                if (this._trackTimeout) {
                  clearTimeout(this._trackTimeout);
                }
                this._trackTimeout = setTimeout(() => {
                  let trackId = playerState.trackUri.split(':').slice(-1);
                  console.log(`trackId: ${trackId}`);
                  http.request({
                    url: `https://api.spotify.com/v1/tracks/${trackId}`,
                    method: 'GET',
                    headers: { "Content-Type": "application/json", "Authorization:": `Bearer ${TNSSpotifyAuth.SESSION}` }
                  }).then((res: any) => {
                    // console.log(`track data...`);
                    // for (let key in res) {
                    //   console.log(`key: ${key}`, res[key]);
                    // }
                    if (res && res.content) {
                      let track = JSON.parse(res.content);

                      // for (let key in track) {
                      //   console.log(`key: ${key}`, track[key]);
                      // }
                    
                      this._changedPlaybackState.data.state = {
                        currentTrack: {
                          uri: track.uri,
                          name: track.name,
                          albumName: track.album.name,
                          artistName: track.artists[0].name,
                          durationMs: track.duration_ms,
                          positionInMs: playerState.positionInMs,
                          eventType: eventType
                        }
                      };
                      this.events.notify(this._changedPlaybackState); 
                      setTimeout(() => {
                        if (track.album && track.album.images) {
                          this._albumArtChange.data.url = track.album.images[0].url;
                          // console.log(`album url: ${this._albumArtChange.data.url}`);
                          this.events.notify(this._albumArtChange);  
                        }
                      }, 100); 
                    }
                  }, (err: any) => {
                    console.log(`track data error:`, err);
                  });
                }, 500);
                
              }
            }
          },

          onPlaybackError: (errorType, errorDetails) => {
            console.log('ERROR TYPE: ', errorType);
            console.log('ERROR DETAILS: ', errorDetails);
            if (errorDetails) {
              for (let key in errorDetails) {
                console.log(`key: ${key}`, errorDetails[key]);
              }
            }
          }

        }));


      } else {
        resolve();
      }
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
      this._started = false;
      console.log(`TODO: player dispose()`);
      // this.player.logout();
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