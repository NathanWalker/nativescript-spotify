import {Observable, EventData} from 'data/observable';
import * as loader from 'nativescript-loading-indicator';
import {NSSpotifyPlayer, SpotifyNotificationObserver, Utils} from 'nativescript-spotify';

export class SpotifyDemo extends Observable {
  public footerNote: string = "<span style='font-family: sans-serif; background-color:#000; color:#fff;'>Demo by <a href='https://github.com/NathanWalker'>Nathan Walker</a></span>";
  public playBtnTxt: string;
  public spotify: NSSpotifyPlayer;
  public loggedIn: boolean = false;
  public trackInfo: string;
  public viewTrackInfoBtnTxt: string;
  public trackInfoOn: boolean = false;
  public playing: boolean = false;
  public trackLoaded: boolean = false;
  public trackMetadata: any = {
    albumName: '',
    albumUri: '',
    artistName: '',
    artistUri: '',
    trackDuration: '',
    trackName: '',
    trackUri: ''
  };
  private _observers: Array<SpotifyNotificationObserver>;

  constructor() {
    super();
    
    console.log('SpotifyDemo constructor');
    this.setupNotifications();
    // this._observer = SpotifyNotificationObserver.new().initWithCallback(this.loginSuccess.bind(this));
    // NSNotificationCenter.defaultCenter().addObserverSelectorNameObject(this._observer, 'onReceive', 'SpotifyLoginSuccess', null);
    // NSNotificationCenter.defaultCenter().addObserverSelectorNameObject(this._observer, 'onReceive', 'SpotifyLoginCheck', null);
    
    this.spotify = new NSSpotifyPlayer();
    if (this.spotify.isLoggedIn()) {
      this.set(`loggedIn`, true);
    } 
    this.playBtnTxt = `Stream Track`;
    this.viewTrackInfoBtnTxt = `Show Track Info`;
  }
  
  public login() {
    this.spotify.login();
  }
  
  public loginSuccess(notification: NSNotification) {
    this.set(`loggedIn`, true);
    console.log(`loginSuccess!`);
    loader.hide();
  }
  
  public togglePlay(trackUri?: string) {
    loader.show();
    this.set(`playBtnTxt`, `Loading...`);
    this.spotify.togglePlay(trackUri || 'spotify:track:58s6EuEYJdlb0kO7awm3Vp').then((isPlaying: boolean) => {
      loader.hide();
      this.set(`trackLoaded`, true);
      this.set(`playing`, isPlaying);
      this.toggleBtn();  
    }, (error) => {
      loader.hide();
      this.set(`trackLoaded`, false);
      this.set(`playing`, false);
      this.toggleBtn();  
      if (error === 'login') {
        this.set(`loggedIn`, false);
      }
    });
    
  }
  
  public viewTrackInfo() {
    this.set(`trackInfoOn`, !this.trackInfoOn);
    let metadata = this.spotify.currentTrackMetadata();
    let data = {
      albumName: `Album: ${metadata.albumName}`,
      albumUri: `Album URI: ${metadata.albumUri}`,
      artistName: `Artist: ${metadata.artistName}`,
      artistUri: `Artist URI: ${metadata.artistUri}`,
      trackDuration: `Duration: ${metadata.trackDuration}`,
      trackName: `Track: ${metadata.trackName}`,
      trackUri: `Track URI: ${metadata.trackUri}`
    };
    this.set(`trackMetadata`, data);
    this.set(`viewTrackInfoBtnTxt`, `${this.trackInfoOn ? 'Hide' : 'Show'} Track Info`);
  }
  
  public viewPlaylist(args: EventData) {
    let page = (<any>args.object).page;
    Utils.openModal(page, './player/playlist-modal', (data: any) => {
      console.log(data);
    }, false);
  }
  
  private toggleBtn() {
    this.set(`playBtnTxt`, `${this.playing ? 'Pause' : 'Stream'} Track`);
  }
  
  private loginCheck() {
    loader.show();
  }
  
  private setupNotifications() {
    this._observers = new Array<EZNotificationObserver>();
    this.addNotificationObserver("SpotifyLoginSuccess", this.loginSuccess.bind(this));
    this.addNotificationObserver("SpotifyLoginCheck", this.loginCheck.bind(this));
  }
  
  private addNotificationObserver(notificationName: string, onReceiveCallback: (notification: NSNotification) => void): SpotifyNotificationObserver {
    var observer = SpotifyNotificationObserver.new().initWithCallback(onReceiveCallback);
    NSNotificationCenter.defaultCenter().addObserverSelectorNameObject(observer, "onReceive", notificationName, null);
    this._observers.push(observer);
    return observer;
  }

  private removeNotificationObserver(observer: any, notificationName: string) {
    var index = this._observers.indexOf(observer);
    if (index >= 0) {
      this._observers.splice(index, 1);
      NSNotificationCenter.defaultCenter().removeObserverNameObject(observer, notificationName, null);
    }
  }
}