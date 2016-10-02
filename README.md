![alt text](resources/spotify.jpg "Spotify")

A NativeScript plugin for the Spotify iOS and Android SDKs.

* [Install](#install)
* [Prerequisites](#prerequisites)
* [Usage](#usage)
* [Screenshots](#screenshots)
* [Documentation](#documentation)
* [Why the `TNS` prefixed name?](#why-the-tns-prefixed-name)
* [Try it/Contributing](https://github.com/NathanWalker/nativescript-spotify/blob/master/docs/CONTRIBUTING.md)

## Install

```
npm install nativescript-spotify --save
```

## Prerequisites

* Spotify streaming requires a **Premium** account.
* Create a Spotify Developer account here: https://developer.spotify.com/
* Create an app in your developer account and follow these instructions to get setup: https://developer.spotify.com/technologies/spotify-ios-sdk/tutorial/#creating-your-client-id-secret-and-callback-uri

### Background

* Based on the [Spotify iOS SDK Beta 13](https://github.com/spotify/ios-sdk/releases)
* Android based on [Spotify Android SDK 1.0.0-beta13](https://github.com/spotify/android-sdk/releases)

## Usage

### Platform Prerequisites

#### iOS

### Setup

* app.ts

Configure application launch phases to setup your Spotify App CLIENT_ID and REDIRECT_URL (the ones you created above in the developer account):

```
import * as application from 'application';
import {NSSpotifyConstants, NSSpotifyAuth} from 'nativescript-spotify';

class MyDelegate extends UIResponder {
  public static ObjCProtocols = [UIApplicationDelegate];
  
  public applicationDidFinishLaunchingWithOptions(application: UIApplication, launchOptions: NSDictionary): boolean {
    
    NSSpotifyConstants.CLIENT_ID = 'your spotify premium account api key';
    TNSSpotifyAuth.REDIRECT_URL = 'your-app-custom-url-scheme://spotifylogin';
    return true;
  }
}
application.ios.delegate = MyDelegate;
application.mainModule = "main-page";
application.cssFile = "./app.css";
application.start();
```

* main-page.ts

```
import {SpotifyDemo} from "./main-view-model";

function pageLoaded(args) {
  var page = args.object;
  page.bindingContext = new SpotifyDemo();
}
exports.pageLoaded = pageLoaded;
```

* main-view-model.ts

```
import {Observable, EventData} from 'data/observable';
import {Page} from 'ui/page';
import {topmost} from 'ui/frame';
import {AnimationCurve} from 'ui/enums';
import * as loader from 'nativescript-loading-indicator';
import {TNSSpotifyConstants, TNSSpotifyAuth, TNSSpotifyPlayer, TNSSpotifyPlaylist, TNSSpotifyRequest, Utils} from 'nativescript-spotify';

export class SpotifyDemo extends Observable {
  private _spotify: TNSSpotifyPlayer;

  constructor() {
    super();
    
    this._spotify = new TNSSpotifyPlayer();
    
    // when using iOS delegates that extend NSObject, TypeScript constructors are not used, therefore a separate `initPlayer()` exists
    this._spotify.initPlayer(true); // passing `true` lets player know you want it to emit events (sometimes it's not desired)
    
    // small sample of events (see Documentation below for full list)
    this._spotify.audioEvents.on('albumArtChange', (eventData) => {
      this.updateAlbumArt(eventData.data.url);
    });
    this._spotify.audioEvents.on('authLoginSuccess', (eventData) => {
      this.loginSuccess();
    });
  }
  
  public login() {
    TNSSpotifyAuth.LOGIN();
  }
  
  public play(args?: EventData) {
    this._spotify.togglePlay('spotify:track:58s6EuEYJdlb0kO7awm3Vp').then((isPlaying: boolean) => {
      console.log(isPlaying ? 'Playing!' : 'Paused!');
    }, (error) => {
      console.log(`Playback error: ${error}`);
    });
  }
  
  private updateAlbumArt(url: string) {
    this.set(`currentAlbumUrl`, url);
  }
  
  private loginSuccess() {
    console.log(`loginSuccess!`);
  } 
}
```

## Screenshots

Sample 1 |  Sample 2
-------- | ---------
![Sample1](screenshots/1.png) | ![Sample2](screenshots/2.png)

Sample 3 | Sample 4
-------- | -------
![Sample3](screenshots/3.png) | ![Sample4](screenshots/4.png)

#### Android

### Setup

* Docs coming soon for Android...

## Documentation

### TNSSpotifyPlayer

TNSSpotifyPlayer implements [SPTAudioStreamingPlaybackDelegate](https://developer.spotify.com/ios-sdk-docs/Documents/Protocols/SPTAudioStreamingPlaybackDelegate.html).

Creating:
```
// Option 1: simple
this.spotify = new TNSSpotifyPlayer();
this.spotify.initPlayer();

// Option 2: advanced
this.spotify = new TNSSpotifyPlayer();
// passing `true` will let the player know it should emit events
this.spotify.initPlayer(true);

// it allows you to listen to events like so:
this.spotify.audioEvents.on('startedPlayingTrack', (event) => {
  console.log(event.data.url); // spotify track url
});

// play/pause a track
this.spotify.togglePlay('spotify:track:58s6EuEYJdlb0kO7awm3Vp').then((isPlaying: boolean) => {
  console.log(isPlaying ? 'Playing!' : 'Paused!');
}, (error) => {
  console.log(`Playback error: ${error}`);
});
```

#### Methods

Method |  Description
-------- | ---------
`togglePlay(track?: string)`: `Promise<any>` | Allows toggle play/pause on a track, or changing a track. `track` must be a valid spotify track uri. [Learn more here](https://developer.spotify.com/web-api/user-guide/#spotify-uris-and-ids) 
`isPlaying()`: `boolean` | Determine if player is currently playing
`isLoggedIn()`: `boolean` | Determine if player is authenticated
`setVolume(value: number)`: `Promise<any>` | Set the player volume
`loadedTrack()`: `string` | Determine current loaded track (spotify track uri)
`currentTrackMetadata()`: `ISpotifyTrackMetadata` | Get the current track's metadata. [Learn more here](https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTAudioStreamingController.html#//api/name/currentTrackMetadata)

#### Events

Event |  Description
-------- | ---------
`authLoginChange` | Sends along `data` = `status: boolean` When auth state changes.
`authLoginCheck` | When auth callback has returned and is verifying authentication
`authLoginSuccess` | When auth succeeded
`albumArtChange` | Sends along `data` = `url: string` When track triggers a play start, this will also trigger to send along the correct album art of the track.
`playerReady` | When the session has been validated and the player is ready to play.
`changedPlaybackStatus` | Sends along `data` = `playing: boolean` When playback state changes.
`seekedToOffset` | Sends along `data` = `offset: number` When player has seeked to a given offset.
`changedVolume` | Sends along `data` = `volume: number` When the player volume was changed.
`changedShuffleStatus` | Sends along `data` = `shuffle: number` When shuffle setting was changed.
`changedRepeatStatus` | Sends along `data` = `repeat: number` When repeat setting was changed.
`changedToTrack` | Sends along `data` = `metadata: any` When track change occurs.
`failedToPlayTrack` | Sends along `data` = `url: string` When track play fails. Provides the url of the track that failed.
`startedPlayingTrack` | Sends along `data` = `url: string` When track play starts. Provides the url of the track that started.
`stoppedPlayingTrack` | Sends along `data` = `url: string` When track play stops. Provides the url of the track that stopped.
`skippedToNextTrack` | When player skipped to next track.
`skippedToPreviousTrack` | When player skipped to previous track.
`activePlaybackDevice` | When the audio streaming object becomes the active playback device on the user’s account.
`inactivePlaybackDevice` | When the audio streaming object becomes an inactive playback device on the user’s account.
`poppedQueue` | When the audio streaming object becomes an inactive playback device on the user’s account.
`temporaryConnectionError` | A temporary connection error occurred.
`streamError` | Sends along `data` = `error: any` when a streaming error occurred.
`receivedMessage` | Sends along `data` = `message: string` when a message is received from the Spotify service.
`streamDisconnected` | When the stream becomes disconnected.

### TNSSpotifyAuth

TNSSpotifyAuth

Provides `static` properties and methods to help with authentication handling and user management.

#### Properties

Property |  Description
-------- | ---------
`REDIRECT_URL`: `string` | Used to set your spotify application redirect url, required for device auth redirect, ie: `'your-app-custom-url-scheme://spotifylogin'`
`SESSION`: `SPTSession` | Represents the current auth session.
`CLEAR_COOKIES`: `boolean` | Clear cookies in auth window to not remember last logged in user. Defaults `false`.
`PREMIUM_MSG`: `string` | The message which alerts when a non-premium user attempts to play a track.

#### Methods

Method |  Description
-------- | ---------
`LOGIN()`: `void` | Initiates login sequence.
`LOGIN_WITH_SESSION(session)`: `void` | Logs user in with session returned from the in-app browser auth window.
`LOGOUT()`: `void` | Clear's persisted user session and notifies of login change.
`HANDLE_AUTH_CALLBACK(url)`: `boolean` | When using standard browser redirect auth, this can be used in application launch phase to handle the auth redirect back into the app. On older versions, this may be needed.
`VERIFY_SESSION(session?: any)`: `Promise<any>` | Mainly used internally, but used to restore a session from local persistence and/or renew.
`SAVE_SESSION(session)`: `void` | Mainly used internally, but can be used to persist a valid Spotify session.
`GET_STORED_SESSION()`: `any` | Get the current user's session. [Learn more here](https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTSession.html)
`RENEW_SESSION(session)`: `Promise<any>` | Can be used to pass an expired session to renew it.
`CURRENT_USER()`: `Promise<any>` | Get the current user object. [Learn more here](https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTUser.html)

### TNSSpotifySearch

TNSSpotifyAuth

Provides 1 `static` method to search Spotify.

#### Methods

Method |  Description
-------- | ---------
`QUERY(query: string, queryType: string, offset: number = 0)`: `Promise<any>` | Search and paginate through query results of Spotify search results. Resolves an Object structure: `{page: number (offset), hasNextPage: boolean, totalListLength: number, tracks: Array}`. Right now using `queryType` = `'track'` is supported. More query types coming soon.

## Why the TNS prefixed name?

`TNS` stands for **T**elerik **N**ative**S**cript

iOS uses classes prefixed with `NS` (stemming from the [NeXTSTEP](https://en.wikipedia.org/wiki/NeXTSTEP) days of old):
https://developer.apple.com/library/mac/documentation/Cocoa/Reference/Foundation/Classes/NSString_Class/

To avoid confusion with iOS native classes, `TNS` is used instead.

## License

MIT
