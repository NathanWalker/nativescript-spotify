# Try it

### Prerequisites

* Spotify streaming requires a **Premium** account.
* Create a Spotify Developer account here: https://developer.spotify.com/
* Create an app in your developer account and follow these instructions to get setup: https://developer.spotify.com/technologies/spotify-ios-sdk/tutorial/#creating-your-client-id-secret-and-callback-uri

#### Step 1
```
git clone https://github.com/NathanWalker/nativescript-spotify.git
cd nativescript-spotify
npm run setup  // you will see a lot of TypeScript warnings, this is normal, you can ignore :)
```

#### Step 2

Ok now adjust a couple settings that apply to your Developer account you created above.
You need the `Redirect URIs` you added in your app's settings.
The demo uses `tnsspotify://spotifylogin` and you can add the same if you'd like or use something else.
If using the same, move on to step 3.
Otherwise you need to open `demo/app/App_Resources/iOS/Info.plist`, scroll to bottom and adjust this line:

```
<string>tnsspotify</string> // change this to the custom (base) url scheme you setup for your Spotify app
```

Then open `demo/app/app.ts` and set the Redirect Url to any of the `Redirect URIs` you added:

```
TNSSpotifyAuth.REDIRECT_URL = 'tnsspotify://spotifylogin'; // use your scheme here
```

#### Step 3

You need the Client ID of the app you created in your Spotify Developer account.
Then open `demo/app/app.ts` and set your Client ID here:

```
TNSSpotifyConstants.CLIENT_ID = 'your spotify client id here';
```

#### Step 4. Ready and Run.

You will see a lot of TypeScript warnings, this is normal, you can ignore :)
This must be run from the root directory (**not** the demo folder)

```
npm run demo.ios
```

# Contributing

## Submitting Pull Requests

**Please follow these basic steps to simplify pull request reviews - if you don't you'll probably just be asked to anyway.**

* Please rebase your branch against the current master
* Make reference to possible [issues](https://github.com/NathanWalker/nativescript-spotify/issues) on PR comment

## Submitting bug reports

* Please detail the affected platform and version
* Please be sure to state which version of node, npm, and NativeScript you're using