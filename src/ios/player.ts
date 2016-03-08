import {Observable, EventData} from 'data/observable';
import {NSSpotifyConstants, TrackMetadataI, Utils} from '../common';
import {NSSpotifyAuth} from './auth';

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

export class NSSpotifyPlayer extends NSObject implements SPTAudioStreamingPlaybackDelegate {
  public static ObjCProtocols = [SPTAudioStreamingPlaybackDelegate];
  public player: SPTAudioStreamingController;
  public audioEvents: Observable;
  private _currentAlbumImageUrl: string;
  private _currentAlbumUri: string;
  private _loadedTrack: string;
  private _loggedIn: boolean = false;
  private _notificationsSetup: boolean = false;
  private _observers: Array<SpotifyNotificationObserver>;

  // constructor - iOS extending NSObject will get: The TypeScript constructor "NSSpotifyPlayer" will not be executed.  
  // therefore: initPlayer
  
  public initPlayer(emitEvents?: boolean) {
    if (emitEvents) {
      this.setupEvents();
    }
    
    NSSpotifyAuth.INIT_SESSION().then(() => {
      this.playerReady();
      this.setLoggedIn(true);
    }, () => {
      this.playerReady();
      this.setLoggedIn(false);
    });
  }
  
  public login() {
    NSSpotifyAuth.LOGIN();
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
      return {};
    }
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
    this.updateCoverArt(this.currentTrackMetadata().albumUri);   
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
    this.checkPlayer();
    return new Promise((resolve, reject) => {
      this.player.loginWithSessionCallback(NSSpotifyAuth.SESSION, (error) => {
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
      });
    });
  }
  
  private checkPlayer() {
    if (!this.player) {
      this.player = SPTAudioStreamingController.alloc().initWithClientId(NSSpotifyConstants.CLIENT_ID);
      this.player.playbackDelegate = this;
    }
  }
  
  private updateCoverArt(albumUri: string): Promise<any> {
    return new Promise((resolve, reject) => {
      SPTAlbum.albumWithURISessionCallback(NSURL.URLWithString(albumUri), NSSpotifyAuth.SESSION, (error, albumObj: any) => {
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

        // let cnt = albumObj.covers.count;
        // for (let i = 0; i < cnt; i++) {
        //   console.log(albumObj.covers.objectAtIndex(i));
        // }

        this._currentAlbumImageUrl = albumObj.largestCover.imageURL.absoluteString;
        NSNotificationCenter.defaultCenter().postNotificationNameObject(NSSpotifyConstants.NOTIFY_ALBUM_ART, this._currentAlbumImageUrl);
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
    NSNotificationCenter.defaultCenter().postNotificationNameObject(NSSpotifyConstants.NOTIFY_AUTH_LOGIN_CHANGE, this._loggedIn);
  }
  
  private playerReady(): void {
    console.log('player.ts: NSSpotifyConstants.NOTIFY_PLAYER_READY');
    NSNotificationCenter.defaultCenter().postNotificationNameObject(NSSpotifyConstants.NOTIFY_PLAYER_READY, null);
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