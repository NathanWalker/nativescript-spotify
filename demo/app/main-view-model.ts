import {Observable, EventData} from 'data/observable';
import * as loader from 'nativescript-loading-indicator';
import {NSSpotifyConstants, NSSpotifyPlayer, NSSpotifyPlaylist, NSSpotifyRequest, SpotifyNotificationObserver, Utils} from 'nativescript-spotify';

export class SpotifyDemo extends Observable {
  public footerNote: string = "<span style='font-family: sans-serif; background-color:#000; color:#fff;'>Demo by <a href='https://github.com/NathanWalker'>Nathan Walker</a></span>";
  public playBtnTxt: string;
  public spotify: NSSpotifyPlayer;
  public loggedIn: boolean = false;
  public albumUrl: string;
  public trackInfo: string;
  public playing: boolean = false;
  public trackLoaded: boolean = false;
  public currentAlbumUrl: string;
  public albumName: string;
  public albumUri: string;
  public artistName: string;
  public artistUri: string;
  public trackDuration: string;
  public trackName: string;
  public trackUri: string;
  public playlistItems: Array<any>;
  private _observers: Array<SpotifyNotificationObserver>;

  constructor() {
    super();
    console.log('SpotifyDemo constructor');
    
    // notifications
    this.setupNotifications();
    
    // player
    loader.show();
    this.spotify = new NSSpotifyPlayer();
    this.spotify.initPlayer(true);
    this.playBtnTxt = `Stream Track`;
    this.currentAlbumUrl = `~/assets/logo.jpg`;
  }
  
  public login() {
    this.spotify.login();
  }
  
  public togglePlay(args: EventData, trackUri?: string) {
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
  
  public updateTrackInfo() {
    let metadata = this.spotify.currentTrackMetadata();
    this.set(`albumName`, `Album: ${metadata.albumName}`);
    this.set(`albumUri`, `Album URI: ${metadata.albumUri}`);
    this.set(`artistName`, `Artist: ${metadata.artistName}`);
    this.set(`artistUri`, `Artist URI: ${metadata.artistUri}`);
    this.set(`trackDuration`, `Duration: ${metadata.trackDuration}`);
    this.set(`trackName`, `Track: ${metadata.trackName}`);
    this.set(`trackUri`, `Track URI: ${metadata.trackUri}`);
  }
  
  public viewPlaylist(args: EventData) {
    loader.show();
    NSSpotifyRequest.ITEM('spotify:user:burkeholland:playlist:6kWBeWiaRT7zjINBJJtxJb').then((item) => {
      loader.hide();
      console.log('viewPlaylist:');
      
      // "<SPTPlaylistTrack: 0x786cc3a0>: Mirages - Original Mix (spotify:track:0EMXwBe2FCKKc1pXk0k2Vk)",
	    // "<SPTPlaylistTrack: 0x786d0500>: Departures (spotify:track:48AaLG0759e7tEoJwEomiw)",
	    // "<SPTPlaylistTrack: 0x7a0589a0>: Embrace (spotify:track:5QjmOXFMKg9QOn9OWmkWDj)",
	    // "<SPTPlaylistTrack: 0x7a04fab0>: Endeavors - Original Mix (spotify:track:7guLELDZkib65M4na9ZPIM)",
	    // "<SPTPlaylistTrack: 0x7a059e40>: I Took A Pill In Ibiza - Seeb Remix (spotify:track:7HzCxalzzYQOFb9a7Xs3j6)",
	    // "<SPTPlaylistTrack: 0x7a05bd20>: Legacy (spotify:track:2at5KYe1Ftphf77owGwzqW)",
	    // "<SPTPlaylistTrack: 0x7a05d1c0>: Main Title Theme Song (UNKLE Remix) - The Walking Dead Soundtrack (spotify:track:1KTnIQsGoYZ7GtSZ7k7HWL)",
	    // "<SPTPlaylistTrack: 0x7a646080>: In My Eyes - Original Mix (spotify:track:1SCpAAw3towOivp0UoNiV1)",
	    // "<SPTPlaylistTrack: 0x7a647720>: Salt Water Sound (spotify:track:5yESnkrb7eqzbzKHgi7wiw)",
	    // "<SPTPlaylistTrack: 0x7a6479b0>: Shine It (spotify:track:69xdPh6CEOpwcP4ZpReWmH)",
	    // "<SPTPlaylistTrack: 0x786d45d0>: Nightrun (feat. MindBuffer) (spotify:track:5hk3pPxbU8Pe0ddaAUsk42)",
	    // "<SPTPlaylistTrack: 0x7a647f20>: Forget (feat. BRML) (spotify:track:3JZwo8cMDVLwPM8zKyErh9)",
	    // "<SPTPlaylistTrack: 0x7a64eaa0>: Universal traveler (spotify:track:2q0WFOsFc7Gd9cujpPmZMC)",
	    // "<SPTPlaylistTrack: 0x7a656680>: La femme d'argent (spotify:track:6tEaLXZlN8b71vWV1SSsRf)",
	    // "<SPTPlaylistTrack: 0x7a181cf0>: 1517 (spotify:track:7vY4yR7cGqoQlqkbg0caL7)",
	    // "<SPTPlaylistTrack: 0x7a6473a0>: Golden Cage (spotify:track:2kbI9ucnY4APlG4o6YXMx1)",
	    // "<SPTPlaylistTrack: 0x7a655fb0>: I Wanna Ride You (spotify:track:1zJDoUYkc0nEE0uCeWOphX)",
	    // "<SPTPlaylistTrack: 0x7a656c90>: Finally Moving (spotify:track:3WS7spXVlbeC5kjePmHMQW)",
	    // "<SPTPlaylistTrack: 0x7a64fad0>: X-Amount Of Words (spotify:track:7N1wAQw8qgkTduoTptPBe8)",
	    // "<SPTPlaylistTrack: 0x7a64d870>: Before The Dive (spotify:track:4mNFQGXQmTCdyhAGjaNVSb)",
	    // "<SPTPlaylistTrack: 0x7a66ca90>: Ghostwriter (spotify:track:5Nn2Dj7OQsGL6pgQ9iIzPp)",
	    // "<SPTPlaylistTrack: 0x7a64cd40>: 1976 (spotify:track:09aNhXGvfo8wAhUxcsDFlZ)",
	    // "<SPTPlaylistTrack: 0x7a66af60>: Final Frontier (spotify:track:44zrSxAr03554aTFTVWp69)",
	    // "<SPTPlaylistTrack: 0x7a66b850>: The Sleepaway (spotify:track:3emdkhGBFAWo4Tv1froWYr)",
	    // "<SPTPlaylistTrack: 0x7a646ef0>: Kongsberg (spotify:track:3U6JVPfPIgo3hr4p7Csydk)",
	    // "<SPTPlaylistTrack: 0x7a670690>: Elevate (spotify:track:2vJSrhBxNj5qjM1mtbVmz0)"
      console.log(item);
      
      let tracks = NSSpotifyRequest.TRACKS_FROM_PLAYLIST(item);
      this.set(`playlistItems`, tracks);
        
    });
    // NSSpotifyPlaylist.FOR_USER('burkeholland').then((list) => {
    //   console.log('modal got list -------------------------------------');
    //   console.log(list);
    // });
    // let page = (<any>args.object).page;
    // Utils.openModal(page, './player/playlist-modal', (data: any) => {
    //   console.log(data);
    // }, false);
  }
  
  public playlistItemTap(args: EventData) {
    console.log(args.index);
  }
  
  private toggleBtn() {
    this.set(`playBtnTxt`, `${this.playing ? 'Pause' : 'Stream'} Track`);
  }
  
  private updateAlbumArt(notification: NSNotification) {
    console.log(`updateAlbumArt:`);
    console.log(notification.object);
    this.set(`currentAlbumUrl`, notification.object);
    this.updateTrackInfo();
  }
  
  private updateLogin(notification: NSNotification) {
    console.log(notification);
    if (this.spotify.isLoggedIn()) {
      this.set(`loggedIn`, true);
    } 
  }
  
  private loginCheck() {
    loader.show();
  }
  
  private loginSuccess() {
    this.set(`loggedIn`, true);
    console.log(`loginSuccess!`);
    loader.hide();
  }
  
  private playerReady() {
    console.log('playerReady() NSSpotifyConstants.NOTIFY_PLAYER_READY');
    loader.hide();
  }
  
  private setupNotifications() {
    this._observers = new Array<EZNotificationObserver>();
    this.addNotificationObserver(NSSpotifyConstants.NOTIFY_ALBUM_ART, this.updateAlbumArt.bind(this));
    this.addNotificationObserver(NSSpotifyConstants.NOTIFY_AUTH_LOGIN_CHANGE, this.updateLogin.bind(this));
    this.addNotificationObserver(NSSpotifyConstants.NOTIFY_LOGIN_CHECK, this.loginCheck.bind(this));
    this.addNotificationObserver(NSSpotifyConstants.NOTIFY_LOGIN_SUCCESS, this.loginSuccess.bind(this));
    this.addNotificationObserver(NSSpotifyConstants.NOTIFY_PLAYER_READY, this.playerReady.bind(this));
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