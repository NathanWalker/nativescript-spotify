import {TNSSpotifyAuth} from './auth';

declare var SPTPlaylistList;

export class TNSSpotifyPlaylist {
  // TODO: More testing (not documentated ATM)

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