import {NSSpotifyAuth} from './auth';

export class NSSpotifyRequest {
  
  public static ITEM(item: string): Promise<any> {
    return new Promise((resolve, reject) => {  
      SPTRequest.requestItemAtURIWithSessionCallback(NSURL.URLWithString(item), NSSpotifyAuth.SESSION, (error, itemObj) => {
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
    let cnt = trackNSArray.count;
    let tracks = [];
    for (let i = 0; i < cnt; i++) {
      let track = trackNSArray.objectAtIndex(i);
      tracks.push(track);
    }
    return tracks;
  }
}