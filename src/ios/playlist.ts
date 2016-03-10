import {TNSSpotifyAuth} from './auth';

export class TNSSpotifyPlaylist {
  
  public static MINE(): Promise<any> {
    return new Promise((resolve, reject) => {
      SPTPlaylistList.playlistsForUserWithSessionCallback(TNSSpotifyAuth.SESSION, (error, playlist) => {
        if (error != null) {
          console.log(`*** playlistsForUserWithSessionCallback got error:`);
          console.log(error);
          reject();
          return;
        }
        resolve(playlist.items);
      });
    });
  }
  
  public static FOR_USER(user: string): Promise<any> {
    return new Promise((resolve, reject) => {
      SPTPlaylistList.playlistsForUserWithSessionCallback(user, TNSSpotifyAuth.SESSION, (error, playlist) => {
        if (error != null) {
          console.log(`*** playlistsForUserWithSessionCallback got error:`);
          console.log(error);
          reject();
          return;
        }
        resolve(playlist.items);
      });
    });
  }
}