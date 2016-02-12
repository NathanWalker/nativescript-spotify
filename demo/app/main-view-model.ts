import Observable = require("data/observable");
import {Spotify, SpotifyNotificationObserver} from 'nativescript-spotify';

export class SpotifyDemo extends Observable {
  public footerNote: string = "<span style='font-family: sans-serif;'>Demo by <a href='https://github.com/NathanWalker'>Nathan Walker</a></span>";
  public spotify: Spotify;
  public loggedIn: boolean = false;

  constructor() {
    // super();
    
    var observer = SpotifyNotificationObserver.new().initWithCallback(this.loginSuccess);
    NSNotificationCenter.defaultCenter().addObserverSelectorNameObject(observer, 'onReceive', 'SpotifyLoginSuccess', null);
    
    this.spotify = new Spotify();
    if (this.spotify.isLoggedIn()) {
      this.loggedIn = true;
    } 
  }
  
  public login() {
    this.spotify.login();
  }
  
  public loginSuccess() {
    this.loggedIn = true;
    console.log(`loginSuccess!`);
  }
  
  public playTrack() {
    this.spotify.play('spotify:track:58s6EuEYJdlb0kO7awm3Vp');
  }
}