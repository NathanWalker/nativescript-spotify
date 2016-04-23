import {EventData, Observable} from 'data/observable';
import {TNSSpotifyNotificationObserver} from './notification';
const sdk = (<any>com).spotify.sdk.android.authentication;
import app = require("application");
const TOKEN = sdk.AuthenticationResponse.Type.TOKEN,
    CODE = sdk.AuthenticationResponse.Type.CODE,
    EMPTY = sdk.AuthenticationResponse.Type.EMPTY,
    ERROR = sdk.AuthenticationResponse.Type.ERROR,
    UNKNOWN = sdk.AuthenticationResponse.Type.UNKNOWN;

export class TNSSpotifyAuth {
    public static REDIRECT_URL: string;
    public static TOKEN_REFRESH_ENDPOINT: string;
    public static SESSION;
    private static REQUEST_CODE;
    // events
    public events: Observable;
    private _observers: Array<TNSSpotifyNotificationObserver>;
    private _authLoginCheck: EventData;
    private _authLoginSuccess: EventData;
    private _authLoginError: EventData;
    private _authLoginChange: EventData;

    LOGIN() {
        sdk.LoginActivity.extend({
            onActivityResult: function (requestCode: number, resultCode: number, intent) {
                this.super.onActivityResult(requestCode, resultCode, intent);
                // Check if result comes from the correct activity
                if (requestCode == TNSSpotifyAuth.REQUEST_CODE) {
                    let response = sdk.AuthenticationClient.getResponse(resultCode, intent);

                    switch (response.getType()) {
                        // Response was successful and contains auth token
                        case TOKEN:
                            // Handle successful response
                            break;

                        // Auth flow returned an error
                        case ERROR:
                            // Handle error response
                            break;

                        // Most likely auth flow was cancelled
                        default:
                        // Handle other cases
                    }
                }
            }
        })


    }
}