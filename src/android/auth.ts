import {Observable, EventData} from 'data/observable';
import {TNSSpotifyConstants} from '../common';
import {TNSSpotifyNotificationObserver} from './notification';
import * as dialogs from 'ui/dialogs';
import * as app from "application";


declare var com: any;


let AuthenticationRequest = com.spotify.sdk.android.authentication.AuthenticationRequest;
let AuthenticationResponse = com.spotify.sdk.android.authentication.AuthenticationResponse;
let AuthenticationClient = com.spotify.sdk.android.authentication.AuthenticationClient;


export class TNSSpotifyAuth {
    public static REDIRECT_URL: string;
    public static TOKEN_REFRESH_ENDPOINT: string;
    public static SESSION: any; // SPTSession
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

    public static LOGIN() {
        let builder = new AuthenticationRequest.Builder(TNSSpotifyConstants.CLIENT_ID, AuthenticationResponse.Type.TOKEN, TNSSpotifyAuth.REDIRECT_URL);
        console.log('auth.LOGIN().builder: ' + builder);

        builder.setScopes(["user-read-private", "streaming"]);

        let request = builder.build();
        console.log('auth.LOGIN.request : ' + request);

        let activity = app.android.startActivity || app.android.foregroundActivity;
        console.log('auth.LOGIN.activity: ' + activity);

        AuthenticationClient.openLoginActivity(activity, this.REQUEST_CODE, request);

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


        });
    }

    public static SAVE_SESSION(session): void {


    }

    public static GET_STORED_SESSION(): any {
        // https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTSession.html

    }

    public static RENEW_SESSION(session: any): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log(`trying to renew Spotify session...`);


        });
    }

    public static CURRENT_USER(): Promise<any> {
        // https://developer.spotify.com/ios-sdk-docs/Documents/Classes/SPTUser.html
        return new Promise((resolve, reject) => {


        });
    }

    public static CHECK_PREMIUM(): Promise<any> {
        return new Promise((resolve, reject) => {


        });
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