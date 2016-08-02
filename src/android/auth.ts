import {Observable, EventData} from 'data/observable';
import {TNSSpotifyConstants} from '../common';
import {TNSSpotifyNotificationObserver} from './notification';
import { AndroidActivityResultEventData } from "application";
import * as dialogs from 'ui/dialogs';
import * as app from "application";
import * as appSettings from "application-settings";

declare var com: any;

let AuthenticationRequest = com.spotify.sdk.android.authentication.AuthenticationRequest;
let AuthenticationResponse = com.spotify.sdk.android.authentication.AuthenticationResponse;
let AuthenticationClient = com.spotify.sdk.android.authentication.AuthenticationClient;

export class TNSSpotifyAuth {
    public static REDIRECT_URL: string;
    public static TOKEN_REFRESH_ENDPOINT: string;
    public static SESSION: any;
    public static CLEAR_COOKIES: boolean = false;
    public static AUTH_VIEW_SHOWING: boolean;
    public static PREMIUM_MSG: string = 'We are so sorry! Music streaming on mobile requires a Spotify Premium account. You can check out more at http://spotify.com. Last time we checked it was $9.99/month with the first 30 days free.';

    // Request code that will be used to verify if the result comes from correct activity
    // Can be any integer
    private static REQUEST_CODE = 1337;

    // events
    public events: Observable;
    private _observers: Array<TNSSpotifyNotificationObserver>;
    private _authLoginCheck: EventData;
    private _authLoginSuccess: EventData;
    private _authLoginError: EventData;
    private _authLoginChange: EventData;

    // Optionally setup auth events (usually recommended)
    public setupEvents() {
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

        if (TNSSpotifyAuth.CLEAR_COOKIES) {
            AuthenticationClient.clearCookies(app.android.currentContext);
        }

        let request = builder.build();
        let activity = app.android.startActivity || app.android.foregroundActivity;

        AuthenticationClient.openLoginActivity(activity, this.REQUEST_CODE, request);

        app.android.on(app.AndroidApplication.activityResultEvent, ((args: AndroidActivityResultEventData) => {

            if (args.requestCode === this.REQUEST_CODE) {
                let response = AuthenticationClient.getResponse(args.resultCode, args.intent);
                let responseType = response.getType();
                // console.log('expires: ' + response.getExpiresIn());

                if (responseType == AuthenticationResponse.Type.TOKEN) {
                    let token = response.getAccessToken();
                    TNSSpotifyAuth.SAVE_SESSION(token);
                }
                else if (responseType === AuthenticationResponse.Type.ERROR) {
                    let err = response.getError();
                    console.log('err: ' + err);
                }
                else if (responseType === AuthenticationResponse.Type.CODE) {
                    let code = response.getCode();
                    console.log('code: ' + code);
                }
                else if (responseType === AuthenticationResponse.Type.EMPTY) {
                    console.log('EMPTY');
                }
                else {
                    console.log('response is unknown :( ');
                }
            }
        }));

    }

    public static LOGOUT() {
        TNSSpotifyAuth.SESSION = undefined;
        AuthenticationClient.clearCookies(app.android.currentContext);
    }

    public static HANDLE_AUTH_CALLBACK(url) {
        // Ask SPTAuth if the URL given is a Spotify authentication callback
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
                    setTimeout(() => {
                        dialogs.alert('Please re-login.');
                    });
                }
                reject();
            };

            if (session) {
                if (!session.isValid()) {
                    console.log('NOT VALID.');
                    // renew session
                    TNSSpotifyAuth.RENEW_SESSION(session).then(resolve, () => {
                        showErrorAndLogout();
                    });
                } else {
                    console.log('VALID.');
                    TNSSpotifyAuth.SESSION = session;
                    resolve();
                }
            } else {
                showErrorAndLogout();
            }
        });
    }

    public static SAVE_SESSION(session): void {
        console.log('SAVE_SESSION: ' + session);
        TNSSpotifyAuth.SESSION = session;
        appSettings.setString(TNSSpotifyConstants.KEY_STORE_SESSION, session);
    }

    public static GET_STORED_SESSION(): any {
        // https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTSession.html
        console.log('GET_STORED_SESSION: ' + TNSSpotifyAuth.SESSION);
        return appSettings.getString(TNSSpotifyConstants.KEY_STORE_SESSION);
    }

    public static RENEW_SESSION(session: any): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log(`trying to renew Spotify session...`);
            TNSSpotifyAuth.LOGIN(false);
            resolve();
        });
    }

    public static CURRENT_USER(): Promise<any> {
        console.log('DONT SEE ANDROID EQUIVALENT OF THIS');
        // return new Promise((resolve, reject) => { });
    }

    public static CHECK_PREMIUM(): Promise<any> {
        console.log('DONT SEE ANDROID EQUIVALENT OF THIS');
        // return new Promise((resolve, reject) => { });
    }

    private setupNotifications() {
        this._observers = new Array<TNSSpotifyNotificationObserver>();
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
        this.addNotificationObserver(TNSSpotifyConstants.NOTIFY_LOGIN_CHECK, (notification: NSNotification) => {
            this.events.notify(this._authLoginCheck);
        });
        this.addNotificationObserver(TNSSpotifyConstants.NOTIFY_LOGIN_SUCCESS, (notification: NSNotification) => {
            this.events.notify(this._authLoginSuccess);
        });
        this.addNotificationObserver(TNSSpotifyConstants.NOTIFY_LOGIN_ERROR, (notification: NSNotification) => {
            this._authLoginError.data = notification.object;
            this.events.notify(this._authLoginError);
        });
        this.addNotificationObserver(TNSSpotifyConstants.NOTIFY_AUTH_LOGIN_CHANGE, (notification: NSNotification) => {
            this._authLoginChange.data.status = notification.object;
            this.events.notify(this._authLoginChange);
        });
    }

    private addNotificationObserver(notificationName: string, onReceiveCallback: (notification: NSNotification) => void): TNSSpotifyNotificationObserver {


    }


}