import {TNSSpotifyAuth} from './auth';
import {TNSSpotifySearch} from './search';
import {TNSPlaylist} from '../common';

declare var SPTPlaylistList, SPTPlaylistSnapshot;

export class TNSSpotifyPlaylist {
  public static CURRENT_LIST: any;

  public static MINE(offset: number = 0): Promise<any> {
    return new Promise((resolve, reject) => {

      let processResults = (error: any, results: any) => {
        if (error != null) {
          console.log(`*** Spotify playlists error:`);
          console.log(error);
          // for (let key in error) {
          //   console.log('-----');
          //   console.log(key);
          //   console.log(error[key]);
          // }
          reject(error);
          return;
        }
        
        TNSSpotifyPlaylist.CURRENT_LIST = results;
        
        // console.log(results);
        // for (let key in results) {
        //   console.log('------')
        //   console.log(key);
        //   console.log(results[key]);
        // }

        TNSSpotifyPlaylist.PLAYLISTS_FROM_RESULTS(results).then((playlists: Array<any>) => {
          if (playlists && playlists.length) {
            let result: any = {
              page: offset,
              hasNextPage: results.hasNextPage,
              totalListLength: results.totalListLength,
              playlists: playlists
            };
            resolve(result);
          } else {
            // no results
            reject();
          }
        }, reject);        
      };

      if (offset > 0 && TNSSpotifyPlaylist.CURRENT_LIST) {

        if (TNSSpotifyPlaylist.CURRENT_LIST.hasNextPage) {
          // get next page
          TNSSpotifyPlaylist.CURRENT_LIST.requestNextPageWithAccessTokenCallback(TNSSpotifyAuth.SESSION.accessToken, processResults);
        }          
        
      } else {

        SPTPlaylistList.playlistsForUserWithSessionCallback(TNSSpotifyAuth.SESSION, processResults);
      }
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
        // console.log(playlist);
        // for (let key in playlist) {
        //   console.log('------')
        //   console.log(key);
        //   console.log(playlist[key]);
        // }
        resolve(playlist.items);
      });
    });
  }

  public static PLAYLISTS_FROM_RESULTS(results: any): Promise<any> {
    return new Promise((resolve, reject) => {
      let itemNSArray = results.items;
      let cnt = itemNSArray.count;
      let items = [];
      for (let i = 0; i < cnt; i++) {
        let playlistObj = itemNSArray.objectAtIndex(i);
        // for (let key in playlistObj) {
        //   console.log(key);
        //   console.log(playlistObj[key]);
        // }
        let playlist: TNSPlaylist = {
          uri: playlistObj.uri.absoluteString,
          name: playlistObj.name,
          tracks: [],
          playing: false
        };
        console.log(`playlist name: ${playlist.name}`);
        items.push(playlist);
      }

      // fetch all tracks from all playlists      
      cnt = 0;
      let advance = () => {
        cnt++;
        if (cnt < items.length) {
          getTracks();
        } else {
          resolve(items);
        }
      };
      let getTracks = () => {
        let playlistItem = items[cnt];
        console.log(`Getting playlist snapshot with uri: ${playlistItem.uri}`);
        SPTPlaylistSnapshot.playlistWithURIAccessTokenCallback(NSURL.URLWithString(playlistItem.uri), TNSSpotifyAuth.SESSION.accessToken, (error: any, playlistSnapshot: any) => {
          if (error != null) {
            console.log(`*** SPTPlaylistSnapshot.playlistWithURIAccessTokenCallback got error:`);
            console.log(error);
            advance(); // just advance to next
            return;
          }
          
          let trackList = playlistSnapshot.firstTrackPage;
          TNSSpotifyPlaylist.GET_TRACKS(trackList, playlistItem).then(advance, advance);
          
        });
      };
      
      if (items.length) {
        getTracks();
      } else {
        resolve([]);
      }

    });
  }

  public static GET_TRACKS(trackList: any, playlist: TNSPlaylist): Promise<any> {
    return new Promise((resolve, reject) => {
      let currentPage = trackList;

      console.log(`GET_TRACKS ----`);
      playlist.tracks = TNSSpotifySearch.TRACKS_FROM_RESULTS(currentPage);
      console.log(`playlist: ${playlist.name}`);
      console.log(`playlist.tracks.length: ${playlist.tracks.length}`);

      let fetchNextPage = () => {
        if (currentPage.hasNextPage) {
          currentPage.requestNextPageWithAccessTokenCallback(TNSSpotifyAuth.SESSION.accessToken, (error: any, nextTrackList: any) => {
            if (error != null) {
              console.log(`*** playlist requestNextPageWithAccessTokenCallback got error:`);
              console.log(error);
              reject();
              return;
            }

            console.log(`got next track page ----`);            
            currentPage = nextTrackList;

            let tracks = TNSSpotifySearch.TRACKS_FROM_RESULTS(currentPage);
            for (let t of tracks) {
              console.log(t);
            }
            playlist.tracks = [...playlist.tracks, ...tracks];
            fetchNextPage();        
          });
        } else {
          resolve();
        }
      }   
      
      fetchNextPage();
      
    });
  }
}