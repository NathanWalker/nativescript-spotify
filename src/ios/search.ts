import {TNSSpotifyAuth} from './auth';
import {TNSTrack} from '../common';

declare var SPTSearch, NSURL;

export class TNSSpotifySearch {
  //https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTRequest.html
  public static CURRENT_LIST: any;
  public static CURRENT_SEARCH_QUERY: string;

  public static QUERY(query: string, queryType: string, offset: number = 0): Promise<any> {
    // query: search term
    // queryType: album, artist, playlist, and track
    query = query && query.length ? query.replace(/ /ig, '+') : '';

    return new Promise((resolve, reject) => {  
      if (query.length === 0) {
        return;
      }

      let reset = false;
      if (TNSSpotifySearch.CURRENT_SEARCH_QUERY !== query) {
        TNSSpotifySearch.CURRENT_SEARCH_QUERY = query;
        // always reset with new queries
        reset = true;
        TNSSpotifySearch.CURRENT_LIST = undefined;
      }

      let processResults = (error: any, results: any) => {
        if (error != null) {
          console.log(`*** Spotify search error:`);
          console.log(error);
          for (let key in error) {
            console.log('-----');
            console.log(key);
            console.log(error[key]);
          }
          reject();
          return;
        }
        
        TNSSpotifySearch.CURRENT_LIST = results;
        console.log(results);
        // for (let key in results) {
        //   console.log(`key: ${key}`);
        //   console.log(results[key]);
        // }
        if (results && results.items) {
          let result: any = {
            page: offset,
            hasNextPage: results.hasNextPage,
            totalListLength: results.totalListLength
          };
          switch (queryType) {
            case 'track':
              result.tracks = TNSSpotifySearch.TRACKS_FROM_RESULTS(results)
              break;
            // TODO: support other query types
          }
          resolve(result);
        } else {
          // no results
          reject();
        }
      };

      console.log(`TNSSpotifySearch.QUERY searching for: ${query}, offset: ${offset}`);
      TNSSpotifyAuth.VERIFY_SESSION(TNSSpotifyAuth.SESSION).then(() => {
        if (!reset && offset > 0 && TNSSpotifySearch.CURRENT_LIST) {

          if (TNSSpotifySearch.CURRENT_LIST.hasNextPage) {
            // get next page
            TNSSpotifySearch.CURRENT_LIST.requestNextPageWithAccessTokenCallback(TNSSpotifyAuth.SESSION.accessToken, processResults);
          } else {
            resolve({}); // resolve empty object - not an error, just no more results
          }          
          
        } else {

          SPTSearch.performSearchWithQueryQueryTypeOffsetAccessTokenCallback(query, queryType, offset, TNSSpotifyAuth.SESSION.accessToken, processResults);
        }

      }, () => {
        reject();
      });
    });
  }
  
  public static TRACKS_FROM_RESULTS(results: any): Array<TNSTrack> {
    // console.log(`TRACKS_FROM_RESULTS`);
    // console.log(results);
    let items = [];
    let cnt = 0;

    if (results && results.items) {
      let itemNSArray = results.items;
      // console.log(itemNSArray);
      cnt = itemNSArray.count;
      // console.log(`track cnt: ${cnt}`);
      
      if (cnt > 0) {
        for (let i = 0; i < cnt; i++) {
          let trackObj = itemNSArray.objectAtIndex(i);
          // console.log(trackObj.name);
          let spotifyArtist = null;
          if (trackObj && trackObj.artists && trackObj.artists.count > 0) {
            spotifyArtist = trackObj.artists.objectAtIndex(0);
            let artist = {};
            // if uri is null, skip as it cannot be played
            // console.log(spotifyArtist.uri);
            if (spotifyArtist && spotifyArtist.uri && spotifyArtist.uri != 'null') {
              artist = {
                id: spotifyArtist.identifier,
                name: spotifyArtist.name
              };
              let spotifyAlbum = trackObj.album;
              let album = {};
              if (spotifyAlbum) {
                album = {
                  id: spotifyAlbum.identifier,
                  name: spotifyAlbum.name
                };
              }
              
              let track: TNSTrack = {
                id: trackObj.identifier,
                name: trackObj.name,
                artist: artist,
                duration: trackObj.duration,
                album: album,
                playing: false
              };
              items.push(track);
              // console.log(`adding: ${i}`);
            }
          }
        }
      }
    }
    return items;
  }
}