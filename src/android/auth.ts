import {Observable, EventData} from 'data/observable';
import {TNSSpotifyConstants, ISpotifyUser} from '../common';
import {AndroidActivityResultEventData} from "application";
import * as dialogs from 'ui/dialogs';
import * as app from "application";
import * as appSettings from "application-settings";
import * as http from 'http';

declare var com: any;

let AuthenticationRequest = com.spotify.sdk.android.authentication.AuthenticationRequest;
let AuthenticationResponse = com.spotify.sdk.android.authentication.AuthenticationResponse;
let AuthenticationClient = com.spotify.sdk.android.authentication.AuthenticationClient;

export class TNSSpotifyAuth {
    public static instance: TNSSpotifyAuth; // used for Android events
    public static REDIRECT_URL: string;
    public static TOKEN_REFRESH_ENDPOINT: string;
    public static SESSION: any;
    public static CLEAR_COOKIES: boolean = false;
    public static AUTH_VIEW_SHOWING: boolean;
    public static PREMIUM_MSG: string = 'We are so sorry! Music streaming on mobile requires a Spotify Premium account. You can check out more at http://spotify.com. Last time we checked it was $9.99/month with the first 30 days free.';

    // Android
    // Request code that will be used to verify if the result comes from correct activity
    // Can be any integer
    public static REQUEST_CODE = 1337;

    // events
    public events: Observable;
    private _authLoginCheck: EventData;
    private _authLoginSuccess: EventData;
    private _authLoginError: EventData;
    private _authLoginChange: EventData;

    // Optionally setup auth events (usually recommended)
    public setupEvents() {
      TNSSpotifyAuth.instance = this;
      this.setupNotifications();
    }

    public static LOGIN(showDialog: boolean = true) {
        let builder = new AuthenticationRequest.Builder(TNSSpotifyConstants.CLIENT_ID, AuthenticationResponse.Type.TOKEN, TNSSpotifyAuth.REDIRECT_URL);
        builder.setShowDialog(showDialog);
        builder.setScopes([
            'streaming',
            'user-read-private',
            'user-read-email',
            'user-library-modify',
            'user-library-read',
            'playlist-read-private',
            'playlist-modify-private',
            'playlist-modify-public',
            'playlist-read-collaborative']);

        // if (TNSSpotifyAuth.CLEAR_COOKIES) {
        //     AuthenticationClient.clearCookies(app.android.currentContext);
        // }
        // TODO: investigate - may just need different context
        // The above throws this
        // Error: java.lang.IllegalArgumentException: Invalid context argument
        //JS:     android.webkit.CookieSyncManager.createInstance(CookieSyncManager.java:95)
        //JS:     com.spotify.sdk.android.authentication.WebViewUtils.clearCookiesForDomain(WebViewUtils.java:45)

        let request = builder.build();
        let activity = app.android.startActivity || app.android.foregroundActivity;

        AuthenticationClient.openLoginActivity(activity, TNSSpotifyAuth.REQUEST_CODE, request);

        app.android.on(app.AndroidApplication.activityResultEvent, ((args: AndroidActivityResultEventData) => {

            if (args.requestCode === TNSSpotifyAuth.REQUEST_CODE) {
                let response = AuthenticationClient.getResponse(args.resultCode, args.intent);
                let responseType = response.getType();
                // console.log('expires: ' + response.getExpiresIn());
                let error: any = {
                  msg: '',
                  code: undefined
                };

                if (responseType == AuthenticationResponse.Type.TOKEN) {
                    // SUCCESS
                    let token = response.getAccessToken();
                    TNSSpotifyAuth.SAVE_SESSION(token);
                    return;
                }
                else if (responseType === AuthenticationResponse.Type.ERROR) {
                    error.msg = response.getError();
                    console.log('err: ' + error.msg);
                }
                else if (responseType === AuthenticationResponse.Type.CODE) {
                    error.code = response.getCode();
                    console.log('code: ' + error.code);
                }
                else if (responseType === AuthenticationResponse.Type.EMPTY) {
                    error.msg = 'EMPTY';
                    console.log(error.msg);
                }
                else {
                    error.msg = 'UNKNOWN';
                    console.log(error.msg);
                }
              
                if (TNSSpotifyAuth.instance && TNSSpotifyAuth.instance.events) {
                    TNSSpotifyAuth.instance._authLoginError.data = error;
                    TNSSpotifyAuth.instance.events.notify(TNSSpotifyAuth.instance._authLoginError);
                }
            }
        }));

    }

    public static LOGOUT() {
      console.log(`TNSSpotifyAuth.LOGOUT()`);
        TNSSpotifyAuth.SESSION = undefined;
        // AuthenticationClient.clearCookies(app.android.currentContext);
        if (TNSSpotifyAuth.instance && TNSSpotifyAuth.instance.events) {
            TNSSpotifyAuth.instance._authLoginChange.data.status = false;
            TNSSpotifyAuth.instance.events.notify(TNSSpotifyAuth.instance._authLoginChange);
        }
    }

    public static HANDLE_AUTH_CALLBACK(url) {
        // Ask SPTAuth if the URL given is a Spotify authentication callback
        if (TNSSpotifyAuth.instance && TNSSpotifyAuth.instance.events) {
          TNSSpotifyAuth.instance.events.notify(TNSSpotifyAuth.instance._authLoginCheck);
        }
    }

    public static LOGIN_WITH_SESSION(session) {

    }

    public static VERIFY_SESSION(session?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log(`verifying Spotify session...`);
            // when verifying existing via argument, may need to log user out with notice
            let checkExisting = true;
            if (!session) {
                // just initializing
                checkExisting = false;
                let sessionObj = TNSSpotifyAuth.GET_STORED_SESSION();
                if (sessionObj) {
                    // check if refresh needed
                    // let sessionData = sessionObj; // NSData
                    session = sessionObj;
                }
            }

            let showErrorAndLogout = () => {
                console.log(`showErrorAndLogout`)
                if (checkExisting) {
                    console.log(`error renewing, calling TNSSpotifyAuth.LOGOUT()`);
                    TNSSpotifyAuth.LOGOUT();
                    // setTimeout(() => {
                    //     dialogs.alert('Please re-login.');
                    // });
                }
                reject();
            };

            if (session) {
                // if (!session.isValid()) {
                //     console.log('NOT VALID.');
                //     // renew session
                //     TNSSpotifyAuth.RENEW_SESSION(session).then(resolve, () => {
                //         showErrorAndLogout();
                //     });
                // } else {
                    console.log('VALID.');
                    TNSSpotifyAuth.SESSION = session;
                    resolve();
                // }
            } else {
                showErrorAndLogout();
            }
        });
    }

    public static SAVE_SESSION(session): void {
        console.log('SAVE_SESSION: ' + session);
        TNSSpotifyAuth.SESSION = session;
        appSettings.setString(TNSSpotifyConstants.KEY_STORE_SESSION, session);
        if (TNSSpotifyAuth.instance && TNSSpotifyAuth.instance.events) {
          TNSSpotifyAuth.instance.events.notify(TNSSpotifyAuth.instance._authLoginSuccess);
        }
        
    }

    public static GET_STORED_SESSION(): any {
        console.log('GET_STORED_SESSION: ' + TNSSpotifyAuth.SESSION);
        return appSettings.getString(TNSSpotifyConstants.KEY_STORE_SESSION);
    }

    public static RENEW_SESSION(session: any): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log(`trying to renew Spotify session...`);
            // TNSSpotifyAuth.LOGIN(false);
            resolve();
        });
    }

    public static CURRENT_USER(): Promise<ISpotifyUser> {
      return new Promise((resolve, reject) => { 
        http.request({
          url: `https://api.spotify.com/v1/me`,
          method: 'GET',
          headers: { "Content-Type": "application/json", "Authorization:": `Bearer ${TNSSpotifyAuth.SESSION}` }
        }).then((res: any) => {
        //   console.log(`got current user:`, res);
        //   for (let key in res) {
        //     console.log(`key: ${key}`, res[key]);
        //   }
          if (res && res.content) {
            let user = JSON.parse(res.content);
            // for (let key in user) {
            //   console.log(`key: ${key}`, user[key]);
            // }

            // 0: 'free'
            // 1: 'unlimited'
            // 2: 'premium'
            // 3: 'unknown'
            let product: number = 0;
            switch (user.product) {
              case 'unlimited':
                product = 1;
                break;
              case 'premium':
                product = 2;
                break;
              case 'unknown':
                product = 3;
                break;
            }
            let sUser: ISpotifyUser = {
              emailAddress: user.email,
              displayName: user.display_name,
              product: product,
              uri: user.uri
            };
            resolve(sUser);
          } else {
            reject();
          }       
        }, (err: any) => {
          console.log(`current user error:`, err);
          for (let key in err) {
            console.log(`key: ${key}`, err[key]);
          }
          reject(err);
        });
      });
    }

    public static CHECK_PREMIUM(): Promise<any> {
      return new Promise((resolve, reject) => { 
        TNSSpotifyAuth.CURRENT_USER().then((user: any) => {
          console.log(`user.product:`, user.product);
          if (user) {
            if (user.product == 1 || user.product == 2) {
              resolve();
            } else {
              setTimeout(() => {
                dialogs.alert(TNSSpotifyAuth.PREMIUM_MSG);
              }, 400);
              TNSSpotifyAuth.CLEAR_COOKIES = true;
              TNSSpotifyAuth.LOGOUT();
              reject();   
            }
          } else {
            reject();
          }
        }, reject);
      });
    }

    private setupNotifications() {
        this.events = new Observable();
        this._authLoginCheck = {
            eventName: 'authLoginCheck',
            object: this.events
        };
        this._authLoginSuccess = {
            eventName: 'authLoginSuccess',
            object: this.events
        };
        this._authLoginError = {
            eventName: 'authLoginError',
            object: this.events,
            data: {}
        };
        this._authLoginChange = {
            eventName: 'authLoginChange',
            object: this.events,
            data: {
                status: false
            }
        };
    }


}