import {NSSpotifyAuth} from './auth';

export class NSSpotifyPlaylist {
  
  public static MINE(): Promise<any> {
    return new Promise((resolve, reject) => {
      // for (let key in SPTPlaylistList) {
      //   console.log(key);
      // }
      SPTPlaylistList.playlistsForUserWithSessionCallback(NSSpotifyAuth.SESSION, (error, playlist) => {
      // SPTPlaylistList.playlistsForUserWithSessionCallback(user, NSSpotifyAuth.SESSION, (error, playlist) => {
        if (error != null) {
          console.log(`*** playlistsForUserWithSessionCallback got error:`);
          console.log(error);
          reject();
          return;
        }
        
        console.log(playlist.items);
        let cnt = playlist.items.count;
        for (let i = 0; i < cnt; i++) {
          console.log(playlist.items.objectAtIndex(i));
        }
        resolve(playlist.items);
      });
    });
  }
  
  public static FOR_USER(user: string): Promise<any> {
    return new Promise((resolve, reject) => {
      SPTPlaylistList.playlistsForUserWithSessionCallback(user, NSSpotifyAuth.SESSION, (error, playlist) => {
        if (error != null) {
          console.log(`*** playlistsForUserWithSessionCallback got error:`);
          console.log(error);
          reject();
          return;
        }
        
        console.log(playlist.items);
        let cnt = playlist.items.count;
        for (let i = 0; i < cnt; i++) {
          console.log(playlist.items.objectAtIndex(i));
        }
        resolve(playlist.items);
      });
    });
  }
}