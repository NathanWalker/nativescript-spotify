import {TNSSpotifyAuth} from './auth';
import {ISpotifyTrack} from '../common';
import * as http from 'http';

export class TNSSpotifySearch {
  public static CURRENT_LIST: any;
  public static CURRENT_SEARCH_QUERY: string;
  public static apiInstance: any;

  public static QUERY(query: string, queryType: string, offset: number = 0): Promise<any> {

    let webSearchApi = `https://api.spotify.com/v1/search?`;
    
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

      let processResults = (results: any) => {
        
        TNSSpotifySearch.CURRENT_LIST = results;
        // console.log(`processing results...`);
        // console.log(results);
        // for (let key in results) {
        //   console.log(key);
        //   console.log(results[key]);
        // }

        if (results && results.items) {
          let result: any = {
            page: offset,
            hasNextPage: results.next,
            totalListLength: results.total
          };
          switch (queryType) {
            case 'track':
              result.tracks = TNSSpotifySearch.TRACKS_FROM_RESULTS(results)
              break;
          }
          resolve(result);
        } else {
          // no results
          reject();
        }
      };

      let errorHandler = (err: any) => {
        
        console.log('Error:', err);
        for (let key in err) {
          console.log(`key: ${key}`, err[key]);
        }
        reject(err);
      };

      let successHandler = (res: any) => {
        // console.log(res);
        let key = queryType + 's';
        // for (let key in res) {
        //   console.log(`key: ${key}`, res[key]);
        // }
        if (res && res[key]) {
          processResults(res[key]);
        } else {
          errorHandler(res);
        }
      };

      console.log(`TNSSpotifySearch.QUERY offset: ${offset}`);
      if (!reset && offset > 0 && TNSSpotifySearch.CURRENT_LIST) {

        if (TNSSpotifySearch.CURRENT_LIST.next) {
          // get next page
          http.getJSON(TNSSpotifySearch.CURRENT_LIST.next).then(successHandler, errorHandler);
        } else {
          resolve({}); // resolve empty object - not an error, just no more results
        }       
        
      } else {
        
        http.getJSON(`${webSearchApi}type=${queryType}&q=${query}&limit=20&offset=${offset}`).then(successHandler, errorHandler);
            
      }
    });
  }
  
  public static TRACKS_FROM_RESULTS(results: any): Array<ISpotifyTrack> {
    
    let items = [];
    console.log(`processing ${results.items.length} tracks...`);
    for (let i = 0; i < results.items.length; i++) {
      let trackObj = results.items[i];
      console.log(trackObj.name);
      let spotifyArtist = trackObj.artists[0];
      let artist = {};
      // if uri is null, skip as it cannot be played
      // console.log(spotifyArtist.uri);
      if (spotifyArtist && spotifyArtist.uri && spotifyArtist.uri != 'null') {
        artist = {
          id: spotifyArtist.id,
          name: spotifyArtist.name
        };
        let spotifyAlbum = trackObj.album;
        let album = {};
        if (spotifyAlbum) {
          album = {
            id: spotifyAlbum.id,
            name: spotifyAlbum.name
          };
        }
        
        let track: ISpotifyTrack = {
          id: trackObj.id,
          name: trackObj.name,
          artist: artist,
          duration: trackObj.duration_ms,
          album: album,
          playing: false
        };
        items.push(track);
        // console.log(`adding: ${i}`);
      }
    }
    return items;
  }
}