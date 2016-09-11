import {TNSSpotifyAuth} from './auth';

declare var SPTRequest, NSURL;

export class TNSSpotifyRequest {
  //https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTRequest.html

  public static ITEM(item: string): Promise<any> {
    return new Promise((resolve, reject) => {  
      SPTRequest.requestItemAtURIWithSessionCallback(NSURL.URLWithString(item), TNSSpotifyAuth.SESSION, (error, itemObj) => {
        if (error != null) {
          console.log(`*** Item lookup error: ${error}`);
          reject();
          return;
        }
        resolve(itemObj);
      });
    });
  }
  
  public static TRACKS_FROM_PLAYLIST(playlist: any): Array<any> {
    let trackNSArray = playlist.firstTrackPage.tracksForPlayback();
    let cnt = 0;
    let tracks = [];
    try {
      if (trackNSArray) {
        cnt = trackNSArray.count;
        for (let i = 0; i < cnt; i++) {
          let track = trackNSArray.objectAtIndex(i);
          tracks.push(track);
        }
      }
    } catch (err) {
      console.log(`TNSSpotifyRequest.TRACKS_FROM_PLAYLIST error:`);
      console.log(err);
    }
    return tracks;
  }
}